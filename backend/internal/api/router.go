package api

import (
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kairo-js/server/backend/internal/addon"
	"github.com/kairo-js/server/backend/internal/auth"
)

type Config struct {
	AppEnv             string
	PublicURL          string
	GoogleClientID     string
	GoogleClientSecret string
	GitHubClientID     string
	GitHubClientSecret string
}

func NewRouter(pool *pgxpool.Pool, config Config) http.Handler {
	mux := http.NewServeMux()
	config.PublicURL = strings.TrimRight(config.PublicURL, "/")
	authAPI := &authHandler{
		store: auth.NewStore(pool), config: config,
		httpClient: &http.Client{Timeout: 10 * time.Second},
	}
	addonIDs := &addonIDHandler{checker: addon.NewStore(pool)}

	mux.HandleFunc("GET /api/health", HealthHandler)
	mux.HandleFunc("GET /api/health/db", DBHealthHandler(pool))
	mux.HandleFunc("GET /api/v1/auth/google", authAPI.googleLogin)
	mux.HandleFunc("GET /api/v1/auth/google/callback", authAPI.googleCallback)
	mux.HandleFunc("GET /api/v1/auth/github", authAPI.githubLogin)
	mux.HandleFunc("GET /api/v1/auth/github/callback", authAPI.githubCallback)
	mux.HandleFunc("GET /api/v1/me", authAPI.me)
	mux.HandleFunc("POST /api/v1/logout", authAPI.logout)
	mux.HandleFunc("GET /api/v1/addon-ids/{id}/availability", addonIDs.availability)

	return mux
}
