-- V1__init.sql - Initial schema

-- Users table
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_user_id VARCHAR(200) UNIQUE NOT NULL,
    username        VARCHAR(100) NOT NULL,
    display_name    VARCHAR(100),
    role            VARCHAR(20) DEFAULT 'developer',
    active_skills   JSONB DEFAULT '[]',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Skills table
CREATE TABLE skills (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(200) NOT NULL,
    display_name    VARCHAR(200),
    description     TEXT,
    category        VARCHAR(100),
    call_count      INTEGER DEFAULT 0,
    enabled         BOOLEAN DEFAULT TRUE,
    config          JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_skills_call_count_desc ON skills (call_count DESC);

-- Skill fields table
CREATE TABLE skill_fields (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id        UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    field_id        VARCHAR(200) NOT NULL,
    field_name      VARCHAR(200),
    field_type      VARCHAR(50),
    required        BOOLEAN DEFAULT FALSE,
    default_value   TEXT,
    sort_order      INTEGER DEFAULT 0,
    config          JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_skill_fields_skill_field UNIQUE (skill_id, field_id)
);

CREATE INDEX idx_skill_fields_skill_sort ON skill_fields (skill_id, sort_order);

-- Skill versions table
CREATE TABLE skill_versions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id        UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    version         VARCHAR(50) NOT NULL,
    changelog       TEXT,
    schema_snapshot JSONB DEFAULT '{}',
    published       BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_skill_versions_skill_version UNIQUE (skill_id, version)
);

-- Dependencies table
CREATE TABLE dependencies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    namespace       VARCHAR(300) UNIQUE NOT NULL,
    name            VARCHAR(200) NOT NULL,
    version         VARCHAR(100),
    description     TEXT,
    dependency_type VARCHAR(50),
    config          JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Checkouts table
CREATE TABLE checkouts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id         VARCHAR(200) NOT NULL,
    page_name       VARCHAR(200),
    user_id         UUID NOT NULL REFERENCES users(id),
    status          VARCHAR(30) DEFAULT 'active',
    container_id    VARCHAR(200),
    session_id      VARCHAR(200),
    gitlab_repo_url VARCHAR(500),
    branch          VARCHAR(200),
    commit_message  VARCHAR(200),
    started_at      TIMESTAMPTZ DEFAULT NOW(),
    finished_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_checkouts_page_status ON checkouts (page_id, status);
CREATE INDEX idx_checkouts_user_status ON checkouts (user_id, status);

-- System configs table
CREATE TABLE system_configs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key             VARCHAR(200) UNIQUE NOT NULL,
    value           JSONB DEFAULT '{}',
    description     TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
