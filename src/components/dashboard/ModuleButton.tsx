import React from 'react';

interface Module {
  id: string;
  name: string;
  path: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

interface ModuleButtonProps {
  module: Module;
  onClick: (module: Module) => void;
  onHover?: (module: Module) => void;
  quotationCount?: number;
  confirmationCount?: number;
  domesticQuotationCount?: number;
  domesticContractCount?: number;
  invoiceCount?: number;
  packingCount?: number;
  purchaseCount?: number;
}

const MODULE_STYLES: Record<string, { card: string; icon: string; badge: string }> = {
  quotation: {
    card: 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/15',
    icon: 'text-blue-600 dark:text-blue-400',
    badge: 'bg-blue-600 dark:bg-blue-500',
  },
  'quotation-domestic': {
    card: 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/15',
    icon: 'text-blue-600 dark:text-blue-400',
    badge: 'bg-blue-600 dark:bg-blue-500',
  },
  confirmation: {
    card: 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/15',
    icon: 'text-emerald-600 dark:text-emerald-400',
    badge: 'bg-emerald-600 dark:bg-emerald-500',
  },
  'quotation-domestic-contract': {
    card: 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/15',
    icon: 'text-emerald-600 dark:text-emerald-400',
    badge: 'bg-emerald-600 dark:bg-emerald-500',
  },
  packing: {
    card: 'bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-500/10 dark:hover:bg-cyan-500/15',
    icon: 'text-cyan-600 dark:text-cyan-400',
    badge: 'bg-cyan-600 dark:bg-cyan-500',
  },
  invoice: {
    card: 'bg-violet-50 hover:bg-violet-100 dark:bg-violet-500/10 dark:hover:bg-violet-500/15',
    icon: 'text-violet-600 dark:text-violet-400',
    badge: 'bg-violet-600 dark:bg-violet-500',
  },
  purchase: {
    card: 'bg-orange-50 hover:bg-orange-100 dark:bg-orange-500/10 dark:hover:bg-orange-500/15',
    icon: 'text-orange-600 dark:text-orange-400',
    badge: 'bg-orange-600 dark:bg-orange-500',
  },
  'ai-email': {
    card: 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/15',
    icon: 'text-indigo-600 dark:text-indigo-400',
    badge: 'bg-indigo-600 dark:bg-indigo-500',
  },
  history: {
    card: 'bg-pink-50 hover:bg-pink-100 dark:bg-pink-500/10 dark:hover:bg-pink-500/15',
    icon: 'text-pink-600 dark:text-pink-400',
    badge: 'bg-pink-600 dark:bg-pink-500',
  },
  customer: {
    card: 'bg-fuchsia-50 hover:bg-fuchsia-100 dark:bg-fuchsia-500/10 dark:hover:bg-fuchsia-500/15',
    icon: 'text-fuchsia-600 dark:text-fuchsia-400',
    badge: 'bg-fuchsia-600 dark:bg-fuchsia-500',
  },
};

const DEFAULT_STYLE = {
  card: 'bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10',
  icon: 'text-gray-600 dark:text-gray-300',
  badge: 'bg-gray-600 dark:bg-gray-500',
};

export const ModuleButton: React.FC<ModuleButtonProps> = ({
  module,
  onClick,
  onHover,
  quotationCount = 0,
  confirmationCount = 0,
  domesticQuotationCount = 0,
  domesticContractCount = 0,
  invoiceCount = 0,
  packingCount = 0,
  purchaseCount = 0,
}) => {
  const Icon = module.icon;
  const style = MODULE_STYLES[module.id] ?? DEFAULT_STYLE;

  const getCountForModule = (moduleId: string): number => {
    switch (moduleId) {
      case 'quotation': return quotationCount;
      case 'confirmation': return confirmationCount;
      case 'quotation-domestic': return domesticQuotationCount;
      case 'quotation-domestic-contract': return domesticContractCount;
      case 'invoice': return invoiceCount;
      case 'packing': return packingCount;
      case 'purchase': return purchaseCount;
      default: return 0;
    }
  };

  const count = getCountForModule(module.id);

  return (
    <button
      className={`
        group relative flex h-24 w-full cursor-pointer items-center justify-start gap-3 rounded-2xl
        border border-white/70 px-4 py-4 text-left text-gray-900 shadow-sm backdrop-blur-sm
        transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md active:translate-y-0
        dark:border-white/10 dark:text-white dark:shadow-black/20
        sm:gap-4 sm:px-5 sm:py-5
        ${style.card}
      `}
      onClick={() => onClick(module)}
      onMouseEnter={() => onHover?.(module)}
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/55 ring-1 ring-white/70 transition-transform duration-200 group-hover:scale-105 dark:bg-white/5 dark:ring-white/10 ${style.icon}`}>
        <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
      </div>

      <div className="min-w-0 flex-1 truncate text-sm font-semibold leading-tight sm:text-base">
        {module.name}
      </div>

      {count > 0 && (
        <div className={`absolute right-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold leading-none text-white shadow-sm sm:right-2.5 sm:top-2.5 ${style.badge}`}>
          <span>{count > 9999 ? '9999+' : count}</span>
        </div>
      )}
    </button>
  );
};
