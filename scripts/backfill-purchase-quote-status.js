#!/usr/bin/env node

/**
 * TASK-100 后续：采购部登记「询报价状态」初始数据回填脚本
 *
 * 背景：采购部登记表新增了 purchaseSupplierStatuses / purchaseQuotedStatuses 两个
 * 专属字段（结构与询报价登记的 supplierStatuses / quotedStatuses 相同），但对所有
 * 已存在的询报价记录来说，这两个字段是空的。Roger 要求做一次性历史数据回填：
 *
 *   1. 从该记录的 supplierStatuses 里找"飞罗"这个供应商，如果它是已报价状态
 *      （status === 'quoted' 且有 quoteDate），就把这条报价同时写进：
 *      - purchaseSupplierStatuses（供应商标签，镜像销售侧结构）
 *      - purchaseQuotedStatuses（已报价列表，格式即页面上显示的"日期飞罗a"）
 *   2. 从该记录的 quotedStatuses 里找 type === 'unavailable'（无法报价）和
 *      type === 'closed'（询价已关闭），原样把日期复制进 purchaseQuotedStatuses。
 *      "已报价"记录和"无法报价"/"已关闭"标记不互斥，都保留。
 *   3. 订单号（orderNo）等成单状态不需要迁移——采购部登记表的"成单状态"徽章
 *      直接读共享字段 record.orderNo，本来就是准的，不用回填。
 *
 * 只回填 purchaseSupplierStatuses 和 purchaseQuotedStatuses 都还是空的记录，
 * 不会覆盖采购部登记表上线后已经手动编辑过的记录。
 *
 * 用法：
 *   API_TOKEN=xxx node scripts/backfill-purchase-quote-status.js              # 默认 dry-run，只打印不写入
 *   API_TOKEN=xxx node scripts/backfill-purchase-quote-status.js --apply      # 实际写入
 *   API_TOKEN=xxx node scripts/backfill-purchase-quote-status.js --only=C260620F   # 只处理单个询价编号，方便先验证
 *   API_TOKEN=xxx node scripts/backfill-purchase-quote-status.js --base=https://udb.luocompany.net --apply
 *
 * 需要 Node 18+（用到内置 fetch 和 crypto.randomUUID）。
 * 需要生产环境的 API_TOKEN（已迁移到 Cloudflare secret，不在仓库里，
 * 找 Roger 要，或用 `npx wrangler secret list` 确认变量名后自行取值）。
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const ONLY_ARG = args.find((a) => a.startsWith('--only='));
const ONLY_INQUIRY_NO = ONLY_ARG ? ONLY_ARG.slice('--only='.length) : null;
const BASE_ARG = args.find((a) => a.startsWith('--base='));
const WORKER_BASE = BASE_ARG ? BASE_ARG.slice('--base='.length) : (process.env.NEXT_PUBLIC_API_BASE_URL || 'https://udb.luocompany.net');
const API_TOKEN = process.env.API_TOKEN;

const FEILUO_NAME = '飞罗';

if (!API_TOKEN) {
  console.error('缺少 API_TOKEN 环境变量。示例：API_TOKEN=xxx node scripts/backfill-purchase-quote-status.js');
  process.exit(1);
}

function headers() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${API_TOKEN}`,
  };
}

async function fetchAllRecords() {
  const records = [];
  let offset = 0;
  const limit = 2000;
  for (;;) {
    const url = `${WORKER_BASE}/api/inquiry?limit=${limit}&offset=${offset}`;
    const resp = await fetch(url, { headers: headers() });
    if (!resp.ok) {
      throw new Error(`GET ${url} 失败：${resp.status} ${await resp.text()}`);
    }
    const data = await resp.json();
    const batch = Array.isArray(data.records) ? data.records : [];
    records.push(...batch);
    offset += batch.length;
    if (batch.length < limit || offset >= (data.total ?? offset)) break;
  }
  return records;
}

/** 根据询报价登记的原始状态，计算采购部登记的初始 purchaseSupplierStatuses / purchaseQuotedStatuses */
function computePatch(record) {
  const supplierStatuses = Array.isArray(record.supplierStatuses) ? record.supplierStatuses : [];
  const quotedStatuses = Array.isArray(record.quotedStatuses) ? record.quotedStatuses : [];

  const feiluo = supplierStatuses.find(
    (s) => s && s.supplierShortName === FEILUO_NAME && s.status === 'quoted' && s.quoteDate
  );
  const unavailable = quotedStatuses.find((s) => s && s.type === 'unavailable');
  const closed = quotedStatuses.find((s) => s && s.type === 'closed');

  if (!feiluo && !unavailable && !closed) return null;

  const purchaseSupplierStatuses = [];
  const purchaseQuotedStatuses = [];

  if (feiluo) {
    purchaseSupplierStatuses.push({
      id: crypto.randomUUID(),
      supplierShortName: FEILUO_NAME,
      quoteDate: feiluo.quoteDate,
      status: 'quoted',
    });
    purchaseQuotedStatuses.push({
      id: crypto.randomUUID(),
      quoteDate: feiluo.quoteDate,
      supplierShortName: FEILUO_NAME,
      version: 'a',
    });
  }

  if (unavailable) {
    purchaseQuotedStatuses.push({
      id: crypto.randomUUID(),
      quoteDate: unavailable.quoteDate,
      supplierShortName: '',
      version: '',
      type: 'unavailable',
    });
  }

  if (closed) {
    purchaseQuotedStatuses.push({
      id: crypto.randomUUID(),
      quoteDate: closed.quoteDate,
      supplierShortName: '',
      version: '',
      type: 'closed',
    });
  }

  return { purchaseSupplierStatuses, purchaseQuotedStatuses };
}

function describePatch(patch) {
  const parts = [];
  const feiluoEntry = patch.purchaseQuotedStatuses.find((s) => !s.type);
  if (feiluoEntry) parts.push(`已报价 ${feiluoEntry.quoteDate}${feiluoEntry.supplierShortName}${feiluoEntry.version}`);
  if (patch.purchaseQuotedStatuses.some((s) => s.type === 'unavailable')) parts.push('无法报价');
  if (patch.purchaseQuotedStatuses.some((s) => s.type === 'closed')) parts.push('询价已关闭');
  return parts.join(' / ');
}

async function putPatch(id, patch) {
  const url = `${WORKER_BASE}/api/inquiry/${id}`;
  const resp = await fetch(url, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(patch),
  });
  if (!resp.ok) {
    throw new Error(`PUT ${url} 失败：${resp.status} ${await resp.text()}`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log(`Worker: ${WORKER_BASE}`);
  console.log(`模式: ${APPLY ? '实际写入 (--apply)' : 'dry-run（不写入，只打印）'}`);
  if (ONLY_INQUIRY_NO) console.log(`仅处理询价编号: ${ONLY_INQUIRY_NO}`);
  console.log('');

  const all = await fetchAllRecords();
  console.log(`共读取 ${all.length} 条询报价记录`);

  const candidates = ONLY_INQUIRY_NO
    ? all.filter((r) => r.inquiryNo === ONLY_INQUIRY_NO)
    : all;

  let skippedHasData = 0;
  let skippedNoSource = 0;
  const toUpdate = [];

  for (const record of candidates) {
    const hasExisting =
      (Array.isArray(record.purchaseSupplierStatuses) && record.purchaseSupplierStatuses.length > 0) ||
      (Array.isArray(record.purchaseQuotedStatuses) && record.purchaseQuotedStatuses.length > 0);
    if (hasExisting) {
      skippedHasData += 1;
      continue;
    }

    const patch = computePatch(record);
    if (!patch) {
      skippedNoSource += 1;
      continue;
    }

    toUpdate.push({ record, patch });
  }

  console.log(`跳过（已有采购部专属状态数据）：${skippedHasData}`);
  console.log(`跳过（询报价登记里没有飞罗已报价/无法报价/已关闭可回填）：${skippedNoSource}`);
  console.log(`待回填：${toUpdate.length}`);
  console.log('');

  for (const { record, patch } of toUpdate) {
    console.log(`[${record.inquiryNo}] ${describePatch(patch)}`);
  }

  if (toUpdate.length === 0) {
    console.log('没有需要回填的记录，结束。');
    return;
  }

  if (!APPLY) {
    console.log('\n以上是 dry-run 结果，未写入任何数据。确认无误后加 --apply 参数实际执行。');
    return;
  }

  // 写入前先备份受影响记录的完整原始数据，便于回滚核对
  const backupDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `backup-before-task100-quote-backfill-${stamp}.json`);
  fs.writeFileSync(
    backupPath,
    JSON.stringify(toUpdate.map(({ record }) => record), null, 2),
    'utf8'
  );
  console.log(`\n已备份 ${toUpdate.length} 条记录的原始数据到 ${backupPath}`);

  let ok = 0;
  let failed = 0;
  for (const { record, patch } of toUpdate) {
    try {
      await putPatch(record.id, patch);
      ok += 1;
    } catch (error) {
      failed += 1;
      console.error(`[${record.inquiryNo}] 写入失败:`, error instanceof Error ? error.message : error);
    }
    // 轻微限速，避免瞬时打满 Worker
    await sleep(120);
  }

  console.log(`\n完成：成功 ${ok} 条，失败 ${failed} 条。`);
  if (failed > 0) {
    console.log('失败的记录可以单独用 --only=<询价编号> 重跑。');
  }
}

main().catch((error) => {
  console.error('脚本执行出错:', error);
  process.exit(1);
});
