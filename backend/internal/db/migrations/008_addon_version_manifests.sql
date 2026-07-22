ALTER TABLE addon_versions
    ADD COLUMN IF NOT EXISTS manifest jsonb;

CREATE INDEX IF NOT EXISTS addon_versions_manifest_idx
    ON addon_versions USING gin (manifest);
