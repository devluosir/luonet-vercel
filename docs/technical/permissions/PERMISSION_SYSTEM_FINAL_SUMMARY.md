# 权限系统现状

最后更新：2026-07-06

## 当前结论

权限模块唯一注册表是：

```text
src/constants/permissionModules.ts
```

后台用户权限弹窗、模块分组和高级权限都应从该注册表派生。不要再新增分散的权限常量文件。

## 当前模块

| moduleId | 说明 |
|----------|------|
| `quotation` | 报价单 / 销售确认 |
| `packing` | 箱单发票 |
| `invoice` | 财务发票 |
| `purchase` | 采购订单 |
| `inquiry` | 询报价登记表 / 订单状态表 |
| `inquiry.batchEdit` | 询报价批量编辑 / 导入导出 |
| `order.financials` | 订单金额 / 回款 / 到账金额 |
| `history` | 单据历史 |
| `customer` | 客户管理 |
| `ai-email` | AI 邮件 |
| `impa` | IMPA 物料外部工具 |
| `clock` | 时区汇率 |
| `holidays` | 全球假日 |
| `rmb` | RMB 大写 |

`admin` 不是普通 moduleId，后台访问由用户的 `isAdmin` 控制。

## 权限入口

- 左侧导航：`src/components/layout/AppSidebar.tsx`
- 移动底部导航：`src/components/layout/MobileBottomTab.tsx`
- 后台权限弹窗：`src/features/admin/components/UserDetailModal.tsx`
- 权限注册表：`src/constants/permissionModules.ts`
- 客户端权限 store：`src/lib/permissions.ts`
- 权限初始化：`src/hooks/usePermissionInit.ts`
- 权限刷新：`src/hooks/usePermissionRefresh.ts` + `src/components/PermissionRefreshButton.tsx`
- API 权限校验示例：`src/app/api/inquiry/[[...path]]/route.ts`

手动刷新入口位于用户菜单的个人信息子菜单「账户工具」，以紧凑图标按钮呈现。刷新流程调用 `/api/auth/force-refresh-session`，成功后通过全局 Toast 提示并刷新页面。

## 最近变更

- `clock` 模块显示名称已从“世界时钟”统一为“时区汇率”，左侧导航、权限注册表和页面面包屑保持一致。
- `impa` 已加入模块权限。
- 生产 D1 已执行 `migrations/007_grant_default_impa_permission.sql`。
- 复查结果：`impa_permissions = 8`，`enabled_permissions = 8`。
- 权限刷新入口已从用户菜单独立行调整为个人信息子菜单中的图标按钮；旧的未使用刷新权限实现已删除。

## 维护注意

1. 新增模块时先改 `permissionModules.ts`。
2. 再把入口组件映射到对应 moduleId。
3. 对已有普通用户可见的新工具，需要补 D1 迁移，否则上线后默认不可见。
4. 页面级权限并不是安全边界；敏感接口仍需要服务端校验。
5. Worker 管理接口当前仍有 `X-User-*` header 可伪造风险，应迁移到 HMAC/JWT 或服务端 session 校验。
