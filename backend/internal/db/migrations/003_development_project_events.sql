CREATE TABLE IF NOT EXISTS addon_id_intents (
    normalized_id text NOT NULL,
    anonymous_key_hash text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    PRIMARY KEY (normalized_id, anonymous_key_hash),
    CONSTRAINT addon_id_intents_format CHECK (normalized_id ~ '^[a-z0-9-]+$')
);

CREATE INDEX IF NOT EXISTS addon_id_intents_active_id_idx ON addon_id_intents (normalized_id, expires_at);

CREATE TABLE IF NOT EXISTS project_generation_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    language text NOT NULL,
    runtime text NOT NULL,
    github_enabled boolean NOT NULL,
    package_manager text NOT NULL,
    prettier_enabled boolean NOT NULL,
    eslint_enabled boolean NOT NULL,
    readme_enabled boolean NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT project_generation_language_check CHECK (language IN ('javascript', 'typescript')),
    CONSTRAINT project_generation_runtime_check CHECK (runtime IN ('node')),
    CONSTRAINT project_generation_package_manager_check CHECK (package_manager IN ('npm', 'pnpm', 'none'))
);
