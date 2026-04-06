-- ============================================================
-- Migration: Chat messages persistence
-- ============================================================

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES pages(id),
    user_id UUID NOT NULL REFERENCES users(id),
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_msg_page_user
    ON chat_messages (page_id, user_id, created_at);

CREATE TABLE IF NOT EXISTS chat_clear_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES pages(id),
    user_id UUID NOT NULL REFERENCES users(id),
    cleared_at TIMESTAMPTZ DEFAULT NOW()
);

-- System config: AI context history length
INSERT INTO system_configs (id, "key", name, value, description, type, updated_at)
SELECT gen_random_uuid(), 'chat.context.max.chars', 'AI上下文历史长度',
       '"30000"'::jsonb, '注入 Claude 的历史消息最大字符数', 'input', NOW()
WHERE NOT EXISTS (SELECT 1 FROM system_configs WHERE "key" = 'chat.context.max.chars');

-- System config: Chat history page size
INSERT INTO system_configs (id, "key", name, value, description, type, updated_at)
SELECT gen_random_uuid(), 'chat.history.page.size', '聊天��史每页条数',
       '"10"'::jsonb, '前端每次滚动加载的消息条数', 'input', NOW()
WHERE NOT EXISTS (SELECT 1 FROM system_configs WHERE "key" = 'chat.history.page.size');
