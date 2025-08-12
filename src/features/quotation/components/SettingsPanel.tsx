import React from 'react';
import { FormField } from '@/features/core';

interface SettingsPanelProps {
  showBank: boolean;
  showStamp: boolean;
  onUpdate: (patch: any) => void;
  isReadOnly: boolean;
}

export function SettingsPanel({ showBank, showStamp, onUpdate, isReadOnly }: SettingsPanelProps) {
  return (
    <div className="space-y-4">
      <h4 className="text-md font-medium">显示设置</h4>
      
      <div className="space-y-3">
        <FormField label="显示银行信息">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={showBank}
              onChange={(e) => onUpdate({ showBank: e.target.checked })}
              disabled={isReadOnly}
              className="mr-2"
            />
            在文档中显示银行账户信息
          </label>
        </FormField>
        
        <FormField label="显示印章">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={showStamp}
              onChange={(e) => onUpdate({ showStamp: e.target.checked })}
              disabled={isReadOnly}
              className="mr-2"
            />
            在文档中显示公司印章
          </label>
        </FormField>
      </div>
    </div>
  );
}
