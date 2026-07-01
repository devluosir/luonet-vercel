-- Migration 005：修复 TASK-59 后 CustomerEvent 外键目标
-- 原因：SQLite/D1 在 ALTER TABLE Customer RENAME TO Customer_old 时会把
-- CustomerEvent 的外键定义改写为 REFERENCES "Customer_old"(id)。
-- TASK-59 已在 004 文件中补上重建逻辑；本文件用于修复已执行过旧版 004 的生产库。

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
