import { QuotationData } from '@/types/quotation';

interface PaymentTermsSectionProps {
  data: QuotationData;
  onChange: (data: QuotationData) => void;
}

// iOS光标优化样式
const iosCaretStyle = {
  caretColor: '#007AFF',
  WebkitCaretColor: '#007AFF',
  WebkitTextFillColor: 'initial',
  WebkitOpacity: 1,
  opacity: 1,
  WebkitAppearance: 'none',
  appearance: 'none',
  touchAction: 'manipulation',
  WebkitTouchCallout: 'none',
  WebkitUserSelect: 'text',
  userSelect: 'text'
} as React.CSSProperties;

export function PaymentTermsSection({ data, onChange }: PaymentTermsSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Payment Terms:</h3>
      
      <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800/20">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={data.showPaymentTerms}
              onChange={(e) => {
                onChange({
                  ...data,
                  showPaymentTerms: e.target.checked
                });
              }}
              className="rounded border-gray-300"
            />
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-600 dark:text-gray-400">Full paid not later than</span>
              <input
                type="date"
                value={data.paymentDate}
                onChange={e => onChange({
                  ...data,
                  paymentDate: e.target.value
                })}
                className="px-3 py-1 rounded-xl
                  bg-white/95 dark:bg-[#1c1c1e]/95
                  border border-[#007AFF]/10 dark:border-[#0A84FF]/10
                  focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 dark:focus:ring-[#0A84FF]/30
                  text-red-500 dark:text-red-400
                  text-[14px]
                  transition-all duration-300 ease-out"
                style={{ 
                  colorScheme: 'light dark',
                  width: '150px',
                  minWidth: '150px',
                  maxWidth: '150px',
                  flexShrink: 0,
                  flexGrow: 0,
                  ...iosCaretStyle
                } as React.CSSProperties}
                pattern="\d{4}-\d{2}-\d{2}"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">by telegraphic transfer.</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <textarea
              value={data.additionalPaymentTerms}
              onChange={(e) => onChange({
                ...data,
                additionalPaymentTerms: e.target.value
              })}
              placeholder="Enter additional remarks (each line will be a new payment term)"
              className="w-full px-4 py-2.5 rounded-2xl
                bg-white/95 dark:bg-[#1c1c1e]/95
                border border-[#007AFF]/10 dark:border-[#0A84FF]/10
                focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 dark:focus:ring-[#0A84FF]/30
                placeholder:text-gray-400/60 dark:placeholder:text-gray-500/60
                text-[15px] leading-relaxed text-gray-800 dark:text-gray-100
                transition-all duration-300 ease-out
                hover:border-[#007AFF]/20 dark:hover:border-[#0A84FF]/20
                min-h-[4em] resize"
              style={iosCaretStyle}
              rows={2}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={data.showInvoiceReminder}
              onChange={e => onChange({
                ...data,
                showInvoiceReminder: e.target.checked
              })}
              className="rounded border-gray-300 text-[#007AFF] dark:text-[#0A84FF] focus:ring-[#007AFF]/20 dark:focus:ring-[#0A84FF]/20"
            />
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Please state our contract no. <span className="text-red-500">&quot;{data.contractNo}&quot;</span> on your payment documents.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 