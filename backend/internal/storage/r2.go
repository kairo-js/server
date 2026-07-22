package storage

import (
	"context"
	"fmt"
	"io"
	"net/url"
	"strings"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type R2Config struct {
	Endpoint, AccessKeyID, SecretAccessKey, Bucket string
}

type R2Store struct {
	client *minio.Client
	bucket string
}

func NewR2Store(config R2Config) (*R2Store, error) {
	if config.Endpoint == "" || config.AccessKeyID == "" || config.SecretAccessKey == "" || config.Bucket == "" {
		return nil, fmt.Errorf("R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET are required")
	}
	endpoint := strings.TrimSpace(config.Endpoint)
	secure := true
	if parsed, err := url.Parse(endpoint); err == nil && parsed.Host != "" {
		if parsed.Path != "" && parsed.Path != "/" {
			return nil, fmt.Errorf("R2 endpoint must not contain a path")
		}
		endpoint, secure = parsed.Host, parsed.Scheme != "http"
	} else {
		endpoint = strings.TrimSuffix(endpoint, "/")
	}
	client, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(config.AccessKeyID, config.SecretAccessKey, ""),
		Secure: secure,
		Region: "auto",
	})
	if err != nil {
		return nil, fmt.Errorf("create R2 client: %w", err)
	}
	return &R2Store{client: client, bucket: config.Bucket}, nil
}

func (s *R2Store) Put(ctx context.Context, key string, source io.Reader, size int64) error {
	if size <= 0 {
		return fmt.Errorf("object size must be positive")
	}
	_, err := s.client.PutObject(ctx, s.bucket, key, source, size, minio.PutObjectOptions{ContentType: "application/zip"})
	if err != nil {
		return fmt.Errorf("put R2 object: %w", err)
	}
	return nil
}

func (s *R2Store) Open(ctx context.Context, key string) (io.ReadCloser, error) {
	object, err := s.client.GetObject(ctx, s.bucket, key, minio.GetObjectOptions{})
	if err != nil {
		return nil, fmt.Errorf("get R2 object: %w", err)
	}
	// GetObject is lazy; Stat performs the request now so HTTP handlers can still return a JSON error.
	if _, err := object.Stat(); err != nil {
		object.Close()
		return nil, fmt.Errorf("stat R2 object: %w", err)
	}
	return object, nil
}

func (s *R2Store) Delete(ctx context.Context, key string) error {
	if err := s.client.RemoveObject(ctx, s.bucket, key, minio.RemoveObjectOptions{}); err != nil {
		return fmt.Errorf("delete R2 object: %w", err)
	}
	return nil
}
