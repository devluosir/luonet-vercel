import { Settings } from 'lucide-react';
import { useMailStore } from '../state/mail.store';
import type { MailTab } from '../types';
import { SelectField } from './SelectField';
import { LANGUAGE_OPTIONS, MAIL_TYPE_OPTIONS, FORM_LABELS } from '../utils/constants';

interface MailTabsProps {
  activeTab: MailTab;
  onTabChange: (tab: MailTab) => void;
  showSettings: boolean;
  onToggleSettings: () => void;
  field: any;
  mailType: string;
  setMailType: (type: string) => void;
}

export function MailTabs({ activeTab, onTabChange, showSettings, onToggleSettings, field, mailType, setMailType }: MailTabsProps) {
  const tabs: { value: MailTab; label: string }[] = [
    { value: 'mail', label: 'Mail' },
    { value: 'reply', label: 'Reply' }
  ];

  return (
    <div className="flex justify-between items-center mb-8 relative">
      {/* 选项卡 */}
      <div className="flex gap-1 p-1 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-2xl border border-gray-200 dark:border-gray-600 shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onTabChange(tab.value)}
            className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
              activeTab === tab.value
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg transform scale-105'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-white dark:hover:bg-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 设置区域 */}
      <div className="flex items-center gap-3">
        {/* 语言选择 */}
        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
          showSettings 
            ? 'opacity-100 max-w-[200px]' 
            : 'opacity-0 max-w-0'
        }`}>
          <SelectField
            {...field(activeTab === 'mail' ? 'language' : 'replyLanguage')}
            label=""
            options={LANGUAGE_OPTIONS}
            className="min-w-[120px]"
          />
        </div>

        {/* 邮件类型选择 */}
        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
          showSettings 
            ? 'opacity-100 max-w-[200px]' 
            : 'opacity-0 max-w-0'
        }`}>
          <SelectField
            value={activeTab === 'mail' ? mailType : field('replyType').value}
            onChange={(e) => activeTab === 'mail' ? setMailType(e.target.value) : field('replyType').onChange(e)}
            label=""
            options={MAIL_TYPE_OPTIONS}
            className="min-w-[120px]"
          />
        </div>

        {/* 设置按钮 */}
        <button
          onClick={onToggleSettings}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 h-10 relative group cursor-pointer rounded-lg transition-all duration-300 flex-shrink-0 ${
            showSettings
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
          title="设置"
        >
          {/* 图标容器 */}
          <div className="icon-container w-4 h-4 flex items-center justify-center flex-shrink-0">
            <Settings className="w-4 h-4 text-current" />
          </div>

          {/* 文字 */}
          <span className="text-sm font-medium whitespace-nowrap">
            设置
          </span>
        </button>
      </div>
    </div>
  );
}
