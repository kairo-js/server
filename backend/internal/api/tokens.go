package api

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"unicode/utf8"

	"github.com/kairo-js/server/backend/internal/auth"
)

type apiTokenStore interface {
	CreateAPIToken(context.Context, string, string) (auth.APIToken, string, error)
	DeleteAPIToken(context.Context, string, string) error
}

type tokenHandler struct {
	store    apiTokenStore
	sessions sessionUserStore
}

func (h *tokenHandler) create(w http.ResponseWriter, r *http.Request) {
	user, ok := authenticatedUser(h.sessions, w, r)
	if !ok {
		return
	}
	var body struct {
		Name string `json:"name"`
	}
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16<<10))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "Invalid request body")
		return
	}
	body.Name = strings.TrimSpace(body.Name)
	if body.Name == "" || utf8.RuneCountInString(body.Name) > 120 {
		writeError(w, http.StatusBadRequest, "invalid_name", "Token name must be between 1 and 120 characters")
		return
	}
	metadata, token, err := h.store.CreateAPIToken(r.Context(), user.ID, body.Name)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Could not create API token")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"token": token, "metadata": metadata})
}

func (h *tokenHandler) revoke(w http.ResponseWriter, r *http.Request) {
	user, ok := authenticatedUser(h.sessions, w, r)
	if !ok {
		return
	}
	err := h.store.DeleteAPIToken(r.Context(), user.ID, r.PathValue("id"))
	if errors.Is(err, auth.ErrAPITokenNotFound) {
		writeError(w, http.StatusNotFound, "token_not_found", "API token not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Could not revoke API token")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
