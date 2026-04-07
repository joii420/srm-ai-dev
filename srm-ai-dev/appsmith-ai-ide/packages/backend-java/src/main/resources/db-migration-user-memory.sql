-- ============================================================
-- Migration: User memories table (dual-layer memory system)
-- ============================================================

CREATE TABLE IF NOT EXISTS user_memories (
    user_id       UUID PRIMARY KEY REFERENCES users(id),
    memory_json   JSONB NOT NULL DEFAULT '{}'::jsonb,
    version       INTEGER NOT NULL DEFAULT 1,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    last_updated  TIMESTAMPTZ DEFAULT NOW()
);
