-- Migration 009: 内销报价合同拆分为独立权限模块 domesticQuotation
-- 背景：CODEX_TASKS.md TASK-111 —— 内销报价/内销合同原本共用 quotation（外贸报价合同）
--       权限位，现在拆成独立开关。为了不让老用户升级后突然失去内销报价/合同的访问权限，
--       给所有当前 quotation=1 的普通用户批量补一条 domesticQuotation=1。
-- 执行命令:
-- npx wrangler d1 execute mluonet-users --file=./migrations/009_split_domestic_quotation_permission.sql --remote

INSERT INTO Permission (id, userId, moduleId, canAccess)
SELECT
  'domestic-quotation-' || User.id AS id,
  User.id AS userId,
  'domesticQuotation' AS moduleId,
  1 AS canAccess
FROM User
JOIN Permission AS QuotationPermission
  ON QuotationPermission.userId = User.id
  AND QuotationPermission.moduleId = 'quotation'
  AND QuotationPermission.canAccess = 1
WHERE User.isAdmin = 0
  AND NOT EXISTS (
    SELECT 1
    FROM Permission
    WHERE Permission.userId = User.id
      AND Permission.moduleId = 'domesticQuotation'
  );
