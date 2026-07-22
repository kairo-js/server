package api

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/kairo-js/server/backend/internal/addon"
	"github.com/kairo-js/server/backend/internal/auth"
)

type fakeAddonCreator struct {
	result addon.Addon
	err    error
	input  addon.CreateAddonInput
}

type fakeAddonReader struct {
	addon    addon.Addon
	versions []addon.Version
	latest   addon.Version
	channel  string
	err      error
}

func (f *fakeAddonReader) Addon(context.Context, string) (addon.Addon, error) {
	return f.addon, f.err
}

func (f *fakeAddonReader) Versions(context.Context, string) ([]addon.Version, error) {
	return f.versions, f.err
}

func (f *fakeAddonReader) LatestVersion(_ context.Context, _, channel string) (addon.Version, error) {
	f.channel = channel
	return f.latest, f.err
}

func (f *fakeAddonCreator) Create(_ context.Context, input addon.CreateAddonInput) (addon.Addon, error) {
	f.input = input
	return f.result, f.err
}

func authenticatedAddonRequest(body string) *http.Request {
	request := httptest.NewRequest(http.MethodPost, "/api/v1/addons", strings.NewReader(body))
	request.AddCookie(&http.Cookie{Name: sessionCookieName, Value: "valid-session"})
	return request
}

func TestCreateAddonForCurrentUser(t *testing.T) {
	creator := &fakeAddonCreator{result: addon.Addon{ID: "addon-uuid", AddonID: "my-addon", Owner: addon.Owner{Type: "user"}}}
	handler := &addonHandler{store: creator, sessions: &fakeSessionUserStore{user: auth.User{ID: "user-id"}}}
	response := httptest.NewRecorder()

	handler.create(response, authenticatedAddonRequest(`{"id":"My-Addon","displayName":" My Add-on ","description":" Description ","owner":{"type":"user"}}`))

	if response.Code != http.StatusCreated {
		t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
	}
	if creator.input.AddonID != "my-addon" || creator.input.UserID != "user-id" || creator.input.DisplayName != "My Add-on" || creator.input.OwnerType != "user" {
		t.Fatalf("unexpected input: %+v", creator.input)
	}
}

func TestCreateAddonForOrganization(t *testing.T) {
	creator := &fakeAddonCreator{result: addon.Addon{AddonID: "kairo", Owner: addon.Owner{Type: "organization", Slug: "kairo-js"}}}
	handler := &addonHandler{store: creator, sessions: &fakeSessionUserStore{user: auth.User{ID: "user-id"}}}
	response := httptest.NewRecorder()
	handler.create(response, authenticatedAddonRequest(`{"id":"kairo","displayName":"Kairo","owner":{"type":"organization","slug":"KAIRO-JS"}}`))
	if response.Code != http.StatusCreated || creator.input.OrganizationSlug != "kairo-js" {
		t.Fatalf("status = %d, input = %+v", response.Code, creator.input)
	}
}

func TestCreateAddonRequiresAuthentication(t *testing.T) {
	handler := &addonHandler{store: &fakeAddonCreator{}, sessions: &fakeSessionUserStore{}}
	response := httptest.NewRecorder()
	handler.create(response, httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{}`)))
	if response.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d", response.Code)
	}
}

func TestCreateAddonValidatesBeforeStore(t *testing.T) {
	creator := &fakeAddonCreator{}
	handler := &addonHandler{store: creator, sessions: &fakeSessionUserStore{user: auth.User{ID: "user-id"}}}
	response := httptest.NewRecorder()
	handler.create(response, authenticatedAddonRequest(`{"id":"invalid_id","displayName":"","owner":{"type":"organization","slug":"bad_slug"}}`))
	if response.Code != http.StatusBadRequest || creator.input.UserID != "" {
		t.Fatalf("status = %d, input = %+v", response.Code, creator.input)
	}
}

func TestCreateAddonMapsDomainErrors(t *testing.T) {
	tests := []struct {
		err    error
		status int
		code   string
	}{
		{addon.ErrIDUnavailable, http.StatusConflict, "addon_id_unavailable"},
		{addon.ErrOrganizationNotFound, http.StatusNotFound, "organization_not_found"},
		{addon.ErrOwnerForbidden, http.StatusForbidden, "owner_forbidden"},
		{errors.New("database unavailable"), http.StatusInternalServerError, "internal_error"},
	}
	for _, tt := range tests {
		t.Run(tt.code, func(t *testing.T) {
			handler := &addonHandler{store: &fakeAddonCreator{err: tt.err}, sessions: &fakeSessionUserStore{user: auth.User{ID: "user-id"}}}
			response := httptest.NewRecorder()
			handler.create(response, authenticatedAddonRequest(`{"id":"example","displayName":"Example","owner":{"type":"user"}}`))
			if response.Code != tt.status || !strings.Contains(response.Body.String(), tt.code) {
				t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
			}
		})
	}
}

func TestGetPublicAddon(t *testing.T) {
	handler := &addonHandler{reader: &fakeAddonReader{addon: addon.Addon{AddonID: "kairo", DisplayName: "Kairo"}}}
	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/v1/addons/kairo", nil)
	request.SetPathValue("id", "kairo")
	handler.get(response, request)
	if response.Code != http.StatusOK || !strings.Contains(response.Body.String(), `"addonId":"kairo"`) {
		t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
	}
}

func TestListPublicAddonVersionsIncludesDownloadURL(t *testing.T) {
	handler := &addonHandler{reader: &fakeAddonReader{versions: []addon.Version{{Version: "1.2.0", SHA256: strings.Repeat("a", 64)}}}}
	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/v1/addons/KAIRO/versions", nil)
	request.SetPathValue("id", "KAIRO")
	handler.versions(response, request)
	if response.Code != http.StatusOK || !strings.Contains(response.Body.String(), `"downloadUrl":"/api/v1/addons/kairo/versions/1.2.0/download"`) {
		t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
	}
}

func TestGetLatestStableVersion(t *testing.T) {
	handler := &addonHandler{reader: &fakeAddonReader{latest: addon.Version{Version: "2.0.0"}}}
	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/v1/addons/kairo/versions/latest", nil)
	request.SetPathValue("id", "kairo")
	handler.latestVersion(response, request)
	if response.Code != http.StatusOK || !strings.Contains(response.Body.String(), `"version":"2.0.0"`) {
		t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
	}
}

func TestGetLatestBetaVersion(t *testing.T) {
	reader := &fakeAddonReader{latest: addon.Version{Version: "2.0.0-beta.3", Prerelease: true}}
	handler := &addonHandler{reader: reader}
	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/v1/addons/kairo/versions/latest?channel=beta", nil)
	request.SetPathValue("id", "kairo")
	handler.latestVersion(response, request)
	if response.Code != http.StatusOK || reader.channel != "beta" || !strings.Contains(response.Body.String(), `"version":"2.0.0-beta.3"`) {
		t.Fatalf("status = %d, channel = %q, body = %s", response.Code, reader.channel, response.Body.String())
	}
}

func TestGetLatestVersionRejectsUnknownChannel(t *testing.T) {
	handler := &addonHandler{reader: &fakeAddonReader{}}
	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/v1/addons/kairo/versions/latest?channel=nightly", nil)
	request.SetPathValue("id", "kairo")
	handler.latestVersion(response, request)
	if response.Code != http.StatusBadRequest || !strings.Contains(response.Body.String(), "invalid_channel") {
		t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
	}
}

func TestPublicAddonReadReturnsNotFound(t *testing.T) {
	handler := &addonHandler{reader: &fakeAddonReader{err: addon.ErrAddonNotFound}}
	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/v1/addons/missing", nil)
	request.SetPathValue("id", "missing")
	handler.get(response, request)
	if response.Code != http.StatusNotFound || !strings.Contains(response.Body.String(), "addon_not_found") {
		t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
	}
}
