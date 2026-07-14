ALTER TABLE project_generation_events
    ADD COLUMN IF NOT EXISTS platform text NOT NULL DEFAULT 'windows';

ALTER TABLE project_generation_events DROP CONSTRAINT IF EXISTS project_generation_runtime_check;
ALTER TABLE project_generation_events
    ADD CONSTRAINT project_generation_runtime_check CHECK (runtime IN ('node', 'none'));
ALTER TABLE project_generation_events
    ADD CONSTRAINT project_generation_platform_check CHECK (platform IN ('windows', 'mobile', 'mac-linux'));
