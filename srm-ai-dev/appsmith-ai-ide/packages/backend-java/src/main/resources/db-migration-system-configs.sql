-- ============================================================
-- Migration: system_configs table - add name, type, datasource columns
-- and seed initial managed config entries
-- ============================================================

-- Step 1: Add new columns (IF NOT EXISTS avoids error if already added)
ALTER TABLE system_configs ADD COLUMN IF NOT EXISTS name VARCHAR(100);
ALTER TABLE system_configs ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'input';
ALTER TABLE system_configs ADD COLUMN IF NOT EXISTS datasource JSONB;

-- Step 2: Delete old config entries that are no longer managed
DELETE FROM system_configs WHERE "key" NOT IN (
    'appsmith.session',
    'gitlab.api.base.url',
    'gitlab.repo.prefix',
    'git.token',
    'ssh-private-key'
);

-- Step 3: Insert managed config entries (skip if already exists)
INSERT INTO system_configs (id, "key", name, value, description, type, updated_at)
SELECT gen_random_uuid(), 'appsmith.session', 'APPSMITH会话',
       '"c275d412-36bb-4f33-b0c7-a1e7c406a701"'::jsonb,
       'Appsmith API 会话标识', 'input', NOW()
WHERE NOT EXISTS (SELECT 1 FROM system_configs WHERE "key" = 'appsmith.session');

INSERT INTO system_configs (id, "key", name, value, description, type, updated_at)
SELECT gen_random_uuid(), 'gitlab.api.base.url', 'GIT仓库地址',
       '"http://10.177.152.5:3000"'::jsonb,
       'GitLab API 基础地址', 'input', NOW()
WHERE NOT EXISTS (SELECT 1 FROM system_configs WHERE "key" = 'gitlab.api.base.url');

INSERT INTO system_configs (id, "key", name, value, description, type, updated_at)
SELECT gen_random_uuid(), 'gitlab.repo.prefix', 'GIT仓库团队地址',
       '"ssh://git@10.177.152.5:2222/srm-dev/"'::jsonb,
       'GitLab 仓库前缀（SSH/HTTPS）', 'input', NOW()
WHERE NOT EXISTS (SELECT 1 FROM system_configs WHERE "key" = 'gitlab.repo.prefix');

INSERT INTO system_configs (id, "key", name, value, description, type, updated_at)
SELECT gen_random_uuid(), 'git.token', 'GIT仓库token',
       '"glpat-8_6t5pKNr61QHfu76Bw1QG86MQp1OjEH.01.0w09qnb0t"'::jsonb,
       'GitLab/GitHub API Token', 'input', NOW()
WHERE NOT EXISTS (SELECT 1 FROM system_configs WHERE "key" = 'git.token');

-- Step 4: Update name/type for existing rows that may be missing these fields
UPDATE system_configs SET name = 'APPSMITH会话', type = 'input'
WHERE "key" = 'appsmith.session' AND name IS NULL;

UPDATE system_configs SET name = 'GIT仓库地址', type = 'input'
WHERE "key" = 'gitlab.api.base.url' AND name IS NULL;

UPDATE system_configs SET name = 'GIT仓库团队地址', type = 'input'
WHERE "key" = 'gitlab.repo.prefix' AND name IS NULL;

UPDATE system_configs SET name = 'GIT仓库token', type = 'input'
WHERE "key" = 'git.token' AND name IS NULL;
