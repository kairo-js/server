package api

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
)

func NewRouter(pool *pgxpool.Pool) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/health", HealthHandler)
	mux.HandleFunc("GET /api/health/db", DBHealthHandler(pool))

	return mux
}
