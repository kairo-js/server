package api

import (
	"archive/zip"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

const validRegistryManifest = `{
  "schemaVersion": 1,
  "addonId": "game-manager",
  "version": "1.2.0",
  "minimumEngineVersion": "1.26.0",
  "minecraftDependencies": {"@minecraft/server": "2.8.0"},
  "dependencies": {"kairo": "^1.0.0", "kairo-database": "^1.0.0"},
  "optionalDependencies": {"additional-roles-1": "^1.0.0"}
}`

func TestParseRegistryManifest(t *testing.T) {
	raw, err := parseRegistryManifest(validRegistryManifest, "game-manager", "1.2.0")
	if err != nil {
		t.Fatal(err)
	}
	var manifest registryManifest
	if err := json.Unmarshal(raw, &manifest); err != nil {
		t.Fatal(err)
	}
	if manifest.MinimumEngineVersion != "1.26.0" || manifest.Dependencies["kairo"] != "^1.0.0" {
		t.Fatalf("manifest = %+v", manifest)
	}
}

func TestParseRegistryManifestRejectsIdentityMismatch(t *testing.T) {
	if _, err := parseRegistryManifest(validRegistryManifest, "other-addon", "1.2.0"); err == nil {
		t.Fatal("expected add-on ID mismatch to fail")
	}
	if _, err := parseRegistryManifest(validRegistryManifest, "game-manager", "2.0.0"); err == nil {
		t.Fatal("expected version mismatch to fail")
	}
}

func TestParseRegistryManifestRequiresKairoDependencies(t *testing.T) {
	raw := `{"schemaVersion":1,"addonId":"example","version":"1.0.0","minimumEngineVersion":"1.26.0","dependencies":{}}`
	if _, err := parseRegistryManifest(raw, "example", "1.0.0"); err == nil {
		t.Fatal("expected missing Kairo dependencies to fail")
	}
}

func TestParseRegistryManifestAllowsKairoDependencyRoot(t *testing.T) {
	raw := `{"schemaVersion":1,"addonId":"kairo","version":"1.0.0-beta.3","minimumEngineVersion":"1.21.132","optionalDependencies":{"kairo-database":"^1.0.0"}}`
	if _, err := parseRegistryManifest(raw, "kairo", "1.0.0-beta.3"); err != nil {
		t.Fatal(err)
	}
}

func TestParseRegistryManifestAllowsKairoDatabaseWithKairoDependency(t *testing.T) {
	raw := `{"schemaVersion":1,"addonId":"kairo-database","version":"1.0.0-beta.4","minimumEngineVersion":"1.21.132","dependencies":{"kairo":"*"}}`
	if _, err := parseRegistryManifest(raw, "kairo-database", "1.0.0-beta.4"); err != nil {
		t.Fatal(err)
	}
}

func TestParseRegistryManifestRejectsSelfDependency(t *testing.T) {
	raw := `{"schemaVersion":1,"addonId":"kairo","version":"1.0.0","minimumEngineVersion":"1.21.132","dependencies":{"kairo":"*"}}`
	if _, err := parseRegistryManifest(raw, "kairo", "1.0.0"); err == nil {
		t.Fatal("expected self dependency to fail")
	}
}

func writeTestZip(t *testing.T, name string) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), "addon.zip")
	file, err := os.Create(path)
	if err != nil {
		t.Fatal(err)
	}
	archive := zip.NewWriter(file)
	entry, err := archive.Create(name)
	if err == nil {
		_, err = entry.Write([]byte("test"))
	}
	if closeErr := archive.Close(); err == nil {
		err = closeErr
	}
	if closeErr := file.Close(); err == nil {
		err = closeErr
	}
	if err != nil {
		t.Fatal(err)
	}
	return path
}

func TestValidateZipAcceptsArchive(t *testing.T) {
	if err := validateZip(writeTestZip(t, "MyAddonBP/manifest.json")); err != nil {
		t.Fatal(err)
	}
}

func TestValidateZipRejectsTraversal(t *testing.T) {
	err := validateZip(writeTestZip(t, "../../../escape.txt"))
	if err == nil || !strings.Contains(err.Error(), "unsafe") {
		t.Fatalf("error = %v", err)
	}
}

func TestVersionObjectKeyIsScoped(t *testing.T) {
	key, err := versionObjectKey("kairo", "1.0.0-beta.1")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(key, "addons/kairo/1.0.0-beta.1/") || !strings.HasSuffix(key, ".zip") {
		t.Fatalf("key = %q", key)
	}
}
