package api

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"
	"unicode/utf8"

	"github.com/kairo-js/server/backend/internal/addon"
	"github.com/kairo-js/server/backend/internal/auth"
)

type addonCreator interface {
	Create(ctx context.Context, input addon.CreateAddonInput) (addon.Addon, error)
}

type addonReader interface {
	Addon(context.Context, string) (addon.Addon, error)
	Versions(context.Context, string) ([]addon.Version, error)
	LatestVersion(context.Context, string, string) (addon.Version, error)
}

type addonHandler struct {
	store    addonCreator
	reader   addonReader
	sessions sessionUserStore
}

type publicVersion struct {
	addon.Version
	DownloadURL string `json:"downloadUrl"`
}

func publicAddonVersion(addonID string, version addon.Version) publicVersion {
	return publicVersion{Version: version, DownloadURL: "/api/v1/addons/" + addonID + "/versions/" + version.Version + "/download"}
}

func (h *addonHandler) get(w http.ResponseWriter, r *http.Request) {
	result, err := h.reader.Addon(r.Context(), r.PathValue("id"))
	if !writeAddonReadError(w, err) {
		writeJSON(w, http.StatusOK, map[string]any{"addon": result})
	}
}

func (h *addonHandler) versions(w http.ResponseWriter, r *http.Request) {
	addonID := strings.ToLower(r.PathValue("id"))
	result, err := h.reader.Versions(r.Context(), addonID)
	if writeAddonReadError(w, err) {
		return
	}
	versions := make([]publicVersion, len(result))
	for i, version := range result {
		versions[i] = publicAddonVersion(addonID, version)
	}
	writeJSON(w, http.StatusOK, map[string]any{"versions": versions})
}

func (h *addonHandler) latestVersion(w http.ResponseWriter, r *http.Request) {
	addonID := strings.ToLower(r.PathValue("id"))
	channel := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("channel")))
	if channel != "" && channel != "stable" && channel != "beta" {
		writeError(w, http.StatusBadRequest, "invalid_channel", "Channel must be stable or beta")
		return
	}
	result, err := h.reader.LatestVersion(r.Context(), addonID, channel)
	if !writeAddonReadError(w, err) {
		writeJSON(w, http.StatusOK, map[string]any{"version": publicAddonVersion(addonID, result)})
	}
}

func writeAddonReadError(w http.ResponseWriter, err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, addon.ErrAddonNotFound) {
		writeError(w, http.StatusNotFound, "addon_not_found", "Add-on or version not found")
	} else {
		log.Printf("read addon failed: %v", err)
		writeError(w, http.StatusInternalServerError, "internal_error", "Could not read add-on")
	}
	return true
}

type createAddonRequest struct {
	ID          string `json:"id"`
	DisplayName string `json:"displayName"`
	Description string `json:"description"`
	Owner       struct {
		Type string `json:"type"`
		Slug string `json:"slug"`
	} `json:"owner"`
}

func (h *addonHandler) create(w http.ResponseWriter, r *http.Request) {
	user, ok := authenticatedUser(h.sessions, w, r)
	if !ok {
		return
	}
	var body createAddonRequest
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16<<10))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body")
		return
	}
	body.ID = strings.ToLower(strings.TrimSpace(body.ID))
	body.DisplayName = strings.TrimSpace(body.DisplayName)
	body.Description = strings.TrimSpace(body.Description)
	body.Owner.Slug = strings.ToLower(strings.TrimSpace(body.Owner.Slug))
	if !addonIDPattern.MatchString(body.ID) || len(body.ID) > 64 || body.DisplayName == "" || utf8.RuneCountInString(body.DisplayName) > 120 || utf8.RuneCountInString(body.Description) > 4000 {
		writeError(w, http.StatusBadRequest, "invalid_addon", "Invalid add-on ID, display name, or description")
		return
	}
	if body.Owner.Type != "user" && body.Owner.Type != "organization" {
		writeError(w, http.StatusBadRequest, "invalid_owner", "Owner type must be user or organization")
		return
	}
	if body.Owner.Type == "organization" && !organizationSlugPattern.MatchString(body.Owner.Slug) {
		writeError(w, http.StatusBadRequest, "invalid_owner", "A valid organization slug is required")
		return
	}
	result, err := h.store.Create(r.Context(), addon.CreateAddonInput{
		AddonID: body.ID, DisplayName: body.DisplayName, Description: body.Description, UserID: user.ID,
		OwnerType: body.Owner.Type, OrganizationSlug: body.Owner.Slug,
	})
	switch {
	case errors.Is(err, addon.ErrIDUnavailable):
		writeError(w, http.StatusConflict, "addon_id_unavailable", "Add-on ID is unavailable")
	case errors.Is(err, addon.ErrOrganizationNotFound):
		writeError(w, http.StatusNotFound, "organization_not_found", "Organization not found")
	case errors.Is(err, addon.ErrOwnerForbidden):
		writeError(w, http.StatusForbidden, "owner_forbidden", "You cannot create add-ons for this organization")
	case err != nil:
		log.Printf("create addon failed: %v", err)
		writeError(w, http.StatusInternalServerError, "internal_error", "Could not create add-on")
	default:
		writeJSON(w, http.StatusCreated, map[string]any{"addon": result})
	}
}

func authenticatedUser(sessions sessionUserStore, w http.ResponseWriter, r *http.Request) (auth.User, bool) {
	if authorization := r.Header.Get("Authorization"); strings.HasPrefix(authorization, "Bearer ") {
		tokenStore, supported := sessions.(interface {
			UserByAPIToken(context.Context, string) (auth.User, error)
		})
		if !supported {
			writeError(w, http.StatusUnauthorized, "unauthenticated", "Authentication required")
			return auth.User{}, false
		}
		user, err := tokenStore.UserByAPIToken(r.Context(), strings.TrimSpace(strings.TrimPrefix(authorization, "Bearer ")))
		if errors.Is(err, auth.ErrAPITokenNotFound) {
			writeError(w, http.StatusUnauthorized, "unauthenticated", "Authentication required")
			return auth.User{}, false
		}
		if err != nil {
			log.Printf("read API token failed: %v", err)
			writeError(w, http.StatusInternalServerError, "internal_error", "Could not read account")
			return auth.User{}, false
		}
		return user, true
	}
	cookie, err := r.Cookie(sessionCookieName)
	if err != nil || cookie.Value == "" {
		writeError(w, http.StatusUnauthorized, "unauthenticated", "Authentication required")
		return auth.User{}, false
	}
	user, err := sessions.UserBySession(r.Context(), cookie.Value)
	if errors.Is(err, auth.ErrSessionNotFound) {
		writeError(w, http.StatusUnauthorized, "unauthenticated", "Authentication required")
		return auth.User{}, false
	}
	if err != nil {
		log.Printf("read session failed: %v", err)
		writeError(w, http.StatusInternalServerError, "internal_error", "Could not read account")
		return auth.User{}, false
	}
	return user, true
}
