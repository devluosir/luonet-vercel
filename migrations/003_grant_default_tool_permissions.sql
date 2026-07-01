-- Migration 003: 给现有普通用户默认开启低风险工具模块权限
-- 背景：TASK-57A 为 clock/holidays/rmb 补上显式权限位。
--       老用户 Permission 表中没有这些 moduleId；若不迁移，上线后普通用户会默认看不到这三个工具。
-- 执行命令:
-- npx wrangler d1 execute mluonet-users --file=./migrations/003_grant_default_tool_permissions.sql --remote

INSERT INTO Permission (id, userId, moduleId, canAccess)
SELECT
  'tool-' || modules.moduleId || '-' || User.id AS id,
  User.id AS userId,
  modules.moduleId,
  1 AS canAccess
FROM User
CROSS JOIN (
  SELECT 'clock' AS moduleId
  UNION ALL SELECT 'holidays'
  UNION ALL SELECT 'rmb'
) AS modules
WHERE User.isAdmin = 0
  AND NOT EXISTS (
    SELECT 1
    FROM Permission
    WHERE Permission.userId = User.id
      AND Permission.moduleId = modules.moduleId
  );
