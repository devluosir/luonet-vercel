'use client';

import { PurchaseOrderData } from '@/types/purchase';

interface SettingsPanelProps {
  data: PurchaseOrderData;
  onDataChange: (data: PurchaseOrderData) => void;
}

export function SettingsPanel({ data, onDataChange }: SettingsPanelProps) {
  // 设置面板现在为空，因为From选择器已移到基础信息中，印章选择器已移到第6区域
  return (
    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/50 rounded-lg p-3 shadow-sm">
      <div className="text-center text-sm text-blue-700 dark:text-blue-300">
        设置选项已移至相应位置
      </div>
    </div>
  );
} 