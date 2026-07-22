ALTER TABLE oauth_accounts ADD COLUMN IF NOT EXISTS provider_login text;

CREATE INDEX IF NOT EXISTS oauth_accounts_provider_login_idx
    ON oauth_accounts (provider, lower(provider_login))
    WHERE provider_login IS NOT NULL;
