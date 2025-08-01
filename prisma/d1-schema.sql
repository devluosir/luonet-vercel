-- D1 Database Schema for MLUONET Users
-- 用户表
CREATE TABLE IF NOT EXISTS User (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  email TEXT,
  status INTEGER DEFAULT 1, -- 1 for true, 0 for false
  isAdmin INTEGER DEFAULT 0, -- 1 for true, 0 for false
  lastLoginAt DATETIME,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 权限表
CREATE TABLE IF NOT EXISTS Permission (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  moduleId TEXT NOT NULL,
  canAccess INTEGER DEFAULT 0, -- 1 for true, 0 for false
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
  UNIQUE(userId, moduleId)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_permission_userid ON Permission(userId);
CREATE INDEX IF NOT EXISTS idx_permission_moduleid ON Permission(moduleId);
CREATE INDEX IF NOT EXISTS idx_user_username ON User(username);
CREATE INDEX IF NOT EXISTS idx_user_email ON User(email);

-- 创建触发器来更新updatedAt
CREATE TRIGGER IF NOT EXISTS update_user_updated_at 
  AFTER UPDATE ON User
  FOR EACH ROW
  BEGIN
    UPDATE User SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END; 