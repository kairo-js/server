package api

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(r *http.Request) (*http.Response, error) {
	return f(r)
}

func TestGitHubLoginRedirectsWithStateAndScope(t *testing.T) {
	h := &authHandler{config: Config{
		AppEnv: "dev", PublicURL: "http://localhost:3000",
		GitHubClientID: "client-id", GitHubClientSecret: "client-secret",
	}}
	recorder := httptest.NewRecorder()
	h.githubLogin(recorder, httptest.NewRequest(http.MethodGet, "/api/v1/auth/github", nil))

	if recorder.Code != http.StatusFound {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusFound)
	}
	location := recorder.Header().Get("Location")
	if !strings.Contains(location, "client_id=client-id") ||
		!strings.Contains(location, "scope=read%3Auser+user%3Aemail") ||
		!strings.Contains(location, "state=") {
		t.Fatalf("unexpected redirect location: %s", location)
	}
	cookies := recorder.Result().Cookies()
	if len(cookies) != 1 || cookies[0].Name != githubStateCookie || cookies[0].Value == "" {
		t.Fatalf("OAuth state cookie was not set")
	}
	if !cookies[0].HttpOnly || cookies[0].SameSite != http.SameSiteLaxMode {
		t.Fatalf("OAuth state cookie is missing security attributes")
	}
}

func TestGitHubLoginReturnsUnavailableWhenNotConfigured(t *testing.T) {
	h := &authHandler{config: Config{AppEnv: "dev", PublicURL: "http://localhost:3000"}}
	recorder := httptest.NewRecorder()
	h.githubLogin(recorder, httptest.NewRequest(http.MethodGet, "/api/v1/auth/github", nil))
	if recorder.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusServiceUnavailable)
	}
}

func TestFetchGitHubPrimaryEmailRequiresVerifiedPrimary(t *testing.T) {
	h := &authHandler{httpClient: &http.Client{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
		if got := r.Header.Get("Authorization"); got != "Bearer token" {
			t.Fatalf("Authorization = %q", got)
		}
		return &http.Response{
			StatusCode: http.StatusOK,
			Header:     make(http.Header),
			Body: io.NopCloser(strings.NewReader(`[
				{"email":"secondary@example.com","primary":false,"verified":true},
				{"email":"primary@example.com","primary":true,"verified":true}
			]`)),
		}, nil
	})}}

	email, err := h.fetchGitHubPrimaryEmail(
		httptest.NewRequest(http.MethodGet, "/", nil), "token",
	)
	if err != nil {
		t.Fatalf("fetchGitHubPrimaryEmail returned error: %v", err)
	}
	if email != "primary@example.com" {
		t.Fatalf("email = %q, want primary@example.com", email)
	}
}

func TestFetchGitHubPrimaryEmailRejectsUnverifiedEmail(t *testing.T) {
	h := &authHandler{httpClient: &http.Client{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
		return &http.Response{
			StatusCode: http.StatusOK,
			Header:     make(http.Header),
			Body:       io.NopCloser(strings.NewReader(`[{"email":"user@example.com","primary":true,"verified":false}]`)),
		}, nil
	})}}

	_, err := h.fetchGitHubPrimaryEmail(
		httptest.NewRequest(http.MethodGet, "/", nil), "token",
	)
	if err == nil {
		t.Fatal("fetchGitHubPrimaryEmail accepted an unverified email")
	}
}
