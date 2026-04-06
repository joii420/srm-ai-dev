-- ============================================================
-- Migration: Add Claude API config entries to system_configs
-- ============================================================

INSERT INTO system_configs (id, "key", name, value, description, type, updated_at)
SELECT gen_random_uuid(), 'claude.api.key', 'Claude API Key',
       '""'::jsonb,
       'Anthropic Claude API 密钥', 'input', NOW()
WHERE NOT EXISTS (SELECT 1 FROM system_configs WHERE "key" = 'claude.api.key');

INSERT INTO system_configs (id, "key", name, value, description, type, updated_at)
SELECT gen_random_uuid(), 'claude.model', 'Claude 模型',
       '"claude-sonnet-4-20250514"'::jsonb,
       'Claude 模型名称', 'input', NOW()
WHERE NOT EXISTS (SELECT 1 FROM system_configs WHERE "key" = 'claude.model');

INSERT INTO system_configs (id, "key", name, value, description, type, updated_at)
SELECT gen_random_uuid(), 'claude.base.url', 'Claude API 地址',
       '"https://api.anthropic.com"'::jsonb,
       'Claude API 基础地址（支持代理）', 'input', NOW()
WHERE NOT EXISTS (SELECT 1 FROM system_configs WHERE "key" = 'claude.base.url');
