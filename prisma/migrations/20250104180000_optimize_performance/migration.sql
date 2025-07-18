-- 优化用户权限查询性能
-- 添加复合索引以加速权限查询
CREATE INDEX IF NOT EXISTS "Permission_userId_canAccess_idx" 
ON "Permission"("userId", "canAccess");

-- 添加用户状态索引
CREATE INDEX IF NOT EXISTS "User_status_idx" 
ON "User"("status");

-- 添加管理员状态索引
CREATE INDEX IF NOT EXISTS "User_isAdmin_idx" 
ON "User"("isAdmin");

-- 优化用户查询的复合索引
CREATE INDEX IF NOT EXISTS "User_id_status_isAdmin_idx" 
ON "User"("id", "status", "isAdmin");

-- 分析表以更新统计信息
ANALYZE "User";
ANALYZE "Permission"; 