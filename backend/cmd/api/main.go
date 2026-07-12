package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"github.com/kairo-js/server/backend/internal/api"
	"github.com/kairo-js/server/backend/internal/db"
)

func main() {
	port := getEnv("PORT", "8000")

	databaseURL := db.BuildURL(
		getEnv("POSTGRES_HOST", "postgres"),
		getEnv("POSTGRES_PORT", "5432"),
		getEnv("POSTGRES_USER", "kairo"),
		os.Getenv("POSTGRES_PASSWORD"),
		getEnv("POSTGRES_DB", "kairo"),
	)

	pool, err := db.Connect(context.Background(), databaseURL)
	if err != nil {
		log.Fatalf("failed to set up db pool: %v", err)
	}
	defer pool.Close()
	if err := db.Migrate(context.Background(), pool); err != nil {
		log.Fatalf("failed to migrate database: %v", err)
	}

	router := api.NewRouter(pool, api.Config{
		AppEnv:             getEnv("APP_ENV", "dev"),
		PublicURL:          getEnv("PUBLIC_URL", "http://localhost:3000"),
		GoogleClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		GoogleClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		GitHubClientID:     os.Getenv("GITHUB_CLIENT_ID"),
		GitHubClientSecret: os.Getenv("GITHUB_CLIENT_SECRET"),
	})

	log.Printf("starting server on :%s", port)
	if err := http.ListenAndServe(":"+port, router); err != nil {
		log.Fatal(err)
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
