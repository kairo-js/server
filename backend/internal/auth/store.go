package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const SessionLifetime = 30 * 24 * time.Hour

var ErrSessionNotFound = errors.New("session not found")
var ErrAPITokenNotFound = errors.New("API token not found")

type User struct {
	ID          string    `json:"id"`
	Email       string    `json:"email"`
	DisplayName string    `json:"displayName"`
	AvatarURL   *string   `json:"avatarUrl"`
	CreatedAt   time.Time `json:"createdAt"`
}

type OAuthProfile struct {
	Provider    string
	ID          string
	Email       string
	DisplayName string
	AvatarURL   string
	Username    string
}

type Store struct {
	pool *pgxpool.Pool
}

func NewStore(pool *pgxpool.Pool) *Store {
	return &Store{pool: pool}
}

func (s *Store) UpsertOAuthUser(ctx context.Context, profile OAuthProfile) (User, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return User{}, err
	}
	defer tx.Rollback(ctx)

	var user User
	err = tx.QueryRow(ctx, `
		SELECT u.id, u.email, u.display_name, u.avatar_url, u.created_at
		FROM users u
		JOIN oauth_accounts oa ON oa.user_id = u.id
		WHERE oa.provider = $1 AND oa.provider_user_id = $2
	`, profile.Provider, profile.ID).Scan(&user.ID, &user.Email, &user.DisplayName, &user.AvatarURL, &user.CreatedAt)

	if errors.Is(err, pgx.ErrNoRows) {
		err = tx.QueryRow(ctx, `
			INSERT INTO users (email, display_name, avatar_url)
			VALUES ($1, $2, NULLIF($3, ''))
			ON CONFLICT (email) DO UPDATE SET
				display_name = EXCLUDED.display_name,
				avatar_url = EXCLUDED.avatar_url,
				updated_at = now()
			RETURNING id, email, display_name, avatar_url, created_at
		`, profile.Email, profile.DisplayName, profile.AvatarURL).
			Scan(&user.ID, &user.Email, &user.DisplayName, &user.AvatarURL, &user.CreatedAt)
		if err != nil {
			return User{}, fmt.Errorf("upsert user: %w", err)
		}

		_, err = tx.Exec(ctx, `
			INSERT INTO oauth_accounts (provider, provider_user_id, user_id, email, provider_login)
			VALUES ($1, $2, $3, $4, NULLIF($5, ''))
		`, profile.Provider, profile.ID, user.ID, profile.Email, profile.Username)
		if err != nil {
			return User{}, fmt.Errorf("create oauth account: %w", err)
		}
	} else if err != nil {
		return User{}, fmt.Errorf("find oauth account: %w", err)
	} else {
		err = tx.QueryRow(ctx, `
			UPDATE users SET email = $2, display_name = $3, avatar_url = NULLIF($4, ''), updated_at = now()
			WHERE id = $1
			RETURNING id, email, display_name, avatar_url, created_at
		`, user.ID, profile.Email, profile.DisplayName, profile.AvatarURL).
			Scan(&user.ID, &user.Email, &user.DisplayName, &user.AvatarURL, &user.CreatedAt)
		if err != nil {
			return User{}, fmt.Errorf("update user: %w", err)
		}
		_, err = tx.Exec(ctx, `
			UPDATE oauth_accounts SET email = $3, provider_login = NULLIF($4, ''), updated_at = now()
			WHERE provider = $1 AND provider_user_id = $2
		`, profile.Provider, profile.ID, profile.Email, profile.Username)
		if err != nil {
			return User{}, fmt.Errorf("update oauth account: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return User{}, err
	}
	return user, nil
}

func (s *Store) CreateSession(ctx context.Context, userID string) (string, time.Time, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", time.Time{}, err
	}
	token := base64.RawURLEncoding.EncodeToString(raw)
	hash := sha256.Sum256([]byte(token))
	expiresAt := time.Now().Add(SessionLifetime)

	_, err := s.pool.Exec(ctx, `
		INSERT INTO sessions (user_id, token_hash, expires_at)
		VALUES ($1, $2, $3)
	`, userID, hash[:], expiresAt)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("create session: %w", err)
	}
	return token, expiresAt, nil
}

func (s *Store) UserBySession(ctx context.Context, token string) (User, error) {
	hash := sha256.Sum256([]byte(token))
	var user User
	err := s.pool.QueryRow(ctx, `
		SELECT u.id, u.email, u.display_name, u.avatar_url, u.created_at
		FROM sessions s JOIN users u ON u.id = s.user_id
		WHERE s.token_hash = $1 AND s.expires_at > now()
	`, hash[:]).Scan(&user.ID, &user.Email, &user.DisplayName, &user.AvatarURL, &user.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return User{}, ErrSessionNotFound
	}
	if err != nil {
		return User{}, err
	}
	_, _ = s.pool.Exec(ctx, "UPDATE sessions SET last_seen_at = now() WHERE token_hash = $1", hash[:])
	return user, nil
}

func (s *Store) DeleteSession(ctx context.Context, token string) error {
	hash := sha256.Sum256([]byte(token))
	_, err := s.pool.Exec(ctx, "DELETE FROM sessions WHERE token_hash = $1", hash[:])
	return err
}

type APIToken struct {
	ID         string     `json:"id"`
	Name       string     `json:"name"`
	LastUsedAt *time.Time `json:"lastUsedAt"`
	ExpiresAt  *time.Time `json:"expiresAt"`
	CreatedAt  time.Time  `json:"createdAt"`
}

func (s *Store) CreateAPIToken(ctx context.Context, userID, name string) (APIToken, string, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return APIToken{}, "", err
	}
	token := "kairo_" + base64.RawURLEncoding.EncodeToString(raw)
	hash := sha256.Sum256([]byte(token))
	var result APIToken
	err := s.pool.QueryRow(ctx, `INSERT INTO api_tokens (user_id, name, token_hash) VALUES ($1, $2, $3)
		RETURNING id, name, last_used_at, expires_at, created_at`, userID, name, hash[:]).
		Scan(&result.ID, &result.Name, &result.LastUsedAt, &result.ExpiresAt, &result.CreatedAt)
	if err != nil {
		return APIToken{}, "", fmt.Errorf("create API token: %w", err)
	}
	return result, token, nil
}

func (s *Store) UserByAPIToken(ctx context.Context, token string) (User, error) {
	hash := sha256.Sum256([]byte(token))
	var user User
	err := s.pool.QueryRow(ctx, `SELECT u.id, u.email, u.display_name, u.avatar_url, u.created_at
		FROM api_tokens t JOIN users u ON u.id = t.user_id
		WHERE t.token_hash = $1 AND (t.expires_at IS NULL OR t.expires_at > now())`, hash[:]).
		Scan(&user.ID, &user.Email, &user.DisplayName, &user.AvatarURL, &user.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return User{}, ErrAPITokenNotFound
	}
	if err != nil {
		return User{}, err
	}
	_, _ = s.pool.Exec(ctx, "UPDATE api_tokens SET last_used_at = now() WHERE token_hash = $1", hash[:])
	return user, nil
}

func (s *Store) DeleteAPIToken(ctx context.Context, userID, tokenID string) error {
	result, err := s.pool.Exec(ctx, "DELETE FROM api_tokens WHERE id = $1 AND user_id = $2", tokenID, userID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrAPITokenNotFound
	}
	return nil
}
