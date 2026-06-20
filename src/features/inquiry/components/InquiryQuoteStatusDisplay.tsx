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

  const regularStatuses = record.quotedStatuses.filter(
    (s) => s.type !== 'unavailable' && s.type !== 'supplemented'
  );
  const unavailableStatus = record.quotedStatuses.find((s) => s.type === 'unavailable');
  const supplementedStatus = record.quotedStatuses.find((s) => s.type === 'supplemented');

  return (
    // inline 渲染，彻底消除 flex gap 带来的逗号间距
    <p className="text-xs font-medium leading-5">
      {/* 供应商：飞罗,昆同(6.21) */}
      {record.supplierStatuses.map((supplier, index) => {
        const colorClass = getSupplierStatusClass(supplier);
        const label = supplier.quoteDate
          ? `${supplier.supplierShortName}${roundDateBrackets(supplier.quoteDate)}`
          : supplier.supplierShortName;
        return (
          <span key={supplier.id}>
            <span className={colorClass}>{label}</span>
            {index < record.supplierStatuses.length - 1 && (
              <span className="text-gray-400">,</span>
            )}
          </span>
        );
      })}

      {/* 分隔符：/ 无外边距 */}
      <span className="text-gray-300">/</span>

      {/* 已报价：6.21昆同a,6.21昆同b */}
      {regularStatuses.map((status, index) => (
        <span key={status.id}>
          <span className={rowColor}>
            {stripDateBrackets(status.quoteDate)}{status.supplierShortName}{status.version}
          </span>
          {index < regularStatuses.length - 1 && (
            <span className="text-gray-400">,</span>
          )}
        </span>
      ))}

      {/* 已补充信息 */}
      {supplementedStatus && (
        <span className="text-yellow-500">
          {regularStatuses.length > 0 && <span className="text-gray-400">,</span>}
          已补充({stripDateBrackets(supplementedStatus.quoteDate)})
        </span>
      )}

      {/* 无法报价 */}
      {unavailableStatus && (
        <span className="text-gray-400">
          {(regularStatuses.length > 0 || !!supplementedStatus) && <span>,</span>}
          无法报价({stripDateBrackets(unavailableStatus.quoteDate)})
        </span>
      )}
    </p>
  );
}
