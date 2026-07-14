package api

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"log"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/kairo-js/server/backend/internal/addon"
)

type projectGenerationRecorder interface {
	RecordProjectGeneration(ctx context.Context, event addon.ProjectGeneration) error
}

type developmentProjectHandler struct{ recorder projectGenerationRecorder }

type developmentProjectRequest struct {
	AddonID         string `json:"addonId"`
	Platform        string `json:"platform"`
	Language        string `json:"language"`
	Runtime         string `json:"runtime"`
	GitHubEnabled   bool   `json:"githubEnabled"`
	PackageManager  string `json:"packageManager"`
	PrettierEnabled bool   `json:"prettierEnabled"`
	ESLintEnabled   bool   `json:"eslintEnabled"`
	ReadmeEnabled   bool   `json:"readmeEnabled"`
}

var anonymousKeyPattern = regexp.MustCompile(`^[a-f0-9]{64}$`)

func (h *developmentProjectHandler) generated(w http.ResponseWriter, r *http.Request) {
	var body developmentProjectRequest
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&body); err != nil || !validProjectGeneration(body) {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid project generation event"})
		return
	}
	key := readOrCreateAnonymousKey(w, r)
	hash := sha256.Sum256([]byte(key))
	event := addon.ProjectGeneration{
		NormalizedID: strings.ToLower(body.AddonID), AnonymousKeyHash: hex.EncodeToString(hash[:]),
		Platform: body.Platform, Language: body.Language, Runtime: body.Runtime, PackageManager: body.PackageManager,
		GitHubEnabled: body.GitHubEnabled, PrettierEnabled: body.PrettierEnabled,
		ESLintEnabled: body.ESLintEnabled, ReadmeEnabled: body.ReadmeEnabled,
	}
	if err := h.recorder.RecordProjectGeneration(r.Context(), event); err != nil {
		log.Printf("record project generation failed: %v", err)
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "statistics unavailable"})
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func validProjectGeneration(body developmentProjectRequest) bool {
	validLanguage := body.Language == "javascript" || body.Language == "typescript"
	validManager := body.PackageManager == "npm" || body.PackageManager == "pnpm" || body.PackageManager == "none"
	validPlatform := body.Platform == "windows" || body.Platform == "mobile" || body.Platform == "mac-linux"
	validRuntime := body.Runtime == "node" || body.Runtime == "none"
	validCombination := body.Platform != "mobile" || (body.Language == "javascript" && body.Runtime == "none" && !body.GitHubEnabled && body.PackageManager == "none" && !body.PrettierEnabled && !body.ESLintEnabled)
	return addonIDPattern.MatchString(body.AddonID) && validPlatform && validLanguage && validRuntime && validManager && validCombination
}

func readOrCreateAnonymousKey(w http.ResponseWriter, r *http.Request) string {
	if cookie, err := r.Cookie("kairo_builder_id"); err == nil && anonymousKeyPattern.MatchString(cookie.Value) {
		return cookie.Value
	}
	valueBytes := make([]byte, 32)
	if _, err := rand.Read(valueBytes); err != nil {
		panic(err)
	}
	value := hex.EncodeToString(valueBytes)
	http.SetCookie(w, &http.Cookie{Name: "kairo_builder_id", Value: value, Path: "/", MaxAge: int((365 * 24 * time.Hour).Seconds()), HttpOnly: true, Secure: r.TLS != nil || r.Header.Get("X-Forwarded-Proto") == "https", SameSite: http.SameSiteLaxMode})
	return value
}
