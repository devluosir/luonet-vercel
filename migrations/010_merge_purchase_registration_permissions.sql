-- Migration 010: 采购部登记 + 采购订单表合并为单一权限模块 purchaseRegistration
-- 背景：CODEX_TASKS.md TASK-111 —— purchaseRegistration（采购部登记）和 purchaseOrderTable
--       （采购订单表）原本是两个独立权限，现在合并成一个开关（purchaseRegistration 覆盖两个
--       页面）。为了不让原本只有 purchaseOrderTable=1（没有 purchaseRegistration）的用户
--       合并后失去采购订单表的访问权，把两者取"或"：只要曾经有任一权限为 1，合并后的
--       purchaseRegistration 也置为 1。
-- 注意：旧的 purchaseOrderTable 权限行不会被删除（代码已不再读取，留作历史记录）。
-- 执行命令:
-- npx wrangler d1 execute mluonet-users --file=./migrations/010_merge_purchase_registration_permissions.sql --remote

-- 1) 用户已有 purchaseOrderTable=1 但没有 purchaseRegistration 记录：新增一条 purchaseRegistration=1
INSERT INTO Permission (id, userId, moduleId, canAccess)
SELECT
  'purchase-registration-merged-' || User.id AS id,
  User.id AS userId,
  'purchaseRegistration' AS moduleId,
  1 AS canAccess
FROM User
JOIN Permission AS OrderTablePermission
  ON OrderTablePermission.userId = User.id
  AND OrderTablePermission.moduleId = 'purchaseOrderTable'
  AND OrderTablePermission.canAccess = 1
WHERE User.isAdmin = 0
  AND NOT EXISTS (
    SELECT 1
    FROM Permission
    WHERE Permission.userId = User.id
      AND Permission.moduleId = 'purchaseRegistration'
  );

-- 2) 用户已有 purchaseRegistration 记录但当前是 0、同时 purchaseOrderTable=1：翻转成 1（取"或"）
UPDATE Permission
SET canAccess = 1
WHERE moduleId = 'purchaseRegistration'
  AND canAccess = 0
  AND userId IN (
    SELECT userId FROM Permission
    WHERE moduleId = 'purchaseOrderTable' AND canAccess = 1
  );
