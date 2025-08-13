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
  const tabs: Array<{ value: MailTab; label: string }> = [
    { value: 'mail', label: 'Mail' },
    { value: 'reply', label: 'Reply' }
  ];

  // 构建设置按钮的CSS变量对象
  const settingsButtonVariables = {
    '--bg-gradient': 'linear-gradient(135deg, rgba(107, 114, 128, 0.08), rgba(107, 114, 128, 0.12))',
    '--text-color': '#171717',
    '--icon-color': '#6b7280',
    '--shadow': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  };

  return (
    <div className="flex justify-between items-center mb-8 relative">
      {/* 选项卡 */}
      <div className="mail-tabs-container flex gap-1 p-1 rounded-2xl">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onTabChange(tab.value)}
            className={`mail-tab-button px-6 py-3 rounded-xl text-sm transition-all duration-300 ${
              activeTab === tab.value ? 'active' : ''
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
          className={`mail-settings-button flex items-center justify-center gap-2 px-4 py-2.5 h-10 relative group cursor-pointer rounded-lg transition-all duration-300 flex-shrink-0 ${
            showSettings ? 'active' : ''
          }`}
          style={settingsButtonVariables as React.CSSProperties}
          title="设置"
        >
          {/* 图标容器 */}
          <div className="icon-container w-4 h-4 flex items-center justify-center flex-shrink-0">
            <Settings className="icon w-4 h-4" />
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
