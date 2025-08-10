'use client';

interface BankInfoSectionProps {
  showBank: boolean;
}

export function BankInfoSection({ showBank }: BankInfoSectionProps) {
  if (!showBank) return null;

  return (
    <div className="mt-2 p-3 bg-gray-50 dark:bg-[#3A3A3C] rounded-lg border border-gray-200 dark:border-gray-600">
      <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">开票资料：</h4>
      <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400 leading-tight">
        <p><span className="font-medium">公司名称：</span>上海飞罗贸易有限公司</p>
        <p><span className="font-medium">公司住所：</span>中国（上海）自由贸易区富特北路211号302部位368室</p>
        <p><span className="font-medium">电话：</span>4008930883</p>
        <p><span className="font-medium">税号：</span>913101150935185537</p>
        <p><span className="font-medium">开户行及账号：</span>中国银行上海市外高桥保税区支行 455969175704</p>
      </div>
    </div>
  );
} 