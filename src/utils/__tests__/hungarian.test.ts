import { hungarian, buildCostMatrix, HungarianResult } from '../hungarian';

describe('Hungarian Algorithm', () => {
  test('基础3x3矩阵分配', () => {
    const cost = [
      [4, 1, 3],
      [2, 0, 5],
      [3, 2, 2]
    ];
    
    const result = hungarian(cost);
    
    // 最优分配应该是: 0→1, 1→0, 2→2，总代价 = 1+2+2 = 5
    expect(result.assignment).toEqual([1, 0, 2]);
    expect(result.totalCost).toBe(5);
  });

  test('4x4对称矩阵', () => {
    const cost = [
      [9, 2, 7, 8],
      [6, 4, 3, 7],
      [5, 8, 1, 8],
      [7, 6, 9, 4]
    ];
    
    const result = hungarian(cost);
    
    // 验证是否为有效分配
    expect(result.assignment).toHaveLength(4);
    expect(new Set(result.assignment).size).toBe(4); // 无重复
    expect(result.assignment.every(x => x >= 0 && x < 4)).toBe(true);
    
    // 手工验证最优解：0→1, 1→2, 2→0, 3→3，代价=2+3+5+4=14
    expect(result.totalCost).toBe(14);
  });

  test('列识别场景：name-qty-unit-price', () => {
    // 模拟4列数据对4个字段的得分矩阵
    const scores = [
      [0.9, 0.1, 0.8, 0.2], // Col0: 很像name，也有点像qty
      [0.1, 0.9, 0.1, 0.1], // Col1: 明显是qty
      [0.1, 0.1, 0.2, 0.9], // Col2: 明显是unit
      [0.2, 0.8, 0.1, 0.1]  // Col3: 很像price
    ];
    
    const fields = ['name', 'qty', 'unit', 'price'];
    const { matrix, fieldMapping } = buildCostMatrix(scores, fields, false);
    const result = hungarian(matrix);
    
    // 期望分配：Col0→name, Col1→qty, Col2→unit, Col3→price
    const mapping = result.assignment.map(colIndex => fieldMapping[colIndex]);
    expect(mapping).toEqual(['name', 'qty', 'unit', 'price']);
  });

  test('混合格式：有ignore列', () => {
    // 5列数据：序号 + name + qty + unit + price
    const scores = [
      [0.1, 0.9, 0.2, 0.1, 0.1], // Col0: 序号列，应该ignore
      [0.1, 0.9, 0.1, 0.1, 0.1], // Col1: name
      [0.1, 0.1, 0.9, 0.1, 0.1], // Col2: qty  
      [0.1, 0.1, 0.1, 0.8, 0.1], // Col3: unit
      [0.1, 0.1, 0.1, 0.1, 0.9]  // Col4: price
    ];
    
    const fields = ['name', 'qty', 'unit', 'price'];
    const { matrix, fieldMapping } = buildCostMatrix(scores, fields, true);
    const result = hungarian(matrix);
    
    const mapping = result.assignment.slice(0, 5).map(colIndex => 
      fieldMapping[colIndex] || 'ignore'
    );
    
    // 期望：Col0→ignore, Col1→name, Col2→qty, Col3→unit, Col4→price
    expect(mapping[0]).toBe('ignore'); // 序号列
    expect(mapping.slice(1)).toEqual(['name', 'qty', 'unit', 'price']);
  });

  test('边界情况：空矩阵', () => {
    const result = hungarian([]);
    expect(result.assignment).toEqual([]);
    expect(result.totalCost).toBe(0);
  });

  test('边界情况：1x1矩阵', () => {
    const result = hungarian([[5]]);
    expect(result.assignment).toEqual([0]);
    expect(result.totalCost).toBe(5);
  });

  test('非方阵异常', () => {
    expect(() => {
      hungarian([[1, 2], [3]]);
    }).toThrow('Cost matrix must be square');
  });

  test('buildCostMatrix得分转代价', () => {
    const scores = [
      [0.9, 0.1], // 高分→低代价
      [0.2, 0.8]  // 低分→高代价
    ];
    
    const { matrix } = buildCostMatrix(scores, ['field1', 'field2'], false);
    
    // maxScore=0.9, 所以代价 = 0.9 - score
    expect(matrix[0][0]).toBeCloseTo(0.0); // 0.9 - 0.9
    expect(matrix[0][1]).toBeCloseTo(0.8); // 0.9 - 0.1
    expect(matrix[1][0]).toBeCloseTo(0.7); // 0.9 - 0.2
    expect(matrix[1][1]).toBeCloseTo(0.1); // 0.9 - 0.8
  });
});
