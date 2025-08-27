#!/usr/bin/env node
/**
 * generate-test-checklist.js
 * 从按照模板填写的 Markdown 中提取“标签”和“风险”勾选项，生成测试清单（Markdown）。
 * 无第三方依赖，Node 16+ 运行。
 *
 * 用法：
 *   node generate-test-checklist.js path/to/FILLED_REQUEST.md > TEST_CHECKLIST.md
 */

const fs = require('fs');
const path = require('path');

if (process.argv.length < 3) {
  console.error('Usage: node generate-test-checklist.js <filled_markdown_file>');
  process.exit(1);
}

const file = process.argv[2];
const md = fs.readFileSync(file, 'utf8');

// 工具函数
const between = (text, startMark, endMark) => {
  const s = text.indexOf(startMark);
  if (s === -1) return '';
  const e = text.indexOf(endMark, s + startMark.length);
  return e === -1 ? text.slice(s + startMark.length) : text.slice(s + startMark.length, e);
};

const section = (title) => {
  // 标题行可能是 "## 2. 调整范围" 或 "## 6. 风险与验证点（...）"
  const regex = new RegExp(`^##\\s+${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?(?=^##\\s+|\\Z)`, 'm');
  const m = md.match(regex);
  return m ? m[0] : '';
};

// 解析“关联功能标签”复选框
const scope = section('2\\. 调整范围');
const tagLines = scope.split('\n').filter(l => /\[.\]\s*(tab-switching|autosave|pdf-generate|pdf-filename|preview-flow|data-import|data-export|init-once|currency|items-table|other-fees|customer-info|notes\/bank\/payment-terms|error-handling|permissions|performance)/.test(l));

const activeTags = tagLines
  .filter(l => /\[x\]/i.test(l)) // 被勾选
  .map(l => l.replace(/.*\]\s*/, '').trim());

// 解析“风险与验证点”勾选项
const riskSec = section('6\\. 风险与验证点');
const riskLines = riskSec.split('\n').filter(l => /^\s*-\s*\[.\]/.test(l));
const activeRisks = riskLines.filter(l => /\[x\]/i.test(l)).map(l => l.replace(/.*\]\s*/, '').trim());

// 基础测试模块库（按你项目测试清单定制）
const LIB = {
  'tab-switching': [
    '切换 Quotation ↔ Confirmation，URL `?tab=` 同步且无闪烁',
    '同值切换不触发渲染（useCallback + 同值短路）'
  ],
  'autosave': [
    '新页 2s 落一份草稿；修改后仅保存一次（引用稳定：JSON.stringify(data ?? getInitialQuotationData())）'
  ],
  'pdf-generate': [
    '重复点击按钮时第二次禁用；进度条 100% 后复位（finally 必复位）',
    '生成内容与 UI 数据一致（金额/币种/备注/印章等）'
  ],
  'pdf-filename': [
    'Confirmation 自动补合同号 working.contractNo，用作 PDF 文件名，且与预览一致'
  ],
  'preview-flow': [
    '预览数据 buildPreviewPayload 正确拼装；关闭预览后状态恢复'
  ],
  'data-import': [
    '剪贴板导入异常处理友好（空、格式错误、超大）',
    '导入后 items/otherFees 数据准确落地'
  ],
  'data-export': [
    '导出数据字段完整且格式正确'
  ],
  'init-once': [
    'useRef 闭环确保初始化仅执行一次；分离 tab 与 data 初始化'
  ],
  'currency': [
    '不同货币符号渲染正确；金额计算不受影响；PDF 内外一致'
  ],
  'items-table': [
    'items 安全展开 ...(data.items || [])；增删改计算正确'
  ],
  'other-fees': [
    'otherFees 安全展开；增删改计算正确'
  ],
  'customer-info': [
    'Customer 信息表单联动正常；校验与格式化正确'
  ],
  'notes/bank/payment-terms': [
    '显示/隐藏配置正确；PDF 同步一致'
  ],
  'error-handling': [
    '网络错误 / 权限错误提示友好；不崩溃；可重试'
  ],
  'permissions': [
    '登录后权限即时可用；手动刷新权限正确更新并持久化'
  ],
  'performance': [
    '关键交互无卡顿；重渲染次数合理；内存无持续增长'
  ]
};

const RISK_LIB = {
  '性能回归（重渲染增加 / 初始化变慢）': [
    'Profiler 检查关键组件渲染次数与耗时',
    '初始化仅执行一次，首屏时长无明显回退'
  ],
  '无限循环（选择器 / 副作用依赖）': [
    '无 “Maximum update depth exceeded”',
    '选择器/副作用依赖稳定（或已移除复杂选择器）'
  ],
  '状态丢失（初始化 / 保存 / 切换 Tab）': [
    '切换 Tab/生成/保存后状态保持一致',
    '刷新页面后草稿可恢复'
  ],
  'PDF错误（金额、币种、文件名、印章等）': [
    'PDF 内容、格式、文件名与业务口径一致'
  ],
  '导入导出异常（格式 / 兼容性 / 边界值）': [
    '极端输入（空/大/异常）可处理并给出提示'
  ],
  'UI 兼容（移动端 / 中屏 / 大屏）': [
    '小/中/大屏布局正确，关键操作可达'
  ],
  '权限/会话（登录后权限同步 / 刷新权限）': [
    '初次登录即可获得权限并展示正确模块',
    '手动刷新后立刻生效并持久化'
  ]
};

// 生成输出
let out = [];
out.push('# 测试清单（由需求勾选自动生成）\n');
out.push('## 关联功能测试\n');
if (activeTags.length === 0) {
  out.push('- （未勾选标签，生成空白清单）\n');
} else {
  activeTags.forEach(tag => {
    const items = LIB[tag] || [`（无预置用例，请补充）`];
    out.push(`### ${tag}\n`);
    items.forEach(tc => out.push(`- [ ] ${tc}`));
    out.push('');
  });
}

out.push('## 风险验证测试\n');
if (activeRisks.length === 0) {
  out.push('- （未勾选风险项）\n');
} else {
  activeRisks.forEach(r => {
    const items = RISK_LIB[r] || ['（无预置用例，请补充）'];
    out.push(`### ${r}\n`);
    items.forEach(tc => out.push(`- [ ] ${tc}`));
    out.push('');
  });
}

out.push('## 通用回归测试（固定）\n');
out.push('- [ ] 构建成功，无编译错误，TypeScript 检查通过');
out.push('- [ ] 无无限循环与明显渲染抖动');
out.push('- [ ] 保存/生成流程完整，状态在 finally 中复位');
out.push('- [ ] 数据不可变性：不直接改 React 状态引用（使用 workingData / 安全展开）');
out.push('- [ ] 错误处理友好，不崩溃，可重试');
out.push('- [ ] 关键页面交互流畅，无性能回退\n');

process.stdout.write(out.join('\n'));
