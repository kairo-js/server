package addon

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type IDStatus string

const (
	IDAvailable IDStatus = "available"
	IDTaken     IDStatus = "taken"
	IDReserved  IDStatus = "reserved"
	IDIntent    IDStatus = "intent"
)

type ProjectGeneration struct {
	NormalizedID, AnonymousKeyHash, Platform, Language, Runtime, PackageManager string
	GitHubEnabled, PrettierEnabled, ESLintEnabled, ReadmeEnabled                bool
}

type IDChecker interface {
	IDStatus(ctx context.Context, normalizedID string) (IDStatus, error)
}

type Store struct {
	pool *pgxpool.Pool
}

func NewStore(pool *pgxpool.Pool) *Store {
	return &Store{pool: pool}
}

func (s *Store) IDStatus(ctx context.Context, normalizedID string) (IDStatus, error) {
	var reserved bool
	if err := s.pool.QueryRow(ctx,
		"SELECT EXISTS (SELECT 1 FROM reserved_addon_ids WHERE normalized_id = $1)",
		normalizedID,
	).Scan(&reserved); err != nil {
		return "", fmt.Errorf("check reserved addon ID: %w", err)
	}
	if reserved {
		return IDReserved, nil
	}

	var id string
	err := s.pool.QueryRow(ctx,
		"SELECT normalized_id FROM addons WHERE normalized_id = $1",
		normalizedID,
	).Scan(&id)
	if err == nil {
		return IDTaken, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return "", fmt.Errorf("check addon ID: %w", err)
	}
	var intended bool
	if err := s.pool.QueryRow(ctx,
		"SELECT EXISTS (SELECT 1 FROM addon_id_intents WHERE normalized_id = $1 AND expires_at > now())",
		normalizedID,
	).Scan(&intended); err != nil {
		return "", fmt.Errorf("check addon ID intents: %w", err)
	}
	if intended {
		return IDIntent, nil
	}
	return IDAvailable, nil
}

func (s *Store) RecordProjectGeneration(ctx context.Context, event ProjectGeneration) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin project generation event: %w", err)
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx, `
		INSERT INTO addon_id_intents (normalized_id, anonymous_key_hash, expires_at)
		VALUES ($1, $2, now() + interval '90 days')
		ON CONFLICT (normalized_id, anonymous_key_hash) DO UPDATE
		SET updated_at = now(), expires_at = EXCLUDED.expires_at`, event.NormalizedID, event.AnonymousKeyHash); err != nil {
		return fmt.Errorf("record addon ID intent: %w", err)
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO project_generation_events
		(platform, language, runtime, github_enabled, package_manager, prettier_enabled, eslint_enabled, readme_enabled)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, event.Platform, event.Language, event.Runtime, event.GitHubEnabled,
		event.PackageManager, event.PrettierEnabled, event.ESLintEnabled, event.ReadmeEnabled); err != nil {
		return fmt.Errorf("record project generation statistics: %w", err)
	}
	return tx.Commit(ctx)
}
