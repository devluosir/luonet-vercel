-- Migration 004：客户体系重构
-- 1) Customer 表去掉按用户隔离，变成团队共享；companyShortName 提升为一等字段 short_name
-- 2) 新建独立 Contact 表（此前联络人塞在 Customer.data 的 JSON 里，不可查询/不可统计）
-- 3) Document 表加 customer_id / contact_id，供询价/订单记录关联客户库（历史记录先留空，TASK-63 尽力回填）

-- ── Step 1：Customer 表重建（去掉 user_id 隔离维度，保留 created_by 做审计追溯） ──
ALTER TABLE Customer RENAME TO Customer_old;

DROP INDEX IF EXISTS idx_customer_user_type;
DROP INDEX IF EXISTS idx_customer_name;
DROP INDEX IF EXISTS idx_customer_status;

CREATE TABLE Customer (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('customer', 'supplier', 'consignee')),
  name TEXT NOT NULL,
  short_name TEXT,
  code TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  data TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived')),
  created_by TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO Customer (id, type, name, short_name, code, email, phone, address, data, status, created_by, created_at, updated_at)
SELECT
  id, type, name,
  json_extract(data, '$.companyShortName'),
  code, email, phone, address,
  data, status, user_id, created_at, updated_at
FROM Customer_old;

CREATE INDEX idx_customer_type ON Customer(type);
CREATE INDEX idx_customer_name ON Customer(name);
CREATE INDEX idx_customer_short_name ON Customer(short_name);
CREATE INDEX idx_customer_status ON Customer(status);

-- Customer 重命名后，SQLite 会把 CustomerEvent 的外键目标改写成 Customer_old；
-- 这里重建 CustomerEvent，让外键重新指向新的共享 Customer 表。
ALTER TABLE CustomerEvent RENAME TO CustomerEvent_old;

DROP INDEX IF EXISTS idx_event_customer;
DROP INDEX IF EXISTS idx_event_user;
DROP INDEX IF EXISTS idx_event_type;

CREATE TABLE CustomerEvent (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK(event_type IN ('timeline', 'followup', 'document', 'note')),
  title TEXT,
  content TEXT NOT NULL,
  event_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES Customer(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES User(id)
);

INSERT INTO CustomerEvent (id, customer_id, user_id, event_type, title, content, event_at, created_at)
SELECT id, customer_id, user_id, event_type, title, content, event_at, created_at
FROM CustomerEvent_old;

CREATE INDEX idx_event_customer ON CustomerEvent(customer_id, event_at DESC);
CREATE INDEX idx_event_user ON CustomerEvent(user_id);
CREATE INDEX idx_event_type ON CustomerEvent(event_type);

DROP TABLE CustomerEvent_old;
DROP TABLE Customer_old;
-- 校验：SELECT COUNT(*) FROM CustomerEvent WHERE customer_id NOT IN (SELECT id FROM Customer); 必须为 0

-- ── Step 2：新建 Contact 表 ──
CREATE TABLE Contact (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  name TEXT NOT NULL,
  short_name TEXT,
  email TEXT,
  phone TEXT,
  is_primary INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived')),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES Customer(id) ON DELETE CASCADE
);

CREATE INDEX idx_contact_customer_id ON Contact(customer_id);
CREATE INDEX idx_contact_short_name ON Contact(short_name);

-- ── Step 3：联络人历史数据拆分迁移 ──
-- 3a. "联系人1"：现状是复用 Customer 顶层 name/email/phone + data.contact1ShortName，标记为主联络人
INSERT INTO Contact (id, customer_id, name, short_name, email, phone, is_primary, sort_order, created_at, updated_at)
SELECT
  'contact-primary-' || id, id, name,
  json_extract(data, '$.contact1ShortName'),
  email, phone, 1, 0, created_at, updated_at
FROM Customer
WHERE type = 'customer' AND name IS NOT NULL AND TRIM(name) != '';

-- 3b. data.contacts[] 数组里的附加联系人
INSERT INTO Contact (id, customer_id, name, short_name, email, phone, is_primary, sort_order, created_at, updated_at)
SELECT
  'contact-' || Customer.id || '-' || je.key,
  Customer.id,
  json_extract(je.value, '$.name'),
  json_extract(je.value, '$.shortName'),
  json_extract(je.value, '$.email'),
  json_extract(je.value, '$.phone'),
  0,
  CAST(je.key AS INTEGER) + 1,
  Customer.created_at,
  Customer.updated_at
FROM Customer, json_each(Customer.data, '$.contacts') AS je
WHERE Customer.type = 'customer'
  AND json_extract(je.value, '$.name') IS NOT NULL
  AND TRIM(json_extract(je.value, '$.name')) != '';

-- 3c. 遗留的 contact2*（旧版单一"联系人2"字段，可能有历史数据还没走过 contacts[] 结构）
INSERT INTO Contact (id, customer_id, name, short_name, email, phone, is_primary, sort_order, created_at, updated_at)
SELECT
  'contact-legacy2-' || id, id,
  json_extract(data, '$.contact2Name'),
  json_extract(data, '$.contact2ShortName'),
  json_extract(data, '$.contact2Email'),
  json_extract(data, '$.contact2Phone'),
  0, 99, created_at, updated_at
FROM Customer
WHERE type = 'customer'
  AND json_extract(data, '$.contact2Name') IS NOT NULL
  AND TRIM(json_extract(data, '$.contact2Name')) != '';

-- ── Step 4：Document 表加客户关联字段（历史记录留空，TASK-63 处理回填） ──
ALTER TABLE Document ADD COLUMN customer_id TEXT;
ALTER TABLE Document ADD COLUMN contact_id TEXT;
CREATE INDEX idx_doc_customer_id ON Document(customer_id);
CREATE INDEX idx_doc_contact_id ON Document(contact_id);
