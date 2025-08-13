'use client';
import React, { useState } from 'react';
import { CSVTextarea } from '@/components/ui/CSVTextarea';

export default function TestCSVPage() {
  const [value, setValue] = useState('');

  // 包含长文本的测试数据
  const longTextExample = `产品名称	规格描述	数量	单价	备注
螺丝	M3x10不锈钢螺丝，表面镀锌处理，符合ISO标准，适用于各种机械设备安装	100	0.5	不锈钢材质，防腐蚀性能好
螺母	M3配套螺母，六角头设计，便于安装和拆卸，材质为碳钢	100	0.3	与螺丝配套使用，确保连接牢固
垫片	M3平垫片，厚度0.5mm，外径6mm，内径3.2mm，用于防止松动	200	0.1	防松动设计，提高连接可靠性
弹簧	压缩弹簧，线径0.8mm，外径8mm，自由长度20mm，压缩行程15mm	50	1.2	弹性好，使用寿命长
轴承	深沟球轴承，内径10mm，外径26mm，厚度8mm，适用于电机和传动装置	20	8.5	高精度轴承，运转平稳
密封圈	O型密封圈，内径15mm，线径2mm，材质为丁腈橡胶，耐油耐温	80	0.8	密封性能优良，适用于液压系统`;

  // 包含合并单元格的测试数据
  const mergedCellExample = `产品类别	规格	数量	单价	备注
紧固件	M3系列	300	0.3	包含螺丝、螺母、垫片
	M4系列	200	0.4	包含螺丝、螺母、垫片
	M5系列	150	0.6	包含螺丝、螺母、垫片
机械零件	弹簧	50	1.2	压缩弹簧
	轴承	20	8.5	深沟球轴承
	密封圈	80	0.8	O型密封圈`;

  // 模拟Excel复制的真实数据（包含空单元格的合并）
  const realExcelExample = `Line No.	Description	Q'TY	Unit	U/Price	Amount	D/T
	Maker: Shang					
	BRAND NEW .					
1	TEMPERATUR	2	PCS	439.00	878.00	STOCK
	Packing and h					
	TOTAL AMOU		878.00		`;

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
            <li><strong>新增：</strong>支持长文本自动换行和自适应列宽</li>
            <li><strong>新增：</strong>PDF预览中表格正确显示，支持文本换行</li>
            <li><strong>新增：</strong>支持合并单元格功能，可在表格视图中操作</li>
            <li><strong>新增：</strong>即见即所得粘贴，支持多种表格格式自动识别</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">测试数据</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">基础测试数据：</p>
              <div className="bg-gray-100 p-3 rounded text-sm font-mono">
                产品名称	规格	数量	单价	备注<br/>
                螺丝	M3x10	100	0.5	不锈钢<br/>
                螺母	M3	100	0.3	配套使用<br/>
                垫片	M3	200	0.1	防松动
              </div>
            </div>
            
                         <div>
               <p className="text-sm text-gray-600 mb-2">长文本测试数据（包含详细描述）：</p>
               <div className="bg-gray-100 p-3 rounded text-sm font-mono max-h-40 overflow-y-auto">
                 {longTextExample}
               </div>
               <button
                 onClick={() => setValue(longTextExample)}
                 className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
               >
                 加载长文本示例
               </button>
             </div>
             
             <div>
               <p className="text-sm text-gray-600 mb-2">合并单元格测试数据：</p>
               <div className="bg-gray-100 p-3 rounded text-sm font-mono max-h-40 overflow-y-auto">
                 {mergedCellExample}
               </div>
               <button
                 onClick={() => setValue(mergedCellExample)}
                 className="mt-2 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm"
               >
                 加载合并单元格示例
               </button>
             </div>
             
             <div>
               <p className="text-sm text-gray-600 mb-2">真实Excel数据测试（包含空单元格合并）：</p>
               <div className="bg-gray-100 p-3 rounded text-sm font-mono max-h-40 overflow-y-auto">
                 {realExcelExample}
               </div>
               <button
                 onClick={() => setValue(realExcelExample)}
                 className="mt-2 px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 text-sm"
               >
                 加载真实Excel示例
               </button>
             </div>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">内嵌表格编辑器</h2>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-yellow-800 mb-2">💡 内嵌编辑器功能：</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• 直接在页面中编辑表格，无需弹窗</li>
              <li>• 从Excel复制表格数据，点击"📋 粘贴表格"按钮</li>
              <li>• 支持添加/删除行和列</li>
              <li>• 支持合并和取消合并单元格</li>
              <li>• 智能识别Excel中的合并单元格结构</li>
            </ul>
          </div>
          <CSVTextarea
            value={value}
            onChange={setValue}
            placeholder="在这里输入或粘贴CSV数据..."
            className="w-full"
            rows={8}
          />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">当前值</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-40">
            {value || '(空)'}
          </pre>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">使用提示</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2">表格优化特性：</h4>
                         <ul className="text-sm text-blue-700 space-y-1">
               <li>• 列宽会根据内容自动调整，长文本会自动换行</li>
               <li>• 表格行高会根据内容自动调整</li>
               <li>• PDF预览中表格会正确显示边框和格式</li>
               <li>• 支持中文长文本的正确换行和显示</li>
               <li>• 表格在PDF中会自动分页，避免内容被截断</li>
               <li>• 支持合并单元格，可在表格视图中选择多个单元格进行合并</li>
               <li>• 合并的单元格在PDF中会正确显示跨行跨列效果</li>
               <li>• 即见即所得粘贴，支持Excel、Google Sheets等多种表格格式</li>
               <li>• 智能分隔符检测，自动识别制表符、逗号、分号等</li>
             </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
