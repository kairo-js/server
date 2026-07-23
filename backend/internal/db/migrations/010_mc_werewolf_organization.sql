INSERT INTO organizations (slug, display_name, description, official, verified)
VALUES ('mc-werewolf', 'MC Werewolf', 'Official organization for the MC Werewolf add-ons.', true, true)
ON CONFLICT (slug) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    official = true,
    verified = true,
    updated_at = now();

INSERT INTO organization_members (organization_id, user_id, role)
SELECT organization.id, account.user_id, 'owner'
FROM organizations organization
JOIN oauth_accounts account
    ON account.provider = 'github' AND lower(account.provider_login) = 'shizuku86'
WHERE organization.slug = 'mc-werewolf'
ON CONFLICT (organization_id, user_id) DO UPDATE SET role = 'owner', updated_at = now();

WITH desired_addons(addon_id, display_name, description) AS (
    VALUES
        ('werewolf-gamemanager', 'Werewolf GameManager', 'Core game management add-on for MC Werewolf.'),
        ('werewolf-vanillapack', 'Werewolf VanillaPack', 'Standard factions and roles for MC Werewolf.'),
        ('werewolf-additionalroles-1', 'Werewolf Additional Roles I', 'Additional role set I for MC Werewolf.'),
        ('werewolf-additionalroles-4', 'Werewolf Additional Roles IV', 'Additional role set IV for MC Werewolf.')
)
INSERT INTO addons (addon_id, display_name, description)
SELECT addon_id, display_name, description FROM desired_addons
ON CONFLICT (normalized_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    status = 'active',
    updated_at = now();

INSERT INTO addon_owners (addon_id, organization_id)
SELECT addon.id, organization.id
FROM addons addon
CROSS JOIN organizations organization
WHERE organization.slug = 'mc-werewolf'
  AND addon.normalized_id IN (
      'werewolf-gamemanager',
      'werewolf-vanillapack',
      'werewolf-additionalroles-1',
      'werewolf-additionalroles-4'
  )
ON CONFLICT (addon_id) DO UPDATE SET
    user_id = NULL,
    organization_id = EXCLUDED.organization_id;
