package storage

import "testing"

func TestNewR2StoreRequiresConfiguration(t *testing.T) {
	if _, err := NewR2Store(R2Config{}); err == nil {
		t.Fatal("expected missing configuration error")
	}
}

func TestNewR2StoreAcceptsCloudflareEndpoint(t *testing.T) {
	store, err := NewR2Store(R2Config{
		Endpoint:    "https://account-id.r2.cloudflarestorage.com",
		AccessKeyID: "access", SecretAccessKey: "secret", Bucket: "kairo-addons",
	})
	if err != nil {
		t.Fatal(err)
	}
	if store.bucket != "kairo-addons" {
		t.Fatalf("bucket = %q", store.bucket)
	}
}

func TestNewR2StoreRejectsEndpointPath(t *testing.T) {
	_, err := NewR2Store(R2Config{Endpoint: "https://account.r2.cloudflarestorage.com/path", AccessKeyID: "access", SecretAccessKey: "secret", Bucket: "bucket"})
	if err == nil {
		t.Fatal("expected endpoint path error")
	}
}
