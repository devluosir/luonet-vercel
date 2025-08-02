#!/bin/bash

echo "🚀 开始部署MLUONET用户数据库到Cloudflare..."

# 1. 部署D1数据库Schema
echo "📋 部署数据库Schema..."
npx wrangler d1 execute mluonet-users --file=prisma/d1-schema.sql --remote

# 2. 插入用户数据
echo "👥 插入用户数据..."
npx wrangler d1 execute mluonet-users --file=prisma/d1-data.sql --remote

# 3. 构建和部署Workers
echo "🔨 构建Workers..."
npm run build

echo "📤 部署Workers..."
npx wrangler deploy

echo "✅ 部署完成！"
echo ""
echo "📊 部署信息："
echo "- 数据库名称: mluonet-users"
echo "- Workers名称: mluonet-users"
echo "- 用户数量: 9"
echo "- 权限记录: 126"
echo ""
echo "🔗 测试API端点："
echo "- 用户认证: POST /api/auth/d1-users"
echo "- 获取用户: GET /api/admin/users"
echo "- 更新权限: PUT /api/admin/users/{id}/permissions" 