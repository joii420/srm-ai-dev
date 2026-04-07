-- ============================================================
-- Migration: Add sort_order column to system_configs
-- ============================================================

ALTER TABLE system_configs ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Set sort order for existing config entries
UPDATE system_configs SET sort_order = 10 WHERE "key" = 'gitlab.repo.prefix';
UPDATE system_configs SET sort_order = 11 WHERE "key" = 'gitlab.api.base.url';
UPDATE system_configs SET sort_order = 12 WHERE "key" = 'git.token';
UPDATE system_configs SET sort_order = 20 WHERE "key" = 'appsmith.session';
UPDATE system_configs SET sort_order = 30 WHERE "key" = 'claude.api.key';
UPDATE system_configs SET sort_order = 31 WHERE "key" = 'claude.model';
UPDATE system_configs SET sort_order = 32 WHERE "key" = 'claude.base.url';
UPDATE system_configs SET sort_order = 40 WHERE "key" = 'chat.context.max.chars';
UPDATE system_configs SET sort_order = 41 WHERE "key" = 'chat.history.page.size';
