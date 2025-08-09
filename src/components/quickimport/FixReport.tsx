import React from 'react';
import { CheckCircle, AlertTriangle, Trash2, GitMerge, Wrench, Hash } from 'lucide-react';
import type { FixReport as FixReportType } from './autofix';

export function FixReport({ report }: { report: FixReportType }) {
  if (report.totalPatches === 0) {
    return (
      <div className="inline-flex items-center gap-2 rounded-lg px-3 py-2 bg-green-50 text-green-700 text-sm">
        <CheckCircle className="h-4 w-4" />
        数据质量良好，无需修复
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="inline-flex items-center gap-2 rounded-lg px-3 py-2 bg-blue-50 text-blue-700 text-sm">
        <Wrench className="h-4 w-4" />
        自动修复完成：{report.summary}
      </div>
      
      {(report.droppedRows > 0 || report.mergedRows > 0 || report.fixedUnits > 0 || report.fixedNumbers > 0) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          {report.fixedUnits > 0 && (
            <FixStat 
              icon={<Hash className="h-3 w-3" />}
              label="标准化单位" 
              value={report.fixedUnits} 
              color="blue"
            />
          )}
          {report.fixedNumbers > 0 && (
            <FixStat 
              icon={<Hash className="h-3 w-3" />}
              label="清洗数值" 
              value={report.fixedNumbers} 
              color="green"
            />
          )}
          {report.mergedRows > 0 && (
            <FixStat 
              icon={<GitMerge className="h-3 w-3" />}
              label="合并重复" 
              value={report.mergedRows} 
              color="purple"
            />
          )}
          {report.droppedRows > 0 && (
            <FixStat 
              icon={<Trash2 className="h-3 w-3" />}
              label="移除无效" 
              value={report.droppedRows} 
              color="red"
            />
          )}
        </div>
      )}
    </div>
  );
}

function FixStat({ 
  icon, 
  label, 
  value, 
  color 
}: { 
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'blue' | 'green' | 'purple' | 'red';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-200',
    green: 'bg-green-50 text-green-700 ring-green-200',
    purple: 'bg-purple-50 text-purple-700 ring-purple-200',
    red: 'bg-red-50 text-red-700 ring-red-200'
  };

  return (
    <div className={`rounded-lg px-2 py-1 ring-1 ${colorClasses[color]}`}>
      <div className="flex items-center gap-1">
        {icon}
        <span className="opacity-70">{label}</span>
      </div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
