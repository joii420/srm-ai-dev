-- ============================================================
-- Migration: Add claude.model.light config
-- ============================================================

INSERT INTO system_configs (id, "key", name, value, description, type, sort_order, updated_at)
SELECT gen_random_uuid(), 'claude.model.light', 'Claude 轻量模型',
       '"claude-haiku-4-5-20251001"'::jsonb,
       '记忆更新等后台任务使用的轻量模型（省 token）', 'input', 33, NOW()
WHERE NOT EXISTS (SELECT 1 FROM system_configs WHERE "key" = 'claude.model.light');
