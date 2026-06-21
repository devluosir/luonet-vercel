-- 用户表
CREATE TABLE IF NOT EXISTS User (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  email TEXT,
  status INTEGER NOT NULL DEFAULT 1,
  isAdmin INTEGER NOT NULL DEFAULT 0,
  lastLoginAt DATETIME,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 权限表
CREATE TABLE IF NOT EXISTS Permission (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  moduleId TEXT NOT NULL,
  canAccess INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_user_username ON User(username);
CREATE INDEX IF NOT EXISTS idx_user_status ON User(status);
CREATE INDEX IF NOT EXISTS idx_user_isAdmin ON User(isAdmin);
CREATE INDEX IF NOT EXISTS idx_permission_userId ON Permission(userId);
CREATE INDEX IF NOT EXISTS idx_permission_moduleId ON Permission(moduleId);

-- 报价历史表（保留原有表）
CREATE TABLE IF NOT EXISTS quotation_history (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  quotation_no TEXT NOT NULL,
  total_amount REAL NOT NULL,
  currency TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
); 

-- ============================================================
-- 业务数据表（Phase 4 数据库迁移）
-- 当前业务数据仍主要存浏览器 localStorage
-- 这些表为服务端迁移做准备，暂不影响现有功能
-- ============================================================

-- 业务单据统一表
CREATE TABLE IF NOT EXISTS Document (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('quotation', 'confirmation', 'invoice', 'packing', 'purchase', 'inquiry')),
  doc_no TEXT NOT NULL,
  customer_name TEXT,
  total_amount REAL,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'deleted')),
  data TEXT NOT NULL,                              -- JSON 全量数据
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_doc_user_type ON Document(user_id, type);
CREATE INDEX IF NOT EXISTS idx_doc_customer ON Document(customer_name);
CREATE INDEX IF NOT EXISTS idx_doc_no ON Document(doc_no);
CREATE INDEX IF NOT EXISTS idx_doc_created ON Document(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_doc_status ON Document(status);

-- 客户数据表
CREATE TABLE IF NOT EXISTS Customer (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('customer', 'supplier', 'consignee')),
  name TEXT NOT NULL,
  code TEXT,                                        -- 客户编号
  email TEXT,
  phone TEXT,
  address TEXT,
  data TEXT NOT NULL DEFAULT '{}',                 -- JSON 扩展字段
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived')),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_customer_user_type ON Customer(user_id, type);
CREATE INDEX IF NOT EXISTS idx_customer_name ON Customer(name);
CREATE INDEX IF NOT EXISTS idx_customer_status ON Customer(status);

-- 客户事件表（时间轴 + 跟进记录）
CREATE TABLE IF NOT EXISTS CustomerEvent (
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

CREATE INDEX IF NOT EXISTS idx_event_customer ON CustomerEvent(customer_id, event_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_user ON CustomerEvent(user_id);
CREATE INDEX IF NOT EXISTS idx_event_type ON CustomerEvent(event_type);
