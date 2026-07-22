package api

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/kairo-js/server/backend/internal/auth"
)

const (
	sessionCookieName = "kairo_session"
	googleStateCookie = "kairo_oauth_google_state"
	googleAuthURL     = "https://accounts.google.com/o/oauth2/v2/auth"
	googleTokenURL    = "https://oauth2.googleapis.com/token"
	googleUserInfoURL = "https://openidconnect.googleapis.com/v1/userinfo"
)

type authHandler struct {
	store                 *auth.Store
	officialOrganizations interface {
		BootstrapOfficialOwner(ctx context.Context, userID, githubLogin string) error
	}
	config     Config
	httpClient *http.Client
}

type googleTokenResponse struct {
	AccessToken string `json:"access_token"`
}

type googleUserInfo struct {
	Subject       string `json:"sub"`
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
}

func (h *authHandler) googleLogin(w http.ResponseWriter, r *http.Request) {
	if h.config.GoogleClientID == "" || h.config.GoogleClientSecret == "" {
		writeError(w, http.StatusServiceUnavailable, "google_oauth_not_configured", "Google login is not configured")
		return
	}

	state, err := randomToken(32)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Could not start login")
		return
	}
	h.setCookie(w, googleStateCookie, state, time.Now().Add(10*time.Minute), true)

	params := url.Values{
		"client_id":     {h.config.GoogleClientID},
		"redirect_uri":  {h.googleCallbackURL()},
		"response_type": {"code"},
		"scope":         {"openid email profile"},
		"state":         {state},
		"prompt":        {"select_account"},
	}
	http.Redirect(w, r, googleAuthURL+"?"+params.Encode(), http.StatusFound)
}

func (h *authHandler) googleCallback(w http.ResponseWriter, r *http.Request) {
	stateCookie, err := r.Cookie(googleStateCookie)
	if err != nil || stateCookie.Value == "" || r.URL.Query().Get("state") != stateCookie.Value {
		h.redirectAuthError(w, r, "invalid_state")
		return
	}
	h.clearCookie(w, googleStateCookie)

	if providerError := r.URL.Query().Get("error"); providerError != "" {
		h.redirectAuthError(w, r, providerError)
		return
	}
	code := r.URL.Query().Get("code")
	if code == "" {
		h.redirectAuthError(w, r, "missing_code")
		return
	}

	accessToken, err := h.exchangeGoogleCode(r, code)
	if err != nil {
		log.Printf("google token exchange failed: %v", err)
		h.redirectAuthError(w, r, "token_exchange_failed")
		return
	}
	profile, err := h.fetchGoogleProfile(r, accessToken)
	if err != nil {
		log.Printf("google userinfo failed: %v", err)
		h.redirectAuthError(w, r, "profile_fetch_failed")
		return
	}
	if !profile.EmailVerified || profile.Subject == "" || profile.Email == "" {
		h.redirectAuthError(w, r, "unverified_email")
		return
	}

	user, err := h.store.UpsertOAuthUser(r.Context(), auth.OAuthProfile{
		Provider: "google", ID: profile.Subject, Email: strings.ToLower(profile.Email),
		DisplayName: profile.Name, AvatarURL: profile.Picture,
	})
	if err != nil {
		log.Printf("save google user failed: %v", err)
		h.redirectAuthError(w, r, "account_save_failed")
		return
	}
	token, expiresAt, err := h.store.CreateSession(r.Context(), user.ID)
	if err != nil {
		log.Printf("create session failed: %v", err)
		h.redirectAuthError(w, r, "session_create_failed")
		return
	}
	h.setCookie(w, sessionCookieName, token, expiresAt, true)
	http.Redirect(w, r, h.config.PublicURL+"/account", http.StatusFound)
}

func (h *authHandler) me(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie(sessionCookieName)
	if err != nil || cookie.Value == "" {
		writeError(w, http.StatusUnauthorized, "unauthenticated", "Authentication required")
		return
	}
	user, err := h.store.UserBySession(r.Context(), cookie.Value)
	if errors.Is(err, auth.ErrSessionNotFound) {
		h.clearCookie(w, sessionCookieName)
		writeError(w, http.StatusUnauthorized, "unauthenticated", "Authentication required")
		return
	}
	if err != nil {
		log.Printf("read session failed: %v", err)
		writeError(w, http.StatusInternalServerError, "internal_error", "Could not read account")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"user": user})
}

func (h *authHandler) logout(w http.ResponseWriter, r *http.Request) {
	if cookie, err := r.Cookie(sessionCookieName); err == nil && cookie.Value != "" {
		if err := h.store.DeleteSession(r.Context(), cookie.Value); err != nil {
			log.Printf("delete session failed: %v", err)
			writeError(w, http.StatusInternalServerError, "internal_error", "Could not log out")
			return
		}
	}
	h.clearCookie(w, sessionCookieName)
	w.WriteHeader(http.StatusNoContent)
}

func (h *authHandler) exchangeGoogleCode(r *http.Request, code string) (string, error) {
	form := url.Values{
		"code":          {code},
		"client_id":     {h.config.GoogleClientID},
		"client_secret": {h.config.GoogleClientSecret},
		"redirect_uri":  {h.googleCallbackURL()},
		"grant_type":    {"authorization_code"},
	}
	req, err := http.NewRequestWithContext(r.Context(), http.MethodPost, googleTokenURL, strings.NewReader(form.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := h.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return "", fmt.Errorf("token endpoint returned %d: %s", resp.StatusCode, body)
	}
	var token googleTokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&token); err != nil {
		return "", err
	}
	if token.AccessToken == "" {
		return "", errors.New("token endpoint returned an empty access token")
	}
	return token.AccessToken, nil
}

func (h *authHandler) fetchGoogleProfile(r *http.Request, accessToken string) (googleUserInfo, error) {
	req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, googleUserInfoURL, nil)
	if err != nil {
		return googleUserInfo{}, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	resp, err := h.httpClient.Do(req)
	if err != nil {
		return googleUserInfo{}, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return googleUserInfo{}, fmt.Errorf("userinfo endpoint returned %d", resp.StatusCode)
	}
	var profile googleUserInfo
	if err := json.NewDecoder(resp.Body).Decode(&profile); err != nil {
		return googleUserInfo{}, err
	}
	return profile, nil
}

func (h *authHandler) googleCallbackURL() string {
	return h.config.PublicURL + "/api/v1/auth/google/callback"
}

func (h *authHandler) redirectAuthError(w http.ResponseWriter, r *http.Request, code string) {
	http.Redirect(w, r, h.config.PublicURL+"/?auth_error="+url.QueryEscape(code), http.StatusFound)
}

func (h *authHandler) setCookie(w http.ResponseWriter, name, value string, expires time.Time, httpOnly bool) {
	http.SetCookie(w, &http.Cookie{
		Name: name, Value: value, Path: "/", Expires: expires,
		MaxAge: int(time.Until(expires).Seconds()), HttpOnly: httpOnly,
		Secure: h.config.AppEnv != "dev", SameSite: http.SameSiteLaxMode,
	})
}

func (h *authHandler) clearCookie(w http.ResponseWriter, name string) {
	http.SetCookie(w, &http.Cookie{
		Name: name, Path: "/", MaxAge: -1, Expires: time.Unix(0, 0),
		HttpOnly: true, Secure: h.config.AppEnv != "dev", SameSite: http.SameSiteLaxMode,
	})
}

func randomToken(size int) (string, error) {
	b := make([]byte, size)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, map[string]any{
		"error": map[string]string{"code": code, "message": message},
	})
}
