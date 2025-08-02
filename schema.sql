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