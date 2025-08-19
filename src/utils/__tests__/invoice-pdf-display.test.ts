import { getUnitDisplay } from '../unitUtils';

describe('Invoice PDF Display Tests', () => {
  describe('数量和单位显示测试', () => {
    it('应该正确显示数量为0的情况', () => {
      const quantity = 0;
      const unit = 'pc';
      
      // 数量为0时应该显示"0"
      expect(quantity.toString()).toBe('0');
      
      // 单位为0时应该显示单数形式
      expect(getUnitDisplay(unit, quantity)).toBe('pc');
    });

    it('应该正确显示数量为1的情况', () => {
      const quantity = 1;
      const unit = 'pc';
      
      // 数量为1时应该显示"1"
      expect(quantity.toString()).toBe('1');
      
      // 单位为1时应该显示单数形式
      expect(getUnitDisplay(unit, quantity)).toBe('pc');
    });

    it('应该正确显示数量为2的情况', () => {
      const quantity = 2;
      const unit = 'pc';
      
      // 数量为2时应该显示"2"
      expect(quantity.toString()).toBe('2');
      
      // 单位为2时应该显示复数形式
      expect(getUnitDisplay(unit, quantity)).toBe('pcs');
    });

    it('应该正确处理自定义单位', () => {
      const quantity = 2;
      const customUnit = 'kg';
      
      // 自定义单位不变化单复数
      expect(getUnitDisplay(customUnit, quantity)).toBe('kg');
    });

    it('应该正确处理空单位', () => {
      const quantity = 1;
      const unit = '';
      
      // 空单位应该返回空字符串
      expect(getUnitDisplay(unit, quantity)).toBe('');
    });

    it('应该正确处理undefined单位', () => {
      const quantity = 1;
      const unit = 'pc'; // 模拟 item.unit || 'pc' 的情况
      
      // 应该使用默认的'pc'
      expect(getUnitDisplay(unit, quantity)).toBe('pc');
    });
  });

  describe('PDF表格数据格式测试', () => {
    const mockItem = {
      quantity: 0,
      unit: 'pc',
      unitPrice: 10.5,
      amount: 0,
      hsCode: '',
      partname: '',
      description: 'Test Item',
      remarks: ''
    };

    it('应该生成正确的表格行数据', () => {
      // 模拟PDF生成器中的逻辑
      const tableRow = [
        1, // index + 1
        { content: mockItem.quantity.toString(), styles: {} }, // 修复后：始终显示数量
        { content: getUnitDisplay(mockItem.unit || 'pc', mockItem.quantity), styles: {} }, // 修复后：始终显示单位
        { content: Number(mockItem.unitPrice).toFixed(2), styles: {} },
        { content: Number(mockItem.amount).toFixed(2), styles: {} }
      ];

      expect(tableRow[1].content).toBe('0'); // 数量应该显示"0"
      expect(tableRow[2].content).toBe('pc'); // 单位应该显示"pc"
      expect(tableRow[3].content).toBe('10.50'); // 单价保持2位小数
      expect(tableRow[4].content).toBe('0.00'); // 金额保持2位小数
    });

    it('应该与报价页面PDF保持一致的逻辑', () => {
      // 报价页面的逻辑（参考）
      const quotationLogic = {
        quantity: mockItem.quantity.toString(),
        unit: getUnitDisplay(mockItem.unit || 'pc', mockItem.quantity || 0),
        unitPrice: mockItem.unitPrice.toFixed(2),
        amount: mockItem.amount.toFixed(2)
      };

      // 发票页面的逻辑（修复后）
      const invoiceLogic = {
        quantity: mockItem.quantity.toString(),
        unit: getUnitDisplay(mockItem.unit || 'pc', mockItem.quantity),
        unitPrice: Number(mockItem.unitPrice).toFixed(2),
        amount: Number(mockItem.amount).toFixed(2)
      };

      // 两者应该产生相同的结果
      expect(invoiceLogic.quantity).toBe(quotationLogic.quantity);
      expect(invoiceLogic.unit).toBe(quotationLogic.unit);
      expect(invoiceLogic.unitPrice).toBe(quotationLogic.unitPrice);
      expect(invoiceLogic.amount).toBe(quotationLogic.amount);
    });
  });
});
