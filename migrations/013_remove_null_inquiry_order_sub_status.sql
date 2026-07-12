-- Migration 013: 清理询报价记录中显式为 null 的 orderSubStatus
-- 背景：同步层用 null 表示“清空可选字段”，旧 Worker 将 null 原样写入 Document.data，
--       而订单状态表的“正常”筛选按未设置字段判断，导致无 C/P/S 标记的订单被漏掉。
-- 执行命令:
-- npx wrangler d1 execute mluonet-users --file=./migrations/013_remove_null_inquiry_order_sub_status.sql --remote

UPDATE Document
SET
  data = json_set(
    json_remove(data, '$.orderSubStatus'),
    '$.updatedAt',
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  ),
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE type = 'inquiry'
  AND json_type(data, '$.orderSubStatus') = 'null';
