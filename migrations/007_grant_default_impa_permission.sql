-- Migration 007: 给现有普通用户默认开启 IMPA 物料工具权限
-- 背景：IMPA 物料从硬编码公开入口改为显式模块权限。
--       老用户 Permission 表中没有 impa；若不迁移，上线后普通用户会默认看不到该工具。
-- 执行命令:
-- npx wrangler d1 execute mluonet-users --file=./migrations/007_grant_default_impa_permission.sql --remote

INSERT INTO Permission (id, userId, moduleId, canAccess)
SELECT
  'tool-impa-' || User.id AS id,
  User.id AS userId,
  'impa' AS moduleId,
  1 AS canAccess
FROM User
WHERE User.isAdmin = 0
  AND NOT EXISTS (
    SELECT 1
    FROM Permission
    WHERE Permission.userId = User.id
      AND Permission.moduleId = 'impa'
  );
