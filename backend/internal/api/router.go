package api

import (
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kairo-js/server/backend/internal/addon"
	"github.com/kairo-js/server/backend/internal/auth"
	"github.com/kairo-js/server/backend/internal/organization"
	objectstorage "github.com/kairo-js/server/backend/internal/storage"
)

type Config struct {
	AppEnv             string
	PublicURL          string
	GoogleClientID     string
	GoogleClientSecret string
	GitHubClientID     string
	GitHubClientSecret string
	StoragePath        string
	StorageDriver      string
	R2Endpoint         string
	R2AccessKeyID      string
	R2SecretAccessKey  string
	R2Bucket           string
}

func NewRouter(pool *pgxpool.Pool, config Config) http.Handler {
	mux := http.NewServeMux()
	config.PublicURL = strings.TrimRight(config.PublicURL, "/")
	organizationStore := organization.NewStore(pool)
	var objects objectstorage.Store
	var err error
	switch config.StorageDriver {
	case "", "filesystem":
		if config.StoragePath == "" {
			config.StoragePath = "./data/addons"
		}
		objects, err = objectstorage.NewFileStore(config.StoragePath)
	case "r2":
		objects, err = objectstorage.NewR2Store(objectstorage.R2Config{Endpoint: config.R2Endpoint, AccessKeyID: config.R2AccessKeyID, SecretAccessKey: config.R2SecretAccessKey, Bucket: config.R2Bucket})
	default:
		panic("initialize object storage: unsupported STORAGE_DRIVER " + config.StorageDriver)
	}
	if err != nil {
		panic("initialize object storage: " + err.Error())
	}
	authAPI := &authHandler{
		store: auth.NewStore(pool), officialOrganizations: organizationStore, config: config,
		httpClient: &http.Client{Timeout: 10 * time.Second},
	}
	addonStore := addon.NewStore(pool)
	addonIDs := &addonIDHandler{checker: addonStore}
	developmentProjects := &developmentProjectHandler{recorder: addonStore}
	addons := &addonHandler{store: addonStore, reader: addonStore, sessions: authAPI.store}
	organizations := &organizationHandler{store: organizationStore, sessions: authAPI.store}
	versions := &versionHandler{store: addonStore, sessions: authAPI.store, objects: objects}
	tokens := &tokenHandler{store: authAPI.store, sessions: authAPI.store}

	mux.HandleFunc("GET /api/health", HealthHandler)
	mux.HandleFunc("GET /api/health/db", DBHealthHandler(pool))
	mux.HandleFunc("GET /api/v1/auth/google", authAPI.googleLogin)
	mux.HandleFunc("GET /api/v1/auth/google/callback", authAPI.googleCallback)
	mux.HandleFunc("GET /api/v1/auth/github", authAPI.githubLogin)
	mux.HandleFunc("GET /api/v1/auth/github/callback", authAPI.githubCallback)
	mux.HandleFunc("GET /api/v1/me", authAPI.me)
	mux.HandleFunc("POST /api/v1/logout", authAPI.logout)
	mux.HandleFunc("GET /api/v1/addon-ids/{id}/availability", addonIDs.availability)
	mux.HandleFunc("GET /api/v1/tokens", tokens.list)
	mux.HandleFunc("POST /api/v1/tokens", tokens.create)
	mux.HandleFunc("DELETE /api/v1/tokens/{id}", tokens.revoke)
	mux.HandleFunc("POST /api/v1/development-projects/generated", developmentProjects.generated)
	mux.HandleFunc("POST /api/v1/addons", addons.create)
	mux.HandleFunc("GET /api/v1/addons/{id}", addons.get)
	mux.HandleFunc("GET /api/v1/addons/{id}/versions", addons.versions)
	mux.HandleFunc("GET /api/v1/addons/{id}/versions/latest", addons.latestVersion)
	mux.HandleFunc("POST /api/v1/addons/{id}/versions", versions.publish)
	mux.HandleFunc("GET /api/v1/addons/{id}/versions/{version}/download", versions.download)
	mux.HandleFunc("GET /api/v1/addons/{id}/{version}/download", versions.download)
	mux.HandleFunc("GET /api/v1/organizations/mine", organizations.mine)
	mux.HandleFunc("GET /api/v1/organizations/{slug}", organizations.get)

	return mux
}
