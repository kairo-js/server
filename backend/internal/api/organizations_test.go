package api

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/kairo-js/server/backend/internal/auth"
	"github.com/kairo-js/server/backend/internal/organization"
)

type fakeOrganizationStore struct {
	organization organization.Organization
	memberships  []organization.Membership
	err          error
	gotSlug      string
	gotUserID    string
}

func (f *fakeOrganizationStore) BySlug(_ context.Context, slug string) (organization.Organization, error) {
	f.gotSlug = slug
	return f.organization, f.err
}

func (f *fakeOrganizationStore) ForUser(_ context.Context, userID string) ([]organization.Membership, error) {
	f.gotUserID = userID
	return f.memberships, f.err
}

type fakeSessionUserStore struct {
	user     auth.User
	err      error
	gotToken string
}

func (f *fakeSessionUserStore) UserBySession(_ context.Context, token string) (auth.User, error) {
	f.gotToken = token
	return f.user, f.err
}

func TestOrganizationGetReturnsPublicOrganization(t *testing.T) {
	store := &fakeOrganizationStore{organization: organization.Organization{ID: "org-id", Slug: "kairo-js", DisplayName: "Kairo.js", Official: true, Verified: true, CreatedAt: time.Now()}}
	handler := &organizationHandler{store: store}
	request := httptest.NewRequest(http.MethodGet, "/api/v1/organizations/kairo-js", nil)
	request.SetPathValue("slug", "kairo-js")
	response := httptest.NewRecorder()

	handler.get(response, request)

	if response.Code != http.StatusOK || store.gotSlug != "kairo-js" {
		t.Fatalf("status = %d, slug = %q", response.Code, store.gotSlug)
	}
	if !strings.Contains(response.Body.String(), `"official":true`) {
		t.Fatalf("unexpected response: %s", response.Body.String())
	}
}

func TestOrganizationGetHidesInvalidAndMissingSlugs(t *testing.T) {
	store := &fakeOrganizationStore{err: organization.ErrNotFound}
	handler := &organizationHandler{store: store}
	request := httptest.NewRequest(http.MethodGet, "/", nil)
	request.SetPathValue("slug", "Invalid_Slug")
	response := httptest.NewRecorder()
	handler.get(response, request)
	if response.Code != http.StatusNotFound || store.gotSlug != "" {
		t.Fatalf("status = %d, slug = %q", response.Code, store.gotSlug)
	}
}

func TestOrganizationMineRequiresSession(t *testing.T) {
	handler := &organizationHandler{store: &fakeOrganizationStore{}, sessions: &fakeSessionUserStore{}}
	response := httptest.NewRecorder()
	handler.mine(response, httptest.NewRequest(http.MethodGet, "/", nil))
	if response.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d", response.Code)
	}
}

func TestOrganizationMineReturnsMembershipRole(t *testing.T) {
	store := &fakeOrganizationStore{memberships: []organization.Membership{{Organization: organization.Organization{Slug: "kairo-js"}, Role: "owner"}}}
	sessions := &fakeSessionUserStore{user: auth.User{ID: "user-id"}}
	handler := &organizationHandler{store: store, sessions: sessions}
	request := httptest.NewRequest(http.MethodGet, "/", nil)
	request.AddCookie(&http.Cookie{Name: sessionCookieName, Value: "session-token"})
	response := httptest.NewRecorder()

	handler.mine(response, request)

	if response.Code != http.StatusOK || store.gotUserID != "user-id" || sessions.gotToken != "session-token" {
		t.Fatalf("status = %d", response.Code)
	}
	if !strings.Contains(response.Body.String(), `"role":"owner"`) {
		t.Fatalf("unexpected response: %s", response.Body.String())
	}
}

func TestOrganizationMineRejectsExpiredSession(t *testing.T) {
	handler := &organizationHandler{store: &fakeOrganizationStore{}, sessions: &fakeSessionUserStore{err: auth.ErrSessionNotFound}}
	request := httptest.NewRequest(http.MethodGet, "/", nil)
	request.AddCookie(&http.Cookie{Name: sessionCookieName, Value: "expired"})
	response := httptest.NewRecorder()
	handler.mine(response, request)
	if response.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d", response.Code)
	}
}

func TestOrganizationMineReturnsStoreFailure(t *testing.T) {
	handler := &organizationHandler{store: &fakeOrganizationStore{err: errors.New("database unavailable")}, sessions: &fakeSessionUserStore{user: auth.User{ID: "user-id"}}}
	request := httptest.NewRequest(http.MethodGet, "/", nil)
	request.AddCookie(&http.Cookie{Name: sessionCookieName, Value: "valid"})
	response := httptest.NewRecorder()
	handler.mine(response, request)
	if response.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d", response.Code)
	}
}
