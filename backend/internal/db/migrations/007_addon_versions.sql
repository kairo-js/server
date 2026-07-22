CREATE TABLE IF NOT EXISTS addon_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    addon_id uuid NOT NULL REFERENCES addons(id) ON DELETE CASCADE,
    version text NOT NULL,
    prerelease boolean NOT NULL DEFAULT false,
    file_key text NOT NULL UNIQUE,
    file_name text NOT NULL,
    file_size bigint NOT NULL,
    sha256 text NOT NULL,
    published_by uuid NOT NULL REFERENCES users(id),
    published_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT addon_versions_version_format CHECK (
        version ~ '^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?(\+[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$'
    ),
    CONSTRAINT addon_versions_file_size_positive CHECK (file_size > 0),
    CONSTRAINT addon_versions_sha256_format CHECK (sha256 ~ '^[0-9a-f]{64}$'),
    CONSTRAINT addon_versions_unique UNIQUE (addon_id, version)
);

CREATE INDEX IF NOT EXISTS addon_versions_addon_published_idx
    ON addon_versions (addon_id, published_at DESC);
