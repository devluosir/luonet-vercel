import React from 'react';

/**
 * 外贸报价 / 外贸合同 / 内销报价 / 内销合同 —— 双维度自定义图标
 *
 * v2 设计（见 CODEX_TASKS.md TASK-109 追加调整）：
 * 第一版右下角标用船/房子小图形，用 resvg 光栅化实测 16px/24px 都完全看不清（用户反馈"一点也看不清"）。
 * 改成实心圆角标 + 文字（外/内），角标外圈加一道白色描边把它从文档线条里"挖"出来，
 * 不再让角标颜色和文档描边颜色糊在一起。用同一套渲染管线（resvg + 项目自带 NotoSansSC-Bold 字体）
 * 实测过 16px/24px/48px：24px（首页卡片）清晰可辨；16px（侧边栏）在非 Retina 模拟下仍然偏紧，
 * 但已经明显好于船/房子图形版本，且真实 Retina 屏幕的抗锯齿效果会比这里的 1x 光栅模拟更清晰。
 *
 * 主体（文档轮廓 + 内部线条）区分「报价 vs 合同」：
 *   报价 = 文档 + 内部 2 条横线
 *   合同 = 文档 + 1 条横线 + 底部签名波浪线
 * 右下角标区分「外贸 vs 内销」：白色描边圆 + 实心色圆 + "外"/"内" 白色文字。
 *
 * 描边风格与项目里的 lucide-react 图标保持一致：
 * viewBox 0 0 24 24、stroke=currentColor、strokeWidth=1.6~2、round cap/join、fill=none（角标本身除外），
 * 可直接作为 `React.ComponentType<React.SVGProps<SVGSVGElement>>` 使用。
 */

type IconProps = React.SVGProps<SVGSVGElement>;

const SVG_BASE_PROPS = {
  viewBox: '0 0 24 24',
  fill: 'none' as const,
};

/** 文档轮廓（右上角折角），报价/合同共用 */
function DocumentOutline() {
  return (
    <g stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V6.5L13 2z" />
      <path d="M12.5 2v4.8h4.8" />
    </g>
  );
}

/** 报价内容：2 条横线（留出右下角标的空间） */
function QuotationLines() {
  return (
    <g stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
      <line x1="7.3" y1="11.2" x2="12.6" y2="11.2" />
      <line x1="7.3" y1="14" x2="12.6" y2="14" />
    </g>
  );
}

/** 合同内容：1 条横线 + 签名波浪线 */
function ContractLines() {
  return (
    <g stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <line x1="7.3" y1="11.2" x2="12.6" y2="11.2" />
      <path d="M7.3 14.6c.65-.9 1.3-.9 1.95 0s1.3.9 1.95 0" fill="none" />
    </g>
  );
}

/** 双维度角标：白色描边圆（把角标从文档线条里"挖"出来）+ 实心色圆 + 文字（外/内） */
function TradeBadge({ char }: { char: '外' | '内' }) {
  return (
    <g>
      <circle cx="18.2" cy="18.2" r="6.4" fill="white" />
      <circle cx="18.2" cy="18.2" r="5.3" fill="currentColor" />
      <text
        x="18.2"
        y="18.6"
        fontSize="7.6"
        fontWeight={700}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
      >
        {char}
      </text>
    </g>
  );
}

/** 外贸报价 */
export function ForeignQuotationIcon(props: IconProps) {
  return (
    <svg {...SVG_BASE_PROPS} {...props}>
      <DocumentOutline />
      <QuotationLines />
      <TradeBadge char="外" />
    </svg>
  );
}

/** 外贸合同 */
export function ForeignContractIcon(props: IconProps) {
  return (
    <svg {...SVG_BASE_PROPS} {...props}>
      <DocumentOutline />
      <ContractLines />
      <TradeBadge char="外" />
    </svg>
  );
}

/** 内销报价 */
export function DomesticQuotationIcon(props: IconProps) {
  return (
    <svg {...SVG_BASE_PROPS} {...props}>
      <DocumentOutline />
      <QuotationLines />
      <TradeBadge char="内" />
    </svg>
  );
}

/** 内销合同 */
export function DomesticContractIcon(props: IconProps) {
  return (
    <svg {...SVG_BASE_PROPS} {...props}>
      <DocumentOutline />
      <ContractLines />
      <TradeBadge char="内" />
    </svg>
  );
}
