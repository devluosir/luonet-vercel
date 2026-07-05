import { useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { PackingData } from '../types';
import { formatExcelFileName } from '../utils/formatters';
import { savePackingHistory } from '../services/packingHistoryService';
import { downloadPdf, previewPdf } from '../services/packingPdfService';
import { useToast } from '@/components/ui/Toast';

export const usePackingActions = (data: PackingData, editId?: string) => {
  const pathname = usePathname();
  const { showToast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // 生成PDF
  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    try {
      // 获取编辑 ID（从 URL 或 state）
      const existingId = editId || (pathname?.startsWith('/packing/edit/') ? pathname.split('/').pop() : undefined);

      // 保存记录
      const _saveResult = await savePackingHistory(data, existingId);

      // 生成PDF
      await downloadPdf(data);
    } catch (error) {
      console.error('Error generating PDF:', error);
      showToast('装箱单PDF生成失败，请重试', 'error');
    } finally {
      setIsGenerating(false);
    }
  }, [data, editId, pathname, showToast]);

  // 预览功能
  const handlePreview = useCallback(async () => {
    try {
      const blob = await previewPdf(data);
      return blob;
    } catch (error) {
      console.error('Preview failed:', error);
      showToast('装箱单预览生成失败，请重试', 'error');
    }
  }, [data, showToast]);

  // 独立保存功能
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      // 获取编辑 ID（从 URL 或 state）
      const existingId = editId || (pathname?.startsWith('/packing/edit/') ? pathname.split('/').pop() : undefined);

      // 保存记录
      const saveResult = await savePackingHistory(data, existingId);

      if (saveResult) {
        setSaveMessage('保存成功');
        showToast('保存成功', 'success');
        // 如果是新记录，更新 editId
        if (!existingId && saveResult.id) {
          // 这里可以通过回调函数更新 editId
          console.log('新记录已保存，ID:', saveResult.id);
        }
      } else {
        setSaveMessage('保存失败');
        showToast('保存失败，请重试', 'error');
      }
    } catch (error) {
      console.error('Error saving packing data:', error);
      setSaveMessage('保存失败');
      showToast('保存失败，请重试', 'error');
    } finally {
      setIsSaving(false);
      // 3秒后清除消息
      setTimeout(() => setSaveMessage(''), 3000);
    }
  }, [data, editId, pathname, showToast]);

  // 导出Excel功能
  const handleExportExcel = useCallback(() => {
    try {
      // 格式化数值函数
      const formatNumber = (value: number): string => {
        if (value === 0) return '0';
        if (!value || isNaN(value)) return '';
        return Number(value.toFixed(2)).toString();
      };

      // 准备Excel数据
      const excelData = [];

      // 添加标题行
      const headers = ['No.', 'Description', 'HS Code', 'Quantity', 'Unit', 'Unit Price', 'Total Price', 'Net Weight', 'Gross Weight', 'Package Qty', 'Dimensions'];
      excelData.push(headers);

      // 添加商品数据
      data.items.forEach((item) => {
        const row = [
          item.serialNo,
          item.description,
          item.hsCode,
          item.quantity,
          item.unit,
          formatNumber(item.unitPrice),
          formatNumber(item.totalPrice),
          formatNumber(item.netWeight),
          formatNumber(item.grossWeight),
          item.packageQty,
          item.dimensions
        ];
        excelData.push(row);
      });

      // 添加其他费用（如果显示价格）
      if (data.showPrice && data.otherFees && data.otherFees.length > 0) {
        excelData.push([]); // 空行
        excelData.push(['Other Fees']); // 标题
        data.otherFees.forEach(fee => {
          excelData.push([fee.description, '', '', '', '', '', formatNumber(fee.amount)]);
        });
      }

      // 转换为CSV格式
      const csvContent = excelData.map(row =>
        row.map(cell => `"${cell || ''}"`).join(',')
      ).join('\n');

      // 创建并下载文件
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', formatExcelFileName(data.invoiceNo));
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting Excel:', error);
      showToast('Excel导出失败，请重试', 'error');
    }
  }, [data, showToast]);

  return {
    isGenerating,
    isSaving,
    saveMessage,
    handleSave,
    handleGenerate,
    handlePreview,
    handleExportExcel
  };
};
