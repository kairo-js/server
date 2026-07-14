CREATE TABLE IF NOT EXISTS addons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    addon_id text NOT NULL,
    normalized_id text GENERATED ALWAYS AS (lower(addon_id)) STORED,
    display_name text NOT NULL,
    description text NOT NULL DEFAULT '',
    status text NOT NULL DEFAULT 'active',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT addons_addon_id_format CHECK (addon_id ~ '^[A-Za-z0-9-]+$'),
    CONSTRAINT addons_status_check CHECK (status IN ('active', 'hidden', 'yanked')),
    CONSTRAINT addons_normalized_id_unique UNIQUE (normalized_id)
);

CREATE TABLE IF NOT EXISTS reserved_addon_ids (
    normalized_id text PRIMARY KEY,
    reason text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT reserved_addon_ids_format CHECK (normalized_id ~ '^[a-z0-9-]+$')
);

INSERT INTO reserved_addon_ids (normalized_id, reason)
VALUES
    ('kairo', 'Official Kairo package'),
    ('kairo-database', 'Official Kairo package')
ON CONFLICT (normalized_id) DO NOTHING;
