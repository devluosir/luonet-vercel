import { LineItem } from '../types';

/**
 * 解析粘贴的表格数据
 */
export const parsePastedData = (text: string): LineItem[] => {
  // 按行分割，但保留引号内的换行符
  const rows = text.split(/\n(?=(?:[^"]*"[^"]*")*[^"]*$)/);
  
  const newItems: LineItem[] = rows.map((row, index) => {
    // 分割单元格，但保留引号内的制表符和换行符
    const cells = row.split(/\t(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(cell => {
      // 保留单元格内的换行符，只去除首尾空格
      return cell.replace(/^\s+|\s+$/g, '');
    });
    
    let partname = '', description = '', quantity = '0', unit = 'pc', unitPrice = '0';

    // 根据不同的列数处理数据
    if (cells.length >= 5) {
      // 5列或更多：名称 tab 描述 tab 数量 tab 单位 tab 单价
      [partname, description, quantity, unit, unitPrice] = cells;
    } else if (cells.length === 4) {
      // 4列有两种情况：智能识别
      // 判断逻辑：第2列是数字（数量），第4列是数字或空（单价）
      if (!isNaN(Number(cells[1])) && (!isNaN(Number(cells[3])) || cells[3]?.trim() === '' || cells[3]?.trim() === '0') {
        // 4列格式：名称 tab 数量 tab 单位 tab 单价
        [partname, quantity, unit, unitPrice] = cells;
      } else {
        // 4列格式：名称 tab 描述 tab 数量 tab 单位
        [partname, description, quantity, unit] = cells;
      }
    } else if (cells.length === 3) {
      // 3列有多种情况
      if (cells[1] && !isNaN(Number(cells[1]))) {
        if (!isNaN(Number(cells[2]))) {
          // 名称 tab 数量 tab 单价
          [partname, quantity, unitPrice] = cells;
        } else {
          // 名称 tab 数量 tab tab
          [partname, quantity] = cells;
        }
      } else {
        // 名称 tab 描述 tab 数量
        [partname, description, quantity] = cells;
      }
    } else if (cells.length === 2) {
      // 2列：名称 tab 数量
      [partname, quantity] = cells;
    } else if (cells.length === 1) {
      // 1列：只有名称
      [partname] = cells;
    }

    // 清理并验证数据，但保留换行符
    const cleanQuantity = parseInt(quantity.replace(/[^\d.-]/g, '')) || 0;
    const cleanUnitPrice = parseFloat(unitPrice.replace(/[^\d.-]/g, '')) || 0;
    const baseUnit = unit.trim().replace(/s$/, '') || 'pc';

    return {
      lineNo: index + 1,
      hsCode: '',
      partname: partname || '',
      description: description || '',
      quantity: cleanQuantity,
      unit: baseUnit, // 粘贴时保持原单位，不进行复数处理
      unitPrice: cleanUnitPrice,
      amount: cleanQuantity * cleanUnitPrice,
      highlight: {}
    };
  });

  // 过滤掉完全空白的行
  return newItems.filter(item => item.partname || item.description);
};

/**
 * 处理报价单数据格式转换
 */
export const processQuotationData = (items: LineItem[]): LineItem[] => {
  return items.map(item => {
    // 处理可能的报价单数据字段
    if ((item as any).partName && !item.partname) {
      return {
        ...item,
        partname: (item as any).partName,
        partName: undefined
      };
    }
    return item;
  });
};

/**
 * 创建手动输入弹窗
 */
export const createManualInputModal = (
  onConfirm: (text: string) => void,
  onCancel: () => void
): void => {
  const input = document.createElement('textarea');
  input.style.position = 'fixed';
  input.style.top = '50%';
  input.style.left = '50%';
  input.style.transform = 'translate(-50%, -50%)';
  input.style.zIndex = '9999';
  input.style.width = '80%';
  input.style.height = '200px';
  input.style.padding = '12px';
  input.style.border = '2px solid #007AFF';
  input.style.borderRadius = '8px';
  input.placeholder = '请将数据粘贴到这里...';
  
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.right = '0';
  overlay.style.bottom = '0';
  overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
  overlay.style.zIndex = '9998';
  
  const confirmBtn = document.createElement('button');
  confirmBtn.textContent = '确认';
  confirmBtn.style.position = 'fixed';
  confirmBtn.style.bottom = '20%';
  confirmBtn.style.left = '50%';
  confirmBtn.style.transform = 'translateX(-50%)';
  confirmBtn.style.zIndex = '9999';
  confirmBtn.style.padding = '8px 24px';
  confirmBtn.style.backgroundColor = '#007AFF';
  confirmBtn.style.color = 'white';
  confirmBtn.style.border = 'none';
  confirmBtn.style.borderRadius = '6px';
  confirmBtn.style.cursor = 'pointer';
  
  const cleanup = () => {
    document.body.removeChild(input);
    document.body.removeChild(overlay);
    document.body.removeChild(confirmBtn);
  };
  
  confirmBtn.onclick = () => {
    const text = input.value;
    if (text) {
      onConfirm(text);
    }
    cleanup();
  };
  
  overlay.onclick = () => {
    onCancel();
    cleanup();
  };
  
  document.body.appendChild(overlay);
  document.body.appendChild(input);
  document.body.appendChild(confirmBtn);
  
  input.focus();
};
