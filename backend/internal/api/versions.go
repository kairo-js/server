package api

import (
	"archive/zip"
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/kairo-js/server/backend/internal/addon"
	objectstorage "github.com/kairo-js/server/backend/internal/storage"
)

const maxAddonArchiveSize int64 = 256 << 20

var semverPattern = regexp.MustCompile(`^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?(\+[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$`)
var engineVersionPattern = regexp.MustCompile(`^1\.[0-9]+\.[0-9]+$`)

type registryManifest struct {
	SchemaVersion         int               `json:"schemaVersion"`
	AddonID               string            `json:"addonId"`
	Version               string            `json:"version"`
	MinimumEngineVersion  string            `json:"minimumEngineVersion"`
	MinecraftDependencies map[string]string `json:"minecraftDependencies,omitempty"`
	Dependencies          map[string]string `json:"dependencies,omitempty"`
	OptionalDependencies  map[string]string `json:"optionalDependencies,omitempty"`
	PeerDependencies      map[string]string `json:"peerDependencies,omitempty"`
}

func parseRegistryManifest(raw, addonID, version string) (json.RawMessage, error) {
	if len(raw) == 0 || len(raw) > 64<<10 {
		return nil, errors.New("Manifest is required and must be at most 64 KiB")
	}
	var manifest registryManifest
	decoder := json.NewDecoder(strings.NewReader(raw))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&manifest); err != nil {
		return nil, errors.New("Manifest must be valid JSON with known fields")
	}
	if err := decoder.Decode(&struct{}{}); err != io.EOF {
		return nil, errors.New("Manifest must contain exactly one JSON object")
	}
	if manifest.SchemaVersion != 1 || strings.ToLower(manifest.AddonID) != addonID || manifest.Version != version || !engineVersionPattern.MatchString(manifest.MinimumEngineVersion) {
		return nil, errors.New("Manifest schema, add-on ID, version, or minimum engine version is invalid")
	}
	for _, dependencies := range []map[string]string{manifest.MinecraftDependencies, manifest.Dependencies, manifest.OptionalDependencies, manifest.PeerDependencies} {
		for id, constraint := range dependencies {
			if strings.TrimSpace(id) == "" || len(id) > 128 || strings.TrimSpace(constraint) == "" || len(constraint) > 128 {
				return nil, errors.New("Manifest contains an invalid dependency")
			}
			if strings.EqualFold(id, addonID) {
				return nil, errors.New("Manifest must not declare a dependency on itself")
			}
		}
	}
	hasRequiredDependency := func(id string) bool {
		return strings.TrimSpace(manifest.Dependencies[id]) != ""
	}
	switch addonID {
	case "kairo":
		// Kairo is the dependency root and must not depend on itself.
	case "kairo-database":
		if !hasRequiredDependency("kairo") {
			return nil, errors.New("kairo-database must declare a kairo dependency")
		}
	default:
		if !hasRequiredDependency("kairo") || !hasRequiredDependency("kairo-database") {
			return nil, errors.New("Manifest must declare kairo and kairo-database dependencies")
		}
	}
	return json.Marshal(manifest)
}

type versionStore interface {
	CanPublish(context.Context, string, string) error
	PublishVersion(context.Context, addon.PublishVersionInput) (addon.Version, error)
	Version(context.Context, string, string) (addon.Version, error)
}

type versionHandler struct {
	store    versionStore
	sessions sessionUserStore
	objects  objectstorage.Store
}

func (h *versionHandler) publish(w http.ResponseWriter, r *http.Request) {
	user, ok := authenticatedUser(h.sessions, w, r)
	if !ok {
		return
	}
	addonID := strings.ToLower(strings.TrimSpace(r.PathValue("id")))
	if !addonIDPattern.MatchString(addonID) {
		writeError(w, http.StatusBadRequest, "invalid_addon", "Invalid add-on ID")
		return
	}
	if err := h.store.CanPublish(r.Context(), addonID, user.ID); err != nil {
		writeVersionStoreError(w, err)
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxAddonArchiveSize+(1<<20))
	if err := r.ParseMultipartForm(1 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_upload", "Invalid or oversized upload")
		return
	}
	version := strings.TrimSpace(r.FormValue("version"))
	if !semverPattern.MatchString(version) || len(version) > 128 {
		writeError(w, http.StatusBadRequest, "invalid_version", "Version must be valid SemVer")
		return
	}
	manifest, err := parseRegistryManifest(r.FormValue("manifest"), addonID, version)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_manifest", err.Error())
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "file_required", "ZIP file is required")
		return
	}
	defer file.Close()
	if !strings.EqualFold(filepath.Ext(header.Filename), ".zip") {
		writeError(w, http.StatusBadRequest, "invalid_archive", "File must be a ZIP archive")
		return
	}
	tmp, err := os.CreateTemp("", "kairo-upload-*.zip")
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Could not process upload")
		return
	}
	tmpPath := tmp.Name()
	defer os.Remove(tmpPath)
	hash := sha256.New()
	size, copyErr := io.Copy(io.MultiWriter(tmp, hash), io.LimitReader(file, maxAddonArchiveSize+1))
	closeErr := tmp.Close()
	if copyErr != nil || closeErr != nil {
		writeError(w, http.StatusBadRequest, "invalid_upload", "Could not read upload")
		return
	}
	if size == 0 || size > maxAddonArchiveSize {
		writeError(w, http.StatusRequestEntityTooLarge, "file_too_large", "ZIP must be between 1 byte and 256 MiB")
		return
	}
	if err := validateZip(tmpPath); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_archive", err.Error())
		return
	}
	key, err := versionObjectKey(addonID, version)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Could not prepare upload")
		return
	}
	source, err := os.Open(tmpPath)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Could not process upload")
		return
	}
	if err = h.objects.Put(r.Context(), key, source, size); err != nil {
		source.Close()
		log.Printf("store addon archive failed: %v", err)
		writeError(w, http.StatusInternalServerError, "storage_error", "Could not store upload")
		return
	}
	source.Close()
	result, err := h.store.PublishVersion(r.Context(), addon.PublishVersionInput{AddonID: addonID, Version: version, Prerelease: strings.Contains(version, "-"), FileKey: key, FileName: filepath.Base(header.Filename), FileSize: size, SHA256: hex.EncodeToString(hash.Sum(nil)), UserID: user.ID, Manifest: manifest})
	if err != nil {
		_ = h.objects.Delete(r.Context(), key)
		writeVersionStoreError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"version": result})
}

func validateZip(path string) error {
	archive, err := zip.OpenReader(path)
	if err != nil {
		return errors.New("File is not a valid ZIP archive")
	}
	defer archive.Close()
	if len(archive.File) == 0 {
		return errors.New("ZIP archive is empty")
	}
	var expanded uint64
	for _, file := range archive.File {
		expanded += file.UncompressedSize64
		if expanded > uint64(maxAddonArchiveSize*4) {
			return errors.New("ZIP archive expands beyond the safety limit")
		}
		clean := filepath.ToSlash(filepath.Clean(file.Name))
		if strings.HasPrefix(clean, "../") || strings.HasPrefix(clean, "/") {
			return errors.New("ZIP archive contains an unsafe path")
		}
	}
	return nil
}

func versionObjectKey(addonID, version string) (string, error) {
	random := make([]byte, 12)
	if _, err := rand.Read(random); err != nil {
		return "", err
	}
	return fmt.Sprintf("addons/%s/%s/%s.zip", addonID, version, hex.EncodeToString(random)), nil
}

func (h *versionHandler) download(w http.ResponseWriter, r *http.Request) {
	result, err := h.store.Version(r.Context(), r.PathValue("id"), r.PathValue("version"))
	if err != nil {
		writeVersionStoreError(w, err)
		return
	}
	file, err := h.objects.Open(r.Context(), result.FileKey)
	if err != nil {
		log.Printf("open addon archive failed: %v", err)
		writeError(w, http.StatusInternalServerError, "storage_error", "Could not open download")
		return
	}
	defer file.Close()
	w.Header().Set("Content-Type", "application/zip")
	w.Header().Set("Content-Length", fmt.Sprint(result.FileSize))
	w.Header().Set("X-Checksum-SHA256", result.SHA256)
	w.Header().Set("Content-Disposition", mime.FormatMediaType("attachment", map[string]string{"filename": result.FileName}))
	if _, err := io.Copy(w, file); err != nil {
		log.Printf("stream addon archive failed: %v", err)
	}
}

func writeVersionStoreError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, addon.ErrAddonNotFound):
		writeError(w, http.StatusNotFound, "addon_not_found", "Add-on or version not found")
	case errors.Is(err, addon.ErrOwnerForbidden):
		writeError(w, http.StatusForbidden, "owner_forbidden", "You cannot publish this add-on")
	case errors.Is(err, addon.ErrVersionExists):
		writeError(w, http.StatusConflict, "version_exists", "This version already exists")
	default:
		log.Printf("addon version operation failed: %v", err)
		writeError(w, http.StatusInternalServerError, "internal_error", "Could not process add-on version")
	}
}
