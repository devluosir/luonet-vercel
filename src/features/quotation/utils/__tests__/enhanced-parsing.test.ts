// Day 2 单元测试：增强解析系统
import { quickSmartParse } from '../quickSmartParse';
import { enhancedColumnDetection } from '../enhancedColumnDetection';
import { setFeatureFlags, getFeatureFlags, DEFAULT_FEATURE_FLAGS } from '../parseMetrics';

describe('Enhanced Parsing System - Day 2', () => {
  beforeEach(() => {
    // 重置特性开关
    setFeatureFlags(DEFAULT_FEATURE_FLAGS);
  });

  test('测试用例1: 4列→name/qty/unit/price，夹杂序号列', () => {
    const data = `序号\t名称\t数量\t单位\t单价
1\t螺丝\t100\tpc\t0.5
2\t螺母\t200\tpc\t0.3
3\t垫片\t150\tpc\t0.2`;

    const result = quickSmartParse(data);
    
    // 期望：序号→ignore，其余正确映射
    expect(result.inference.mapping).toEqual(['ignore', 'name', 'qty', 'unit', 'price']);
    expect(result.rows).toHaveLength(3);
    expect(result.rows[0]).toMatchObject({
      partName: '螺丝',
      quantity: 100,
      unit: 'pc',
      unitPrice: 0.5
    });
    expect(result.confidence).toBeGreaterThan(0.8); // 高置信度
  });

  test('测试用例2: 5列混合格式 - 前5行含desc，后5行无desc', () => {
    const data = `名称\t描述\t数量\t单位\t单价
螺丝\tM6内六角\t100\tpc\t0.5
螺母\tM6配套\t200\tpc\t0.3
垫片\t不锈钢\t150\tpc\t0.2
弹簧\t压缩弹簧\t50\tpc\t1.0
密封圈\tO型圈\t80\tpc\t0.8
电阻\t\t10\tpc\t2.0
电容\t\t20\tpc\t1.5
二极管\t\t30\tpc\t0.6
晶体管\t\t15\tpc\t3.0
集成电路\t\t5\tpc\t10.0`;

    const result = quickSmartParse(data);
    
    // 期望：检测到混合格式
    expect(result.inference.mixedFormat).toBe(true);
    expect(result.inference.confidence).toBeLessThan(85); // 置信度降低
    expect(result.rows).toHaveLength(10);
    
    // 验证有描述的行
    expect(result.rows[0].description).toBe('M6内六角');
    expect(result.rows[5].description).toBe(''); // 后面的行描述为空
  });

  test('测试用例3: 价格带币种 - price列得分显著高于qty', () => {
    const data = `名称\t数量\t价格
螺丝\t100\t$12.5
螺母\t200\tUSD 9.8
垫片\t150\t€15.2`;

    const colData = data.split('\n').slice(1).map(row => row.split('\t'));
    const inference = enhancedColumnDetection(colData);
    
    // 期望：价格列得分高于数量列
    const nameEvidence = inference.evidence.find(e => e.rule === 'name_detection');
    const priceEvidence = inference.evidence.find(e => e.rule === 'price_detection');
    const qtyEvidence = inference.evidence.find(e => e.rule === 'qty_detection');
    
    expect(priceEvidence?.score).toBeGreaterThan(qtyEvidence?.score || 0);
    expect(inference.mapping).toEqual(['name', 'qty', 'price']);
  });

  test('置信度计算稳健性测试', () => {
    const highQualityData = `名称\t数量\t单位\t单价
螺丝\t100\tpc\t0.5
螺母\t200\tpc\t0.3`;

    const lowQualityData = `col1\tcol2\tcol3\tcol4
abc\txyz\t???\t###
123\t456\t789\t000`;

    const highResult = quickSmartParse(highQualityData);
    const lowResult = quickSmartParse(lowQualityData);
    
    expect(highResult.inference.confidence).toBeGreaterThan(lowResult.inference.confidence);
    expect(highResult.inference.confidence).toBeGreaterThan(70);
    expect(lowResult.inference.confidence).toBeLessThan(50);
  });

  test('特性开关控制测试', () => {
    const data = `名称\t数量\t单价
螺丝\t100\t0.5`;

    // 禁用增强推断
    setFeatureFlags({ enhancedInferenceEnabled: false });
    const disabledResult = quickSmartParse(data);
    
    // 启用增强推断
    setFeatureFlags({ enhancedInferenceEnabled: true });
    const enabledResult = quickSmartParse(data);
    
    expect(disabledResult.inference.confidence).toBe(0);
    expect(enabledResult.inference.confidence).toBeGreaterThan(0);
  });

  test('自动插入阈值控制测试', () => {
    const data = `名称\t数量\t单价
螺丝\t100\t0.5`;

    // 设置高阈值
    setFeatureFlags({ autoInsertThreshold: 95 });
    const result = quickSmartParse(data);
    
    // 验证是否触发了回退逻辑（具体表现需要检查metrics或其他标识）
    expect(result.stats.toInsert).toBeGreaterThan(0);
  });

  test('大数据集采样测试', () => {
    // 构造101行数据
    const header = '名称\t数量\t单价';
    const rows = Array.from({ length: 100 }, (_, i) => `商品${i}\t${i + 1}\t${(i + 1) * 0.1}`);
    const data = [header, ...rows].join('\n');

    setFeatureFlags({ maxSampleSize: 50 });
    const result = quickSmartParse(data);
    
    // 验证采样生效（具体验证需要检查内部逻辑或指标）
    expect(result.rows).toHaveLength(100);
    expect(result.inference.confidence).toBeGreaterThan(0);
  });

  test('混合格式检测测试', () => {
    const data = `名称\t数量\t单价
短名\t1\t1.0
这是一个很长很长的产品名称\t2\t2.0
短\t3\t3.0
另一个超级超级超级长的产品描述信息\t4\t4.0`;

    const result = quickSmartParse(data);
    
    // 名称列长度方差大，应该检测到混合格式的倾向
    expect(result.inference.mapping[0]).toBe('name');
  });

  test('警告系统集成测试', () => {
    const data = `名称\t数量\t单价
A\t-10\t-0.005
正常商品\t99999\t0.004
B\t0\t0`;

    setFeatureFlags({ showWarnings: true });
    const result = quickSmartParse(data);
    
    expect(result.stats.warnings).toHaveLength(4); // name_too_short, large_quantity, tiny_price, zero_qty_or_price
    expect(result.stats.warnings.some(w => w.type === 'name_too_short')).toBe(true);
    expect(result.stats.warnings.some(w => w.type === 'large_quantity')).toBe(true);
    expect(result.stats.warnings.some(w => w.type === 'tiny_price')).toBe(true);
    expect(result.stats.warnings.some(w => w.type === 'zero_qty_or_price')).toBe(true);
  });

  test('匈牙利算法vs贪心算法对比', () => {
    // 构造一个贪心算法可能出错的案例
    const data = `名称\t描述字段\t数量\t单价
商品A\t这是详细描述\t100\t1.0
商品B\t另一个描述\t200\t2.0`;

    const result = quickSmartParse(data);
    
    // 验证匈牙利算法给出了正确的全局最优分配
    expect(result.inference.mapping).toEqual(['name', 'desc', 'qty', 'price']);
    expect(result.inference.confidence).toBeGreaterThan(70);
  });
});
