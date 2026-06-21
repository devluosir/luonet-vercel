-- Migration 002: Document.type 约束新增 'inquiry'
-- 背景：TASK-08 建表时 CHECK 仅含 quotation/confirmation/invoice/packing/purchase
--       TASK-19 新增询报价模块，需支持 type='inquiry' 且 user_id='_shared_'
-- SQLite/D1 不支持 ALTER TABLE 修改 CHECK，需重建表
-- 执行命令: npx wrangler d1 execute mluonet-users --file=./migrations/002_add_inquiry_type.sql --remote

-- Step 1: 建新表（含 'inquiry'，去掉 FOREIGN KEY 约束，保留 NOT NULL）
CREATE TABLE IF NOT EXISTS Document_v2 (
  id           TEXT NOT NULL PRIMARY KEY,
  user_id      TEXT NOT NULL,
  type         TEXT NOT NULL CHECK(type IN ('quotation','confirmation','invoice','packing','purchase','inquiry')),
  doc_no       TEXT NOT NULL DEFAULT '',
  customer_name TEXT NOT NULL DEFAULT '',
  total_amount  REAL NOT NULL DEFAULT 0,
  currency      TEXT NOT NULL DEFAULT 'USD',
  status        TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','deleted')),
  data          TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

-- Step 2: 全量迁移现有数据
INSERT INTO Document_v2 (id, user_id, type, doc_no, customer_name, total_amount, currency, status, data, created_at, updated_at)
SELECT
  id,
  user_id,
  type,
  COALESCE(doc_no, '')           AS doc_no,
  COALESCE(customer_name, '')    AS customer_name,
  COALESCE(total_amount, 0)      AS total_amount,
  COALESCE(currency, 'USD')      AS currency,
  COALESCE(status, 'active')     AS status,
  data,
  COALESCE(created_at, datetime('now'))  AS created_at,
  COALESCE(updated_at, datetime('now'))  AS updated_at
FROM Document;

-- Step 3: 验证数量一致（可选，执行后人工对比）
-- SELECT COUNT(*) AS old_count FROM Document;
-- SELECT COUNT(*) AS new_count FROM Document_v2;

-- Step 4: 删除旧表
DROP TABLE Document;

-- Step 5: 重命名
ALTER TABLE Document_v2 RENAME TO Document;

-- Step 6: 重建索引
CREATE INDEX IF NOT EXISTS idx_doc_user_type ON Document(user_id, type);
CREATE INDEX IF NOT EXISTS idx_doc_customer  ON Document(customer_name);
CREATE INDEX IF NOT EXISTS idx_doc_no        ON Document(doc_no);
CREATE INDEX IF NOT EXISTS idx_doc_created   ON Document(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_doc_status    ON Document(status);
