'use client';

interface BankInfoSectionProps {
  showBank: boolean;
}

export function BankInfoSection({ showBank }: BankInfoSectionProps) {
  if (!showBank) return null;

  return (
    <div className="mt-3 p-4 bg-gray-50 dark:bg-[#3A3A3C] rounded-xl border border-gray-200 dark:border-gray-600">
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">开票资料：</h4>
      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
        <p>公司名称：上海飞罗贸易有限公司</p>
        <p>公司住所：中国（上海）自由贸易区富特北路211号302部位368室</p>
        <p>电话：4008930883</p>
        <p>税号：913101150935185537</p>
        <p>开户行及账号：中国银行上海市外高桥保税区支行 455969175704</p>
      </div>
    </div>
  );
} 