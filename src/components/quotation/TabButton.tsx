interface TabButtonProps {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

export function TabButton({ active, onClick, children }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-8 py-3 rounded-2xl text-sm font-medium transition-all duration-300
        ${active 
          ? 'bg-[#007AFF] text-white shadow-lg shadow-[#007AFF]/25 scale-[1.02] dark:bg-[#0A84FF] dark:shadow-[#0A84FF]/25' 
          : 'bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl hover:shadow-md text-gray-600 dark:text-gray-400'
        }`}
    >
      {children}
    </button>
  );
} 