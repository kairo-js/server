package api

import (
	"log"
	"net/http"
	"regexp"
	"strings"

	"github.com/kairo-js/server/backend/internal/addon"
)

var addonIDPattern = regexp.MustCompile(`^[A-Za-z0-9-]+$`)

type addonIDHandler struct {
	checker addon.IDChecker
}

func (h *addonIDHandler) availability(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	normalizedID := strings.ToLower(id)
	if !addonIDPattern.MatchString(id) {
		writeJSON(w, http.StatusOK, map[string]string{
			"id": id, "normalizedId": normalizedID, "status": "invalid",
		})
		return
	}

	status, err := h.checker.IDStatus(r.Context(), normalizedID)
	if err != nil {
		log.Printf("check addon ID availability failed: %v", err)
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{
			"id": id, "normalizedId": normalizedID, "status": "unknown",
		})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{
		"id": id, "normalizedId": normalizedID, "status": string(status),
	})
}
