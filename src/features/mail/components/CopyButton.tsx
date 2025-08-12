import { Copy } from 'lucide-react';
import { useMailCopy } from '../hooks/useMailCopy';

export function CopyButton() {
  const { copyContent, copySuccess, hasContent } = useMailCopy();

  return (
    <button
      aria-label="Copy content"
      onClick={() => copyContent()}
      className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      disabled={!hasContent}
    >
      {copySuccess && (
        <span className="absolute -top-8 -left-2 bg-black/75 text-white text-xs py-1 px-2 rounded whitespace-nowrap">
          Copied!
        </span>
      )}
              <Copy className={`w-4 h-4 ${
          !hasContent 
            ? 'text-gray-400 dark:text-gray-500' 
            : 'text-gray-600 dark:text-gray-300'
        }`} />
    </button>
  );
}
