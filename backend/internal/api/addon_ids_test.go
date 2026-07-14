package api

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/kairo-js/server/backend/internal/addon"
)

type fakeIDChecker struct {
	status addon.IDStatus
	err    error
	gotID  string
}

func (f *fakeIDChecker) IDStatus(_ context.Context, normalizedID string) (addon.IDStatus, error) {
	f.gotID = normalizedID
	return f.status, f.err
}

func TestAddonIDAvailabilityNormalizesID(t *testing.T) {
	checker := &fakeIDChecker{status: addon.IDTaken}
	handler := &addonIDHandler{checker: checker}
	request := httptest.NewRequest(http.MethodGet, "/api/v1/addon-ids/Example-ID/availability", nil)
	request.SetPathValue("id", "Example-ID")
	response := httptest.NewRecorder()

	handler.availability(response, request)

	if response.Code != http.StatusOK || checker.gotID != "example-id" {
		t.Fatalf("status = %d, normalized ID = %q", response.Code, checker.gotID)
	}
	if !strings.Contains(response.Body.String(), `"status":"taken"`) {
		t.Fatalf("unexpected response: %s", response.Body.String())
	}
}

func TestAddonIDAvailabilityRejectsInvalidIDWithoutDatabase(t *testing.T) {
	checker := &fakeIDChecker{status: addon.IDAvailable}
	handler := &addonIDHandler{checker: checker}
	request := httptest.NewRequest(http.MethodGet, "/", nil)
	request.SetPathValue("id", "invalid_id")
	response := httptest.NewRecorder()

	handler.availability(response, request)

	if response.Code != http.StatusOK || checker.gotID != "" {
		t.Fatalf("status = %d, checker ID = %q", response.Code, checker.gotID)
	}
	if !strings.Contains(response.Body.String(), `"status":"invalid"`) {
		t.Fatalf("unexpected response: %s", response.Body.String())
	}
}

func TestAddonIDAvailabilityReturnsUnknownOnStoreFailure(t *testing.T) {
	handler := &addonIDHandler{checker: &fakeIDChecker{err: errors.New("database unavailable")}}
	request := httptest.NewRequest(http.MethodGet, "/", nil)
	request.SetPathValue("id", "example")
	response := httptest.NewRecorder()

	handler.availability(response, request)

	if response.Code != http.StatusServiceUnavailable || !strings.Contains(response.Body.String(), `"status":"unknown"`) {
		t.Fatalf("status = %d, response = %s", response.Code, response.Body.String())
	}
}
