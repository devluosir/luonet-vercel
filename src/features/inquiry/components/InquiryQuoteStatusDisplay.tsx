'use client';

import type { InquiryRecord } from '../types';
import {
  getRecordColorState,
  getSupplierStatusClass,
  roundDateBrackets,
  stripDateBrackets,
} from '../utils/inquiryUtils';

interface Props {
  record: InquiryRecord;
}

export function InquiryQuoteStatusDisplay({ record }: Props) {
  const rowColor = getRecordColorState(record);

  // 防御性兜底：受限视图/异常数据可能缺失 supplierStatuses/quotedStatuses 字段
  const supplierStatuses = record.supplierStatuses ?? [];
  const quotedStatuses = record.quotedStatuses ?? [];

  const supplierParts = supplierStatuses.map((supplier) =>
    supplier.quoteDate
      ? `${supplier.supplierShortName}${roundDateBrackets(supplier.quoteDate)}`
      : supplier.supplierShortName
  );
  const regularStatuses = quotedStatuses.filter(
    (s) => s.type !== 'unavailable' && s.type !== 'supplemented' && s.type !== 'closed'
  );
  const unavailableStatus = quotedStatuses.find((s) => s.type === 'unavailable');
  const closedStatus = quotedStatuses.find((s) => s.type === 'closed');
  const supplementedStatus = quotedStatuses.find((s) => s.type === 'supplemented');
  const quotedParts = regularStatuses.map(
    (status) => `${stripDateBrackets(status.quoteDate)}${status.supplierShortName}${status.version}`
  );
  const specialParts = [
    supplementedStatus ? `已补充(${stripDateBrackets(supplementedStatus.quoteDate)})` : '',
    unavailableStatus ? `无法报价(${stripDateBrackets(unavailableStatus.quoteDate)})` : '',
    closedStatus ? `询价关闭(${stripDateBrackets(closedStatus.quoteDate)})` : '',
  ].filter(Boolean);
  const statusTitle = `${supplierParts.join(',')}/${[...quotedParts, ...specialParts].join(',')}`;

  return (
    <p className="m-0 block w-full max-w-full truncate whitespace-nowrap text-[13px] font-medium leading-4" title={statusTitle}>
      {supplierStatuses.map((supplier, index) => {
        const colorClass = getSupplierStatusClass(supplier);
        const label = supplierParts[index];
        return (
          <span key={supplier.id}>
            <span className={colorClass}>{label}</span>
            {index < supplierStatuses.length - 1 && <span className="text-gray-300">,</span>}
          </span>
        );
      })}

      <span className="px-0.5 text-blue-600 dark:text-blue-400">/</span>

      {regularStatuses.map((status, index) => (
        <span key={status.id}>
          <span className={rowColor}>
            {stripDateBrackets(status.quoteDate)}{status.supplierShortName}{status.version}
          </span>
          {index < regularStatuses.length - 1 && <span className="text-gray-300">,</span>}
        </span>
      ))}

      {supplementedStatus && (
        <span className="text-yellow-500">
          {regularStatuses.length > 0 && <span className="text-gray-300">,</span>}
          已补充({stripDateBrackets(supplementedStatus.quoteDate)})
        </span>
      )}

      {unavailableStatus && (
        <span className="text-gray-400">
          {(regularStatuses.length > 0 || Boolean(supplementedStatus)) && (
            <span className="text-gray-300">,</span>
          )}
          无法报价({stripDateBrackets(unavailableStatus.quoteDate)})
        </span>
      )}

      {closedStatus && (
        <span className="text-gray-400">
          {(regularStatuses.length > 0 || Boolean(supplementedStatus) || Boolean(unavailableStatus)) && (
            <span className="text-gray-300">,</span>
          )}
          询价关闭({stripDateBrackets(closedStatus.quoteDate)})
        </span>
      )}
    </p>
  );
}
