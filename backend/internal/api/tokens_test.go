package api

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/kairo-js/server/backend/internal/auth"
)

type fakeTokenStore struct {
	tokens   []auth.APIToken
	metadata auth.APIToken
	token    string
	userID   string
	name     string
}

func (f *fakeTokenStore) APITokens(context.Context, string) ([]auth.APIToken, error) {
	return f.tokens, nil
}

func (f *fakeTokenStore) CreateAPIToken(_ context.Context, userID, name string) (auth.APIToken, string, error) {
	f.userID, f.name = userID, name
	return f.metadata, f.token, nil
}

func (f *fakeTokenStore) DeleteAPIToken(context.Context, string, string) error { return nil }

type fakeBearerStore struct {
	fakeSessionUserStore
	bearer string
}

func (f *fakeBearerStore) UserByAPIToken(_ context.Context, token string) (auth.User, error) {
	f.bearer = token
	return f.user, f.err
}

func TestCreateAPITokenReturnsPlaintextOnce(t *testing.T) {
	store := &fakeTokenStore{token: "kairo_secret"}
	handler := &tokenHandler{store: store, sessions: &fakeSessionUserStore{user: auth.User{ID: "user-id"}}}
	request := httptest.NewRequest(http.MethodPost, "/api/v1/tokens", strings.NewReader(`{"name":" Windows launcher "}`))
	request.AddCookie(&http.Cookie{Name: sessionCookieName, Value: "session"})
	response := httptest.NewRecorder()
	handler.create(response, request)
	if response.Code != http.StatusCreated || store.userID != "user-id" || store.name != "Windows launcher" || !strings.Contains(response.Body.String(), `"token":"kairo_secret"`) {
		t.Fatalf("status = %d, user = %q, name = %q, body = %s", response.Code, store.userID, store.name, response.Body.String())
	}
}

func TestListAPITokensDoesNotReturnPlaintext(t *testing.T) {
	store := &fakeTokenStore{tokens: []auth.APIToken{{ID: "token-id", Name: "Kairo CLI"}}}
	handler := &tokenHandler{store: store, sessions: &fakeSessionUserStore{user: auth.User{ID: "user-id"}}}
	request := httptest.NewRequest(http.MethodGet, "/api/v1/tokens", nil)
	request.AddCookie(&http.Cookie{Name: sessionCookieName, Value: "session"})
	response := httptest.NewRecorder()
	handler.list(response, request)
	if response.Code != http.StatusOK || !strings.Contains(response.Body.String(), `"name":"Kairo CLI"`) || strings.Contains(response.Body.String(), "kairo_secret") {
		t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
	}
}

func TestAuthenticatedUserAcceptsBearerToken(t *testing.T) {
	store := &fakeBearerStore{fakeSessionUserStore: fakeSessionUserStore{user: auth.User{ID: "user-id"}}}
	request := httptest.NewRequest(http.MethodPost, "/", nil)
	request.Header.Set("Authorization", "Bearer kairo_secret")
	response := httptest.NewRecorder()
	user, ok := authenticatedUser(store, response, request)
	if !ok || user.ID != "user-id" || store.bearer != "kairo_secret" {
		t.Fatalf("ok = %v, user = %+v, token = %q", ok, user, store.bearer)
	}
}
