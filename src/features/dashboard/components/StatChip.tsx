'use client';

import { useRouter } from 'next/navigation';

interface StatChipProps {
  /** 大部分统计项用 lucide-react 图标，报价/合同 4 项用 TradeDocIcons 自定义组件，类型放宽兼容两者 */
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  value: number;
  colorClass: string;
  path: string;
  loading?: boolean;
}

/**
 * 首页统计区的最小单元——紧凑徽标（图标 + 短标签 + 数字），自然宽度、不拉伸铺满。
 * 用于替代原来每行用 flex-1 等分拉伸的大长条样式，避免行与行之间因为项目数不同（7 项 vs 2 项）
 * 而在视觉上一个挤一个松，堆叠起来显得很重（见 TASK-110 追加调整：用户反馈"堆一起了"）。
 */
export function StatChip({ icon: Icon, label, value, colorClass, path, loading }: StatChipProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push(path)}
      className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 dark:hover:bg-gray-700/40"
      title={`查看${label}`}
    >
      <Icon className={`h-3.5 w-3.5 shrink-0 ${colorClass}`} />
      <span className="whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">{label}</span>
      {loading ? (
        <span className="inline-block h-4 w-5 animate-pulse rounded bg-gray-200 align-middle dark:bg-gray-700" />
      ) : (
        <span className={`text-sm font-bold tabular-nums leading-none ${colorClass}`}>{value}</span>
      )}
    </button>
  );
}
