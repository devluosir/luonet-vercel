-- Migration 008: Document.type 约束新增 'domestic'
-- 背景：TASK-97 新增内销报价单后，TASK-98 修复历史类型污染；
--       内销报价单需要以 type='domestic' 独立同步到 D1。
-- SQLite/D1 不支持 ALTER TABLE 修改 CHECK，需重建表。
-- 执行命令: npx wrangler d1 execute mluonet-users --file=./migrations/008_add_domestic_document_type.sql --remote

-- Step 1: 建新表（含 'domestic'，保留现有列和约束）
CREATE TABLE IF NOT EXISTS Document_v3 (
  id             TEXT NOT NULL PRIMARY KEY,
  user_id        TEXT NOT NULL,
  type           TEXT NOT NULL CHECK(type IN ('quotation','confirmation','domestic','invoice','packing','purchase','inquiry')),
  doc_no         TEXT NOT NULL DEFAULT '',
  customer_name  TEXT NOT NULL DEFAULT '',
  customer_id    TEXT,
  contact_id     TEXT,
  total_amount   REAL NOT NULL DEFAULT 0,
  currency       TEXT NOT NULL DEFAULT 'USD',
  status         TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','deleted')),
  data           TEXT,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);

-- Step 2: 全量迁移现有数据
INSERT INTO Document_v3 (
  id, user_id, type, doc_no, customer_name, customer_id, contact_id,
  total_amount, currency, status, data, created_at, updated_at
)
SELECT
  id,
  user_id,
  type,
  COALESCE(doc_no, '')           AS doc_no,
  COALESCE(customer_name, '')    AS customer_name,
  customer_id,
  contact_id,
  COALESCE(total_amount, 0)      AS total_amount,
  COALESCE(currency, 'USD')      AS currency,
  COALESCE(status, 'active')     AS status,
  data,
  COALESCE(created_at, datetime('now')) AS created_at,
  COALESCE(updated_at, datetime('now')) AS updated_at
FROM Document;

-- Step 3: 删除旧表
DROP TABLE Document;

-- Step 4: 重命名
ALTER TABLE Document_v3 RENAME TO Document;

-- Step 5: 重建索引
CREATE INDEX IF NOT EXISTS idx_doc_user_type ON Document(user_id, type);
CREATE INDEX IF NOT EXISTS idx_doc_customer ON Document(customer_name);
CREATE INDEX IF NOT EXISTS idx_doc_no ON Document(doc_no);
CREATE INDEX IF NOT EXISTS idx_doc_created ON Document(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_doc_status ON Document(status);
CREATE INDEX IF NOT EXISTS idx_doc_customer_id ON Document(customer_id);
CREATE INDEX IF NOT EXISTS idx_doc_contact_id ON Document(contact_id);
