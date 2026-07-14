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
)

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
	return IDAvailable, nil
}
