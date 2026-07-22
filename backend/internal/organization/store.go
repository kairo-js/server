package organization

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("organization not found")

const officialOrganizationSlug = "kairo-js"
const officialOwnerGitHubLogin = "shizuku86"

type Organization struct {
	ID          string    `json:"id"`
	Slug        string    `json:"slug"`
	DisplayName string    `json:"displayName"`
	Description string    `json:"description"`
	Official    bool      `json:"official"`
	Verified    bool      `json:"verified"`
	CreatedAt   time.Time `json:"createdAt"`
}

type Membership struct {
	Organization Organization `json:"organization"`
	Role         string       `json:"role"`
}

type Store struct{ pool *pgxpool.Pool }

func NewStore(pool *pgxpool.Pool) *Store { return &Store{pool: pool} }

func (s *Store) BySlug(ctx context.Context, slug string) (Organization, error) {
	var organization Organization
	err := s.pool.QueryRow(ctx, `
		SELECT id, slug, display_name, description, official, verified, created_at
		FROM organizations WHERE slug = $1
	`, slug).Scan(&organization.ID, &organization.Slug, &organization.DisplayName, &organization.Description,
		&organization.Official, &organization.Verified, &organization.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return Organization{}, ErrNotFound
	}
	if err != nil {
		return Organization{}, fmt.Errorf("find organization: %w", err)
	}
	return organization, nil
}

func (s *Store) ForUser(ctx context.Context, userID string) ([]Membership, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT o.id, o.slug, o.display_name, o.description, o.official, o.verified, o.created_at, om.role
		FROM organization_members om
		JOIN organizations o ON o.id = om.organization_id
		WHERE om.user_id = $1
		ORDER BY o.official DESC, o.display_name, o.slug
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("list user organizations: %w", err)
	}
	defer rows.Close()

	memberships := make([]Membership, 0)
	for rows.Next() {
		var membership Membership
		o := &membership.Organization
		if err := rows.Scan(&o.ID, &o.Slug, &o.DisplayName, &o.Description, &o.Official, &o.Verified, &o.CreatedAt, &membership.Role); err != nil {
			return nil, fmt.Errorf("scan user organization: %w", err)
		}
		memberships = append(memberships, membership)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate user organizations: %w", err)
	}
	return memberships, nil
}

func (s *Store) BootstrapOfficialOwner(ctx context.Context, userID, githubLogin string) error {
	if !strings.EqualFold(githubLogin, officialOwnerGitHubLogin) {
		return nil
	}
	command, err := s.pool.Exec(ctx, `
		INSERT INTO organization_members (organization_id, user_id, role)
		SELECT id, $1, 'owner' FROM organizations WHERE slug = $2
		ON CONFLICT (organization_id, user_id) DO UPDATE SET role = 'owner', updated_at = now()
	`, userID, officialOrganizationSlug)
	if err != nil {
		return fmt.Errorf("bootstrap official organization owner: %w", err)
	}
	if command.RowsAffected() != 1 {
		return fmt.Errorf("bootstrap official organization owner: organization missing")
	}
	return nil
}
