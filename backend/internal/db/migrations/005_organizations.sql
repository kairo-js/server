CREATE TABLE IF NOT EXISTS organizations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text NOT NULL,
    display_name text NOT NULL,
    description text NOT NULL DEFAULT '',
    official boolean NOT NULL DEFAULT false,
    verified boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT organizations_slug_format CHECK (slug ~ '^[a-z0-9-]+$'),
    CONSTRAINT organizations_slug_unique UNIQUE (slug)
);

CREATE TABLE IF NOT EXISTS organization_members (
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (organization_id, user_id),
    CONSTRAINT organization_members_role_check CHECK (role IN ('owner', 'admin', 'member'))
);

CREATE INDEX IF NOT EXISTS organization_members_user_id_idx ON organization_members (user_id);

CREATE TABLE IF NOT EXISTS addon_owners (
    addon_id uuid NOT NULL REFERENCES addons(id) ON DELETE CASCADE,
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (addon_id),
    CONSTRAINT addon_owners_exactly_one_owner CHECK (
        (user_id IS NOT NULL AND organization_id IS NULL)
        OR (user_id IS NULL AND organization_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS addon_owners_user_id_idx ON addon_owners (user_id);
CREATE INDEX IF NOT EXISTS addon_owners_organization_id_idx ON addon_owners (organization_id);

INSERT INTO organizations (slug, display_name, description, official, verified)
VALUES ('kairo-js', 'Kairo.js', 'Official organization for Kairo and its ecosystem.', true, true)
ON CONFLICT (slug) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    official = true,
    verified = true,
    updated_at = now();
