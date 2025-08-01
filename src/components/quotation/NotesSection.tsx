import { QuotationData } from '@/types/quotation';
import { useEffect, useRef } from 'react';

interface NotesSectionProps {
  data: QuotationData;
  onChange: (data: QuotationData) => void;
}

// 参考invoice页面的简洁样式 - iOS兼容性更好
const textareaClassName = `w-full px-4 py-2.5 rounded-2xl
  bg-white/95 dark:bg-[#1c1c1e]/95
  border border-[#007AFF]/10 dark:border-[#0A84FF]/10
  focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 dark:focus:ring-[#0A84FF]/30
  placeholder:text-gray-400/60 dark:placeholder:text-gray-500/60
  text-[15px] leading-relaxed text-gray-800 dark:text-gray-100
  transition-all duration-300 ease-out
  hover:border-[#007AFF]/20 dark:hover:border-[#0A84FF]/20
  shadow-sm hover:shadow-md
  ios-optimized-input`;

// iOS光标优化样式 - 简化版本
const iosCaretStyle = {
  caretColor: '#007AFF',
  WebkitCaretColor: '#007AFF',
} as React.CSSProperties;

export function NotesSection({ data, onChange }: NotesSectionProps) {
  const textareaRefs = useRef<(HTMLTextAreaElement | null)[]>([]);

  const adjustHeight = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = '0';
    textarea.style.height = textarea.scrollHeight + 'px';
  };

  useEffect(() => {
    if (textareaRefs.current && textareaRefs.current.length > 0) {
      textareaRefs.current.forEach(textarea => {
        if (textarea) {
          adjustHeight(textarea);
        }
      });
    }
  }, [data.notes]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">Notes:</h3>
        <button
          type="button"
          onClick={() => {
            onChange({
              ...data,
              notes: [...data.notes, '']
            });
          }}
          className="px-3 h-7 rounded-lg
            bg-[#007AFF]/[0.08] dark:bg-[#0A84FF]/[0.08]
            hover:bg-[#007AFF]/[0.12] dark:hover:bg-[#0A84FF]/[0.12]
            active:bg-[#007AFF]/[0.18] dark:active:bg-[#0A84FF]/[0.18]
            text-[#007AFF] dark:text-[#0A84FF]
            text-[13px] font-medium
            flex items-center gap-1.5
            transition-all duration-200"
        >
          <span className="text-lg leading-none translate-y-[-1px]">+</span>
          <span>Add Note</span>
        </button>
      </div>

      <div className="space-y-3">
        {data.notes.map((note, index) => (
          <div key={index} className="flex items-start gap-3 group">
            <div 
              className="mt-[11px] text-[13px] font-medium text-[#86868B] dark:text-[#98989D] w-5 flex-shrink-0 text-center
                group-hover:text-[#FF3B30] dark:group-hover:text-[#FF453A]
                group-hover:bg-[#FF3B30]/10 dark:group-hover:bg-[#FF453A]/10
                cursor-pointer select-none transition-all duration-200 rounded"
              onClick={() => {
                const newNotes = [...data.notes];
                newNotes.splice(index, 1);
                onChange({
                  ...data,
                  notes: newNotes
                });
              }}
            >
              {index + 1}.
            </div>
            <div className="flex-1 relative group">
              <textarea
                ref={(el: HTMLTextAreaElement | null) => { textareaRefs.current[index] = el; }}
                value={note}
                onChange={(e) => {
                  const newNotes = [...data.notes];
                  newNotes[index] = e.target.value;
                  onChange({
                    ...data,
                    notes: newNotes
                  });
                  adjustHeight(e.target);
                }}
                className={textareaClassName}
                rows={1}
                style={{
                  height: 'auto',
                  minHeight: '41px',
                  overflow: 'hidden',
                  resize: 'none',
                  ...iosCaretStyle
                }}
                onInput={(e) => {
                  adjustHeight(e.target as HTMLTextAreaElement);
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 