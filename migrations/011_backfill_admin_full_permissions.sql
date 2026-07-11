-- Migration 011: 给现有管理员账号补全所有模块的显式权限行
-- 背景：TASK-147 —— TASK-146 把全仓库业务权限判断从"?? isAdmin 兜底"改成"必须有显式 canAccess=1"，
--       管理员账号不再自动获得任何业务模块访问权。旧模型下管理员本来就不需要显式权限行（历次迁移
--       003/007/009/010_merge_purchase_registration_permissions 都特意排除了管理员），
--       如果不补这条数据，管理员会被这次策略变更锁在自己系统的业务功能和 API 之外。
--       本迁移必须在 TASK-146 的严格权限判断代码部署到生产之前（或同一批次内）执行完毕。
-- 执行命令:
-- npx wrangler d1 execute mluonet-users --file=./migrations/011_backfill_admin_full_permissions.sql --remote

WITH admin_users AS (
  SELECT id FROM User WHERE isAdmin = 1
),
modules(moduleId) AS (
  VALUES
    ('quotation'), ('domesticQuotation'), ('packing'), ('invoice'), ('purchase'),
    ('inquiry'), ('inquiry.batchEdit'), ('order.financials'), ('purchaseRegistration'),
    ('history'), ('customer'), ('ai-email'), ('impa'), ('clock'), ('holidays'), ('rmb')
)
INSERT INTO Permission (id, userId, moduleId, canAccess)
SELECT
  'admin-backfill-' || admin_users.id || '-' || modules.moduleId AS id,
  admin_users.id AS userId,
  modules.moduleId AS moduleId,
  1 AS canAccess
FROM admin_users
CROSS JOIN modules
WHERE NOT EXISTS (
  SELECT 1 FROM Permission
  WHERE Permission.userId = admin_users.id
    AND Permission.moduleId = modules.moduleId
);

UPDATE Permission
SET canAccess = 1
WHERE canAccess = 0
  AND moduleId IN (
    'quotation', 'domesticQuotation', 'packing', 'invoice', 'purchase',
    'inquiry', 'inquiry.batchEdit', 'order.financials', 'purchaseRegistration',
    'history', 'customer', 'ai-email', 'impa', 'clock', 'holidays', 'rmb'
  )
  AND userId IN (SELECT id FROM User WHERE isAdmin = 1);
