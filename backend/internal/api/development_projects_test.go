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

type fakeProjectGenerationRecorder struct {
	event addon.ProjectGeneration
	err   error
}

func (f *fakeProjectGenerationRecorder) RecordProjectGeneration(_ context.Context, event addon.ProjectGeneration) error {
	f.event = event
	return f.err
}

func TestDevelopmentProjectGeneratedRecordsNormalizedIntentAndOptions(t *testing.T) {
	recorder := &fakeProjectGenerationRecorder{}
	handler := &developmentProjectHandler{recorder: recorder}
	request := httptest.NewRequest(http.MethodPost, "/api/v1/development-projects/generated", strings.NewReader(`{
		"addonId":"My-Addon","platform":"windows","language":"typescript","runtime":"node","githubEnabled":true,
		"packageManager":"pnpm","prettierEnabled":true,"eslintEnabled":true,"readmeEnabled":false
	}`))
	response := httptest.NewRecorder()

	handler.generated(response, request)

	if response.Code != http.StatusNoContent {
		t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
	}
	if recorder.event.NormalizedID != "my-addon" || recorder.event.Platform != "windows" || recorder.event.Language != "typescript" || recorder.event.PackageManager != "pnpm" {
		t.Fatalf("unexpected event: %+v", recorder.event)
	}
	if len(recorder.event.AnonymousKeyHash) != 64 {
		t.Fatalf("anonymous key hash length = %d", len(recorder.event.AnonymousKeyHash))
	}
	if response.Result().Cookies()[0].Name != "kairo_builder_id" {
		t.Fatalf("anonymous cookie was not set")
	}
}

func TestDevelopmentProjectGeneratedRejectsInvalidOptions(t *testing.T) {
	recorder := &fakeProjectGenerationRecorder{}
	handler := &developmentProjectHandler{recorder: recorder}
	request := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"addonId":"bad_id","platform":"mobile","language":"rust","runtime":"bun","packageManager":"yarn"}`))
	response := httptest.NewRecorder()

	handler.generated(response, request)

	if response.Code != http.StatusBadRequest {
		t.Fatalf("status = %d", response.Code)
	}
	if recorder.event.NormalizedID != "" {
		t.Fatalf("invalid event was recorded")
	}
}

func TestDevelopmentProjectGeneratedDoesNotHideStoreFailure(t *testing.T) {
	handler := &developmentProjectHandler{recorder: &fakeProjectGenerationRecorder{err: errors.New("database unavailable")}}
	request := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{
		"addonId":"example","platform":"mobile","language":"javascript","runtime":"none","githubEnabled":false,
		"packageManager":"none","prettierEnabled":false,"eslintEnabled":false,"readmeEnabled":true
	}`))
	response := httptest.NewRecorder()

	handler.generated(response, request)

	if response.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d", response.Code)
	}
}
