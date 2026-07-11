-- Migration 012: 同步“单据历史”（history）权限为单据类权限的自动派生值
-- 背景：TASK-146 —— history 原本可以独立开关，导致“开着单据历史但没有任何单据类权限”的不一致状态。
--       本迁移需要在 migrations/011_backfill_admin_full_permissions.sql 之后执行，
--       确保管理员账号已经补全单据类权限后再做 history 的派生同步。
-- 执行命令:
-- npx wrangler d1 execute mluonet-users --file=./migrations/012_sync_history_permission_with_documents.sql --remote

-- 1. 单据类权限全部为 0（或缺失）的账号 → 关闭 history
UPDATE Permission
SET canAccess = 0
WHERE moduleId = 'history'
  AND canAccess = 1
  AND userId IN (
    SELECT User.id FROM User
    WHERE User.id NOT IN (
        SELECT userId FROM Permission
        WHERE moduleId IN ('quotation', 'domesticQuotation', 'packing', 'invoice', 'purchase')
          AND canAccess = 1
      )
  );

-- 2a. 单据类权限任一为 1、但尚无 history 记录的账号 → 插入 history=1
INSERT INTO Permission (id, userId, moduleId, canAccess)
SELECT 'history-' || User.id, User.id, 'history', 1
FROM User
WHERE User.id IN (
    SELECT userId FROM Permission
    WHERE moduleId IN ('quotation', 'domesticQuotation', 'packing', 'invoice', 'purchase')
      AND canAccess = 1
  )
  AND NOT EXISTS (
    SELECT 1 FROM Permission WHERE Permission.userId = User.id AND Permission.moduleId = 'history'
  );

-- 2b. 单据类权限任一为 1、但现有 history 记录是 0 的账号 → 更新为 1
UPDATE Permission
SET canAccess = 1
WHERE moduleId = 'history'
  AND canAccess = 0
  AND userId IN (
    SELECT userId FROM Permission
    WHERE moduleId IN ('quotation', 'domesticQuotation', 'packing', 'invoice', 'purchase')
      AND canAccess = 1
  );
