/**
 * 匈牙利算法 (Hungarian Algorithm) - 最小代价完美匹配
 * 用于解决分配问题：n个任务分配给n个工人，使总代价最小
 * 时间复杂度: O(n³)
 */

export interface HungarianResult {
  assignment: number[]; // assignment[i] = j 表示第i行分配给第j列
  totalCost: number;    // 总最小代价
}

/**
 * 执行匈牙利算法
 * @param costMatrix 代价矩阵 (必须是方阵)
 * @returns 最优分配结果
 */
export function hungarian(costMatrix: number[][]): HungarianResult {
  if (!costMatrix || costMatrix.length === 0) {
    return { assignment: [], totalCost: 0 };
  }

  const n = costMatrix.length;
  
  // 验证是否为方阵
  if (costMatrix.some(row => row.length !== n)) {
    throw new Error('Cost matrix must be square');
  }

  // 深拷贝避免修改原矩阵
  const cost = costMatrix.map(row => [...row]);
  
  // Step 1: 行约简 - 每行减去该行最小值
  for (let i = 0; i < n; i++) {
    const minRow = Math.min(...cost[i]);
    for (let j = 0; j < n; j++) {
      cost[i][j] -= minRow;
    }
  }

  // Step 2: 列约简 - 每列减去该列最小值
  for (let j = 0; j < n; j++) {
    const minCol = Math.min(...cost.map(row => row[j]));
    for (let i = 0; i < n; i++) {
      cost[i][j] -= minCol;
    }
  }

  // Step 3: 用最少的线覆盖所有零元素
  let assignment = new Array(n).fill(-1);
  let covered = 0;
  
  // 尝试找到完美匹配
  for (let iteration = 0; iteration < n * n; iteration++) {
    // 标记已覆盖的行和列
    const rowCovered = new Array(n).fill(false);
    const colCovered = new Array(n).fill(false);
    
    // 贪心匹配：优先选择零元素少的行/列
    const tempAssignment = new Array(n).fill(-1);
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (cost[i][j] === 0 && !rowCovered[i] && !colCovered[j]) {
          tempAssignment[i] = j;
          rowCovered[i] = true;
          colCovered[j] = true;
        }
      }
    }
    
    covered = rowCovered.filter(Boolean).length;
    
    if (covered === n) {
      // 找到完美匹配
      assignment = tempAssignment;
      break;
    }
    
    // Step 4: 如果覆盖线数 < n，需要调整矩阵
    
    // 找到未被覆盖的最小元素
    let minUncovered = Infinity;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (!rowCovered[i] && !colCovered[j]) {
          minUncovered = Math.min(minUncovered, cost[i][j]);
        }
      }
    }
    
    if (minUncovered === Infinity) break;
    
    // 调整矩阵：
    // - 未覆盖元素减去最小值
    // - 行列交叉覆盖的元素加上最小值
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (!rowCovered[i] && !colCovered[j]) {
          cost[i][j] -= minUncovered;
        } else if (rowCovered[i] && colCovered[j]) {
          cost[i][j] += minUncovered;
        }
      }
    }
  }
  
  // 计算总代价
  let totalCost = 0;
  for (let i = 0; i < n; i++) {
    if (assignment[i] !== -1) {
      totalCost += costMatrix[i][assignment[i]];
    }
  }
  
  return { assignment, totalCost };
}

/**
 * 构建代价矩阵 - 将得分矩阵转换为代价矩阵
 * @param scores 得分矩阵 [行数][字段数]，得分越高越好
 * @param fields 字段列表
 * @param includeIgnore 是否包含ignore字段
 */
export function buildCostMatrix(
  scores: number[][], 
  fields: string[], 
  includeIgnore = true
): { matrix: number[][], fieldMapping: string[] } {
  const targetFields = includeIgnore ? [...fields, 'ignore'] : fields;
  const rows = scores.length;
  const cols = targetFields.length;
  
  // 扩展为方阵
  const N = Math.max(rows, cols);
  const costMatrix: number[][] = [];
  
  // 找到得分的最大值用于转换
  const maxScore = Math.max(1, ...scores.flat());
  
  for (let i = 0; i < N; i++) {
    const row: number[] = [];
    for (let j = 0; j < N; j++) {
      if (i < rows && j < cols) {
        // 正常得分区域：代价 = maxScore - 得分
        const score = scores[i]?.[j] ?? 0;
        row.push(maxScore - score);
      } else {
        // 填充区域：给ignore中等代价，其他高代价
        const isIgnore = j === cols - 1 && includeIgnore;
        row.push(isIgnore ? maxScore * 0.4 : maxScore * 0.8);
      }
    }
    costMatrix.push(row);
  }
  
  return { 
    matrix: costMatrix, 
    fieldMapping: targetFields 
  };
}

/**
 * 辅助函数：打印代价矩阵 (调试用)
 */
export function printCostMatrix(matrix: number[][], labels?: string[]): void {
  console.table(matrix.map((row, i) => {
    const obj: any = {};
    row.forEach((val, j) => {
      const label = labels?.[j] ?? `Col${j}`;
      obj[label] = val.toFixed(2);
    });
    return obj;
  }));
}
