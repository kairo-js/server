package storage

import (
	"context"
	"io"
	"strings"
	"testing"
)

func TestFileStoreRoundTrip(t *testing.T) {
	store, err := NewFileStore(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	if err := store.Put(context.Background(), "addons/test/file.zip", strings.NewReader("archive"), 7); err != nil {
		t.Fatal(err)
	}
	file, err := store.Open(context.Background(), "addons/test/file.zip")
	if err != nil {
		t.Fatal(err)
	}
	content, err := io.ReadAll(file)
	file.Close()
	if err != nil || string(content) != "archive" {
		t.Fatalf("content = %q, err = %v", content, err)
	}
	if err := store.Delete(context.Background(), "addons/test/file.zip"); err != nil {
		t.Fatal(err)
	}
}

func TestFileStoreRejectsTraversal(t *testing.T) {
	store, err := NewFileStore(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	if err := store.Put(context.Background(), "../escape", strings.NewReader("bad"), 3); err == nil {
		t.Fatal("expected traversal error")
	}
}
