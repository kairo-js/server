package addon

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
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

var (
	ErrIDUnavailable        = errors.New("addon ID unavailable")
	ErrOwnerForbidden       = errors.New("addon owner forbidden")
	ErrOrganizationNotFound = errors.New("organization not found")
	ErrAddonNotFound        = errors.New("addon not found")
	ErrVersionExists        = errors.New("addon version already exists")
)

type Version struct {
	Version     string          `json:"version"`
	Prerelease  bool            `json:"prerelease"`
	FileName    string          `json:"fileName"`
	FileSize    int64           `json:"fileSize"`
	SHA256      string          `json:"sha256"`
	PublishedAt time.Time       `json:"publishedAt"`
	Manifest    json.RawMessage `json:"manifest,omitempty"`
	FileKey     string          `json:"-"`
}

type PublishVersionInput struct {
	AddonID, Version, FileKey, FileName, SHA256, UserID string
	FileSize                                            int64
	Prerelease                                          bool
	Manifest                                            json.RawMessage
}

func (s *Store) CanPublish(ctx context.Context, addonID, userID string) error {
	var allowed, exists bool
	err := s.pool.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM addons a JOIN addon_owners ao ON ao.addon_id = a.id
			LEFT JOIN organization_members om ON om.organization_id = ao.organization_id AND om.user_id = $2
			WHERE a.normalized_id = lower($1)
			AND (ao.user_id = $2 OR om.role IN ('owner', 'admin'))
		), EXISTS (SELECT 1 FROM addons WHERE normalized_id = lower($1))
	`, addonID, userID).Scan(&allowed, &exists)
	if err != nil {
		return fmt.Errorf("check publish permission: %w", err)
	}
	if allowed {
		return nil
	}
	if !exists {
		return ErrAddonNotFound
	}
	return ErrOwnerForbidden
}

func (s *Store) PublishVersion(ctx context.Context, input PublishVersionInput) (Version, error) {
	var result Version
	err := s.pool.QueryRow(ctx, `
		INSERT INTO addon_versions (addon_id, version, prerelease, file_key, file_name, file_size, sha256, published_by, manifest)
		SELECT id, $2, $3, $4, $5, $6, $7, $8, $9 FROM addons WHERE normalized_id = lower($1)
		RETURNING version, prerelease, file_name, file_size, sha256, published_at, manifest, file_key
	`, input.AddonID, input.Version, input.Prerelease, input.FileKey, input.FileName, input.FileSize, input.SHA256, input.UserID, input.Manifest).
		Scan(&result.Version, &result.Prerelease, &result.FileName, &result.FileSize, &result.SHA256, &result.PublishedAt, &result.Manifest, &result.FileKey)
	if errors.Is(err, pgx.ErrNoRows) {
		return Version{}, ErrAddonNotFound
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return Version{}, ErrVersionExists
	}
	if err != nil {
		return Version{}, fmt.Errorf("publish addon version: %w", err)
	}
	return result, nil
}

func (s *Store) Version(ctx context.Context, addonID, version string) (Version, error) {
	var result Version
	err := s.pool.QueryRow(ctx, `SELECT av.version, av.prerelease, av.file_name, av.file_size, av.sha256, av.published_at, av.manifest, av.file_key
		FROM addon_versions av JOIN addons a ON a.id = av.addon_id
		WHERE a.normalized_id = lower($1) AND av.version = $2 AND a.status = 'active'`, addonID, version).
		Scan(&result.Version, &result.Prerelease, &result.FileName, &result.FileSize, &result.SHA256, &result.PublishedAt, &result.Manifest, &result.FileKey)
	if errors.Is(err, pgx.ErrNoRows) {
		return Version{}, ErrAddonNotFound
	}
	if err != nil {
		return Version{}, fmt.Errorf("read addon version: %w", err)
	}
	return result, nil
}

func (s *Store) Versions(ctx context.Context, addonID string) ([]Version, error) {
	rows, err := s.pool.Query(ctx, `SELECT av.version, av.prerelease, av.file_name, av.file_size, av.sha256, av.published_at, av.manifest, av.file_key
		FROM addon_versions av JOIN addons a ON a.id = av.addon_id
		WHERE a.normalized_id = lower($1) AND a.status = 'active'
		ORDER BY av.published_at DESC`, addonID)
	if err != nil {
		return nil, fmt.Errorf("list addon versions: %w", err)
	}
	defer rows.Close()
	versions := make([]Version, 0)
	for rows.Next() {
		var version Version
		if err := rows.Scan(&version.Version, &version.Prerelease, &version.FileName, &version.FileSize, &version.SHA256, &version.PublishedAt, &version.Manifest, &version.FileKey); err != nil {
			return nil, fmt.Errorf("scan addon version: %w", err)
		}
		versions = append(versions, version)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list addon versions: %w", err)
	}
	if len(versions) == 0 {
		var exists bool
		if err := s.pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM addons WHERE normalized_id = lower($1) AND status = 'active')`, addonID).Scan(&exists); err != nil {
			return nil, fmt.Errorf("check addon: %w", err)
		}
		if !exists {
			return nil, ErrAddonNotFound
		}
	}
	return versions, nil
}

func (s *Store) LatestVersion(ctx context.Context, addonID, channel string) (Version, error) {
	var result Version
	query := `SELECT av.version, av.prerelease, av.file_name, av.file_size, av.sha256, av.published_at, av.manifest, av.file_key
		FROM addon_versions av JOIN addons a ON a.id = av.addon_id
		WHERE a.normalized_id = lower($1) AND a.status = 'active'`
	args := []any{addonID}
	switch channel {
	case "stable":
		query += ` AND av.prerelease = false ORDER BY av.published_at DESC`
	case "beta":
		query += ` AND av.prerelease = true
			AND split_part(split_part(av.version, '-', 2), '.', 1) = $2
			ORDER BY av.published_at DESC`
		args = append(args, channel)
	default:
		query += ` ORDER BY av.prerelease ASC, av.published_at DESC`
	}
	query += ` LIMIT 1`
	err := s.pool.QueryRow(ctx, query, args...).
		Scan(&result.Version, &result.Prerelease, &result.FileName, &result.FileSize, &result.SHA256, &result.PublishedAt, &result.Manifest, &result.FileKey)
	if errors.Is(err, pgx.ErrNoRows) {
		return Version{}, ErrAddonNotFound
	}
	if err != nil {
		return Version{}, fmt.Errorf("read latest addon version: %w", err)
	}
	return result, nil
}

type Owner struct {
	Type string `json:"type"`
	Slug string `json:"slug,omitempty"`
}

type Addon struct {
	ID          string    `json:"id"`
	AddonID     string    `json:"addonId"`
	DisplayName string    `json:"displayName"`
	Description string    `json:"description"`
	Status      string    `json:"status"`
	Owner       Owner     `json:"owner"`
	CreatedAt   time.Time `json:"createdAt"`
}

type CreateAddonInput struct {
	AddonID, DisplayName, Description, UserID, OwnerType, OrganizationSlug string
}

func (s *Store) Addons(ctx context.Context) ([]Addon, error) {
	rows, err := s.pool.Query(ctx, `SELECT a.id, a.addon_id, a.display_name, a.description, a.status, a.created_at,
		CASE WHEN ao.organization_id IS NULL THEN 'user' ELSE 'organization' END,
		COALESCE(o.slug, '')
		FROM addons a
		JOIN addon_owners ao ON ao.addon_id = a.id
		LEFT JOIN organizations o ON o.id = ao.organization_id
		WHERE a.status = 'active'
		ORDER BY a.created_at DESC`)
	if err != nil {
		return nil, fmt.Errorf("list addons: %w", err)
	}
	defer rows.Close()
	addons := make([]Addon, 0)
	for rows.Next() {
		var result Addon
		var ownerType, ownerSlug string
		if err := rows.Scan(&result.ID, &result.AddonID, &result.DisplayName, &result.Description, &result.Status, &result.CreatedAt, &ownerType, &ownerSlug); err != nil {
			return nil, fmt.Errorf("scan addon: %w", err)
		}
		result.Owner = Owner{Type: ownerType, Slug: ownerSlug}
		addons = append(addons, result)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list addons: %w", err)
	}
	return addons, nil
}

func (s *Store) Addon(ctx context.Context, addonID string) (Addon, error) {
	var result Addon
	var ownerType, ownerSlug string
	err := s.pool.QueryRow(ctx, `SELECT a.id, a.addon_id, a.display_name, a.description, a.status, a.created_at,
		CASE WHEN ao.organization_id IS NULL THEN 'user' ELSE 'organization' END,
		COALESCE(o.slug, '')
		FROM addons a
		JOIN addon_owners ao ON ao.addon_id = a.id
		LEFT JOIN organizations o ON o.id = ao.organization_id
		WHERE a.normalized_id = lower($1) AND a.status = 'active'`, addonID).
		Scan(&result.ID, &result.AddonID, &result.DisplayName, &result.Description, &result.Status, &result.CreatedAt, &ownerType, &ownerSlug)
	if errors.Is(err, pgx.ErrNoRows) {
		return Addon{}, ErrAddonNotFound
	}
	if err != nil {
		return Addon{}, fmt.Errorf("read addon: %w", err)
	}
	result.Owner = Owner{Type: ownerType, Slug: ownerSlug}
	return result, nil
}

func NewStore(pool *pgxpool.Pool) *Store {
	return &Store{pool: pool}
}

func (s *Store) Create(ctx context.Context, input CreateAddonInput) (Addon, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return Addon{}, fmt.Errorf("begin create addon: %w", err)
	}
	defer tx.Rollback(ctx)

	var organizationID string
	owner := Owner{Type: "user"}
	if input.OwnerType == "organization" {
		var role string
		err := tx.QueryRow(ctx, `
			SELECT o.id, COALESCE(om.role, '')
			FROM organizations o
			LEFT JOIN organization_members om ON om.organization_id = o.id AND om.user_id = $2
			WHERE o.slug = $1
		`, input.OrganizationSlug, input.UserID).Scan(&organizationID, &role)
		if errors.Is(err, pgx.ErrNoRows) {
			return Addon{}, ErrOrganizationNotFound
		}
		if err != nil {
			return Addon{}, fmt.Errorf("resolve addon organization owner: %w", err)
		}
		if role != "owner" && role != "admin" {
			return Addon{}, ErrOwnerForbidden
		}
		owner = Owner{Type: "organization", Slug: input.OrganizationSlug}
	}

	var reserved bool
	if err := tx.QueryRow(ctx, "SELECT EXISTS (SELECT 1 FROM reserved_addon_ids WHERE normalized_id = $1)", input.AddonID).Scan(&reserved); err != nil {
		return Addon{}, fmt.Errorf("check addon ID reservation: %w", err)
	}
	if reserved && !(input.OwnerType == "organization" && input.OrganizationSlug == "kairo-js") {
		return Addon{}, ErrIDUnavailable
	}

	var result Addon
	err = tx.QueryRow(ctx, `
		INSERT INTO addons (addon_id, display_name, description)
		VALUES ($1, $2, $3)
		RETURNING id, addon_id, display_name, description, status, created_at
	`, input.AddonID, input.DisplayName, input.Description).Scan(&result.ID, &result.AddonID, &result.DisplayName, &result.Description, &result.Status, &result.CreatedAt)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return Addon{}, ErrIDUnavailable
		}
		return Addon{}, fmt.Errorf("insert addon: %w", err)
	}

	if input.OwnerType == "organization" {
		_, err = tx.Exec(ctx, "INSERT INTO addon_owners (addon_id, organization_id) VALUES ($1, $2)", result.ID, organizationID)
	} else {
		_, err = tx.Exec(ctx, "INSERT INTO addon_owners (addon_id, user_id) VALUES ($1, $2)", result.ID, input.UserID)
	}
	if err != nil {
		return Addon{}, fmt.Errorf("insert addon owner: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return Addon{}, fmt.Errorf("commit create addon: %w", err)
	}
	result.Owner = owner
	return result, nil
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
