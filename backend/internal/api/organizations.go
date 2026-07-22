package api

import (
	"context"
	"errors"
	"log"
	"net/http"
	"regexp"

	"github.com/kairo-js/server/backend/internal/auth"
	"github.com/kairo-js/server/backend/internal/organization"
)

var organizationSlugPattern = regexp.MustCompile(`^[a-z0-9-]+$`)

type organizationStore interface {
	BySlug(ctx context.Context, slug string) (organization.Organization, error)
	ForUser(ctx context.Context, userID string) ([]organization.Membership, error)
}

type sessionUserStore interface {
	UserBySession(ctx context.Context, token string) (auth.User, error)
}

type organizationHandler struct {
	store    organizationStore
	sessions sessionUserStore
}

func (h *organizationHandler) get(w http.ResponseWriter, r *http.Request) {
	slug := r.PathValue("slug")
	if !organizationSlugPattern.MatchString(slug) {
		writeError(w, http.StatusNotFound, "organization_not_found", "Organization not found")
		return
	}
	result, err := h.store.BySlug(r.Context(), slug)
	if errors.Is(err, organization.ErrNotFound) {
		writeError(w, http.StatusNotFound, "organization_not_found", "Organization not found")
		return
	}
	if err != nil {
		log.Printf("get organization failed: %v", err)
		writeError(w, http.StatusInternalServerError, "internal_error", "Could not read organization")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"organization": result})
}

func (h *organizationHandler) mine(w http.ResponseWriter, r *http.Request) {
	user, ok := h.authenticatedUser(w, r)
	if !ok {
		return
	}
	memberships, err := h.store.ForUser(r.Context(), user.ID)
	if err != nil {
		log.Printf("list user organizations failed: %v", err)
		writeError(w, http.StatusInternalServerError, "internal_error", "Could not read organizations")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"memberships": memberships})
}

func (h *organizationHandler) authenticatedUser(w http.ResponseWriter, r *http.Request) (auth.User, bool) {
	cookie, err := r.Cookie(sessionCookieName)
	if err != nil || cookie.Value == "" {
		writeError(w, http.StatusUnauthorized, "unauthenticated", "Authentication required")
		return auth.User{}, false
	}
	user, err := h.sessions.UserBySession(r.Context(), cookie.Value)
	if errors.Is(err, auth.ErrSessionNotFound) {
		writeError(w, http.StatusUnauthorized, "unauthenticated", "Authentication required")
		return auth.User{}, false
	}
	if err != nil {
		log.Printf("read organization session failed: %v", err)
		writeError(w, http.StatusInternalServerError, "internal_error", "Could not read account")
		return auth.User{}, false
	}
	return user, true
}
