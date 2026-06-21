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
    <p className="block truncate text-xs font-medium leading-4">
      {record.supplierStatuses.map((supplier, index) => {
        const colorClass = getSupplierStatusClass(supplier);
        const label = supplier.quoteDate
          ? `${supplier.supplierShortName}${roundDateBrackets(supplier.quoteDate)}`
          : supplier.supplierShortName;
        return (
          <span key={supplier.id}>
            <span className={colorClass}>{label}</span>
            {index < record.supplierStatuses.length - 1 && <span className="text-gray-300">,</span>}
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
    </p>
  );
}
