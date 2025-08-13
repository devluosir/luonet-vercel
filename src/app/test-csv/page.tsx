'use client';
import React, { useState } from 'react';
import { CSVTextarea } from '@/components/ui/CSVTextarea';

export default function TestCSVPage() {
  const [value, setValue] = useState('');

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">CSV文本框功能测试</h1>
      
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-3">功能说明</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-600">
            <li>支持制表符(Tab键)输入，可以制作简单的表格</li>
            <li>支持CSV格式数据粘贴，可直接从Excel复制数据</li>
            <li>按Ctrl+T可以切换表格视图，方便编辑</li>
            <li>在表格视图中可以添加/删除行和列</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">测试数据</h2>
          <p className="text-sm text-gray-600 mb-2">你可以复制以下数据来测试：</p>
          <div className="bg-gray-100 p-3 rounded text-sm font-mono">
            产品名称	规格	数量	单价	备注<br/>
            螺丝	M3x10	100	0.5	不锈钢<br/>
            螺母	M3	100	0.3	配套使用<br/>
            垫片	M3	200	0.1	防松动
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">CSV文本框</h2>
          <CSVTextarea
            value={value}
            onChange={setValue}
            placeholder="在这里输入或粘贴CSV数据..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={5}
          />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">当前值</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {value || '(空)'}
          </pre>
        </div>
      </div>
    </div>
  );
}
