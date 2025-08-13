'use client';
import React, { useState } from 'react';
import { RichTextEditor } from '@/components/ui/RichTextEditor';

export default function TestRichTextPage() {
  const [value, setValue] = useState('');

  // 示例富文本内容
  const sampleContent = `
    <h2>项目规格描述示例</h2>
    <p>这是一个<strong>富文本编辑器</strong>的示例，支持以下功能：</p>
    <ul>
      <li><em>文本格式化</em>：粗体、斜体、下划线</li>
      <li><u>颜色和字体大小</u>调整</li>
      <li>文本对齐方式</li>
      <li>列表（有序和无序）</li>
      <li>表格插入</li>
      <li>图片和链接</li>
    </ul>
    <p>表格示例（上方和下方都不应该有额外的空行）：</p>
    <table border="1" style="border-collapse: collapse; width: 100%;">
      <tr>
        <td style="padding: 8px; border: 1px solid #ccc;">产品名称</td>
        <td style="padding: 8px; border: 1px solid #ccc;">单价</td>
        <td style="padding: 8px; border: 1px solid #ccc;">销量</td>
        <td style="padding: 8px; border: 1px solid #ccc;">总收入</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #ccc;">智能手表</td>
        <td style="padding: 8px; border: 1px solid #ccc;">¥1,299</td>
        <td style="padding: 8px; border: 1px solid #ccc;">234</td>
        <td style="padding: 8px; border: 1px solid #ccc;">¥303,966</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #ccc;">蓝牙耳机</td>
        <td style="padding: 8px; border: 1px solid #ccc;">¥499</td>
        <td style="padding: 8px; border: 1px solid #ccc;">567</td>
        <td style="padding: 8px; border: 1px solid #ccc;">¥282,933</td>
      </tr>
    </table>
    <p>表格下方的内容应该紧贴表格，没有额外空行。</p>
  `;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">富文本编辑器测试</h1>
      
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-3">功能说明</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-600">
            <li>简化设计：移除所有工具栏，只保留编辑区域</li>
            <li>支持基本的富文本格式</li>
            <li>自动保存内容</li>
            <li>PDF预览中正确显示内容</li>
            <li><strong>极简设计</strong>：占用空间最小，适合表单集成</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">编辑器说明</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2">简化版富文本编辑器：</h4>
            <div className="text-sm text-blue-700">
              <p className="mb-2">这是一个简化的富文本编辑器，移除了所有工具栏，只保留编辑区域。</p>
              <p className="mb-2">用户可以直接在编辑器中输入文本，支持基本的富文本格式。</p>
              <p>编辑器会自动保存内容，并在PDF预览中正确显示。</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">示例内容</h2>
          <button
            onClick={() => setValue(sampleContent)}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors mb-4"
          >
            加载示例内容
          </button>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">富文本编辑器</h2>
          <RichTextEditor
            value={value}
            onChange={setValue}
            placeholder="开始输入富文本内容..."
            className="w-full"
          />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">HTML源码</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-40">
            {value || '(空)'}
          </pre>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">使用提示</h2>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-800 mb-2">💡 使用技巧：</h4>
                         <ul className="text-sm text-yellow-700 space-y-1">
               <li>• 直接在编辑器中输入文本</li>
               <li>• 支持基本的富文本格式</li>
               <li>• 内容会自动保存</li>
               <li>• 所有内容都会在PDF预览中正确显示</li>
               <li>• 极简设计，占用空间最小</li>
             </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
