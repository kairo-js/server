package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/kairo-js/server/backend/internal/auth"
)

const (
	githubStateCookie = "kairo_oauth_github_state"
	githubAuthURL     = "https://github.com/login/oauth/authorize"
	githubTokenURL    = "https://github.com/login/oauth/access_token"
	githubUserURL     = "https://api.github.com/user"
	githubEmailsURL   = "https://api.github.com/user/emails"
)

type githubTokenResponse struct {
	AccessToken string `json:"access_token"`
	Error       string `json:"error"`
}

type githubUser struct {
	ID        int64  `json:"id"`
	Login     string `json:"login"`
	Name      string `json:"name"`
	AvatarURL string `json:"avatar_url"`
}

type githubEmail struct {
	Email    string `json:"email"`
	Primary  bool   `json:"primary"`
	Verified bool   `json:"verified"`
}

func (h *authHandler) githubLogin(w http.ResponseWriter, r *http.Request) {
	if h.config.GitHubClientID == "" || h.config.GitHubClientSecret == "" {
		writeError(w, http.StatusServiceUnavailable, "github_oauth_not_configured", "GitHub login is not configured")
		return
	}

	state, err := randomToken(32)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Could not start login")
		return
	}
	h.setCookie(w, githubStateCookie, state, time.Now().Add(10*time.Minute), true)

	params := url.Values{
		"client_id":    {h.config.GitHubClientID},
		"redirect_uri": {h.githubCallbackURL()},
		"scope":        {"read:user user:email"},
		"state":        {state},
	}
	http.Redirect(w, r, githubAuthURL+"?"+params.Encode(), http.StatusFound)
}

func (h *authHandler) githubCallback(w http.ResponseWriter, r *http.Request) {
	stateCookie, err := r.Cookie(githubStateCookie)
	if err != nil || stateCookie.Value == "" || r.URL.Query().Get("state") != stateCookie.Value {
		h.redirectAuthError(w, r, "invalid_state")
		return
	}
	h.clearCookie(w, githubStateCookie)

	if providerError := r.URL.Query().Get("error"); providerError != "" {
		h.redirectAuthError(w, r, providerError)
		return
	}
	code := r.URL.Query().Get("code")
	if code == "" {
		h.redirectAuthError(w, r, "missing_code")
		return
	}

	accessToken, err := h.exchangeGitHubCode(r, code)
	if err != nil {
		log.Printf("github token exchange failed: %v", err)
		h.redirectAuthError(w, r, "token_exchange_failed")
		return
	}
	profile, err := h.fetchGitHubUser(r, accessToken)
	if err != nil {
		log.Printf("github user fetch failed: %v", err)
		h.redirectAuthError(w, r, "profile_fetch_failed")
		return
	}
	email, err := h.fetchGitHubPrimaryEmail(r, accessToken)
	if err != nil {
		log.Printf("github email fetch failed: %v", err)
		h.redirectAuthError(w, r, "verified_email_required")
		return
	}
	if profile.ID == 0 || profile.Login == "" {
		h.redirectAuthError(w, r, "invalid_profile")
		return
	}
	displayName := profile.Name
	if displayName == "" {
		displayName = profile.Login
	}

	user, err := h.store.UpsertOAuthUser(r.Context(), auth.OAuthProfile{
		Provider: "github", ID: strconv.FormatInt(profile.ID, 10),
		Email: strings.ToLower(email), DisplayName: displayName, AvatarURL: profile.AvatarURL, Username: profile.Login,
	})
	if err != nil {
		log.Printf("save github user failed: %v", err)
		h.redirectAuthError(w, r, "account_save_failed")
		return
	}
	if err := h.officialOrganizations.BootstrapOfficialOwner(r.Context(), user.ID, profile.Login); err != nil {
		log.Printf("bootstrap official organization owner failed: %v", err)
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

func (h *authHandler) exchangeGitHubCode(r *http.Request, code string) (string, error) {
	form := url.Values{
		"client_id":     {h.config.GitHubClientID},
		"client_secret": {h.config.GitHubClientSecret},
		"code":          {code},
		"redirect_uri":  {h.githubCallbackURL()},
	}
	req, err := http.NewRequestWithContext(r.Context(), http.MethodPost, githubTokenURL, strings.NewReader(form.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("Accept", "application/json")
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
	var token githubTokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&token); err != nil {
		return "", err
	}
	if token.Error != "" {
		return "", fmt.Errorf("token endpoint returned %s", token.Error)
	}
	if token.AccessToken == "" {
		return "", errors.New("token endpoint returned an empty access token")
	}
	return token.AccessToken, nil
}

func (h *authHandler) fetchGitHubUser(r *http.Request, accessToken string) (githubUser, error) {
	var user githubUser
	if err := h.getGitHubJSON(r, githubUserURL, accessToken, &user); err != nil {
		return githubUser{}, err
	}
	return user, nil
}

func (h *authHandler) fetchGitHubPrimaryEmail(r *http.Request, accessToken string) (string, error) {
	var emails []githubEmail
	if err := h.getGitHubJSON(r, githubEmailsURL, accessToken, &emails); err != nil {
		return "", err
	}
	for _, email := range emails {
		if email.Primary && email.Verified && email.Email != "" {
			return email.Email, nil
		}
	}
	return "", errors.New("GitHub account has no verified primary email")
}

func (h *authHandler) getGitHubJSON(r *http.Request, endpoint, accessToken string, target any) error {
	req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, endpoint, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	req.Header.Set("User-Agent", "kairojs.com")
	resp, err := h.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("GitHub API returned %d", resp.StatusCode)
	}
	return json.NewDecoder(resp.Body).Decode(target)
}

func (h *authHandler) githubCallbackURL() string {
	return h.config.PublicURL + "/api/v1/auth/github/callback"
}
