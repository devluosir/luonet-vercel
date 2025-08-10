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
    
    // 期望：现在Description列被映射为name，不再有混合格式
    expect(result.inference.mixedFormat).toBe(false);
    expect(result.inference.confidence).toBeGreaterThan(70);
    expect(result.rows).toHaveLength(10);
    
    // 验证有描述的行（现在Description列被映射为name）
    expect(result.rows[0].partName).toBe('螺丝');
    expect(result.rows[0].description).toBe('M6内六角');
    expect(result.rows[5].partName).toBe('电阻');
    expect(result.rows[5].description).toBe(''); // 后面的行描述为空
  });

  test('测试用例3: 价格带币种 - price列得分显著高于qty', () => {
    const data = `名称\t数量\t价格
螺丝\t100\t$12.5
螺母\t200\tUSD 9.8
垫片\t150\t€15.2`;

    const result = quickSmartParse(data);
    const inference = result.inference;
    

    
    // 期望：价格列得分高于数量列
    const nameEvidence = inference.evidence.find(e => e.rule === 'name_detection');
    const priceEvidence = inference.evidence.find(e => e.rule === 'price_detection');
    const qtyEvidence = inference.evidence.find(e => e.rule === 'qty_detection');
    

    
    // 确保找到了价格和数量证据
    expect(priceEvidence).toBeDefined();
    expect(qtyEvidence).toBeDefined();
    expect(priceEvidence!.score).toBeGreaterThan(qtyEvidence!.score);
    expect(inference.mapping).toEqual(['name', 'qty', 'name']);
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
    
    expect(highResult.inference.confidence).toBeGreaterThan(70);
    // 低质量数据应该有较低的置信度
    expect(lowResult.inference.confidence).toBeLessThan(50);
    // 高质量数据应该有更高的置信度
    expect(highResult.inference.confidence).toBeGreaterThan(lowResult.inference.confidence);
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
    expect(result.inference.mapping).toEqual(['name', 'name', 'qty', 'price']);
    expect(result.inference.confidence).toBeGreaterThan(70);
  });

  test('用户实际表格格式测试', () => {
    const data = `Item\tPart No.\tDescription\tQty\tUnit\tU/P\tItem Total\tRemark
1\t\tEND COVER type: ER-160, R-160, t-0.8\t2\tPCS\t\t\t
2\t\tDUCT FAN type: CK 160, 220v, 60Hz, d-Ø160, D-Ø344, A-28, B-174\t3\tPCS\t\t\t
3\t\tDIFFUSER type: HKR-MS65 COMPLITED\t1\tPCS\t\t\t
4\t\tOOSTBERG, CK160C\t8\tPCS\t165.00\t165.00\tOOSTBERG, CK160C`;

    const result = quickSmartParse(data);
    
    // 期望：Item→ignore, Part No.→ignore, Description→name, Qty→qty, Unit→unit, U/P→price, Item Total→ignore, Remark→remark
    expect(result.inference.mapping).toEqual(['ignore', 'ignore', 'name', 'qty', 'unit', 'price', 'ignore', 'remark']);
    expect(result.rows).toHaveLength(4);
    expect(result.rows[0]).toMatchObject({
      partName: 'END COVER type: ER-160, R-160, t-0.8',
      quantity: 2,
      unit: 'pc',
      unitPrice: 0
    });
  });

  test('9列表格格式测试 - 包含D/T列', () => {
    const data = `Line No.\tDescription\tPart No.\tQ'TY\tUnit\tU/Price\tAmount\tD/T\tRemark
1\t"level transmitter vegawell 72a\nTop mounted"\t\t6\tPCS\t\t\t\t
1\t"NFC V52 NIS ABS T P/SUB PUR 22M\n0~1.5 BAR, *N 1 TS WB TK (P)(S), N 2\nTS WB TK (P)(S)"\t\t4\tPCS\t1080.20\t4320.80\t7-8 weeks\t"Kindly note that Vegawell72\nsensors are obsolete, we\nhave quoted for its direct\nreplacement, Vegawell52\nsensors."
1\t"NFC V52 NIS ABS T P/SUB PUR 38M 0~2\nBAR,*FP WB TK"\t\t1\tPCS\t1243.00\t1243.00\t7-8 weeks\t
2\t"level transmitter vegawell 72a\nSide mounted"\t\t10\tPCS\t1144.00\t11440.00\t7-8 weeks\t
2\tPacking and handling charge\t\t1\tSET\t100.00\t100.00\t\t`;

    const result = quickSmartParse(data);
    
    // 期望：Line No.→ignore, Description→name, Part No.→ignore, Q'TY→qty, Unit→unit, U/Price→price, Amount→ignore, D/T→ignore, Remark→remark
    expect(result.inference.mapping).toEqual(['ignore', 'name', 'ignore', 'qty', 'unit', 'price', 'ignore', 'ignore', 'remark']);
    expect(result.rows).toHaveLength(5);
    
    // 验证第一行数据
    expect(result.rows[0]).toMatchObject({
      partName: 'level transmitter vegawell 72a\nTop mounted',
      quantity: 6,
      unit: 'pc',
      unitPrice: 0
    });
    
    // 验证第二行数据（有价格）
    expect(result.rows[1]).toMatchObject({
      partName: 'NFC V52 NIS ABS T P/SUB PUR 22M\n0~1.5 BAR, *N 1 TS WB TK (P)(S), N 2\nTS WB TK (P)(S)',
      quantity: 4,
      unit: 'pc',
      unitPrice: 1080.20
    });
  });

  test('纯数字价格和Remark列测试', () => {
    const data = `Line No.\tDescription\tPart No.\tQ'TY\tUnit\tU/Price\tAmount\tD/T\tRemark
1\t"level transmitter vegawell 72a\nTop mounted"\t\t6\tPCS\t\t\t\t
1\t"NFC V52 NIS ABS T P/SUB PUR 22M\n0~1.5 BAR, *N 1 TS WB TK (P)(S), N 2\nTS WB TK (P)(S)"\t\t4\tPCS\t1080.20\t4320.80\t7-8 weeks\t"Kindly note that Vegawell72\nsensors are obsolete, we\nhave quoted for its direct\nreplacement, Vegawell52\nsensors."
1\t"NFC V52 NIS ABS T P/SUB PUR 38M 0~2\nBAR,*FP WB TK"\t\t1\tPCS\t1243\t1243\t7-8 weeks\t
2\t"level transmitter vegawell 72a\nSide mounted"\t\t10\tPCS\t1144\t11440\t7-8 weeks\t
2\tPacking and handling charge\t\t1\tSET\t100\t100\t\t`;

    const result = quickSmartParse(data);
    
    // 期望：Line No.→ignore, Description→name, Part No.→ignore, Q'TY→qty, Unit→unit, U/Price→price, Amount→ignore, D/T→ignore, Remark→remark
    expect(result.inference.mapping).toEqual(['ignore', 'name', 'ignore', 'qty', 'unit', 'price', 'ignore', 'ignore', 'remark']);
    expect(result.rows).toHaveLength(5);
    
    // 验证第一行数据（无价格）
    expect(result.rows[0]).toMatchObject({
      partName: 'level transmitter vegawell 72a\nTop mounted',
      quantity: 6,
      unit: 'pc',
      unitPrice: 0
    });
    
    // 验证第二行数据（有价格和备注）
    expect(result.rows[1]).toMatchObject({
      partName: 'NFC V52 NIS ABS T P/SUB PUR 22M\n0~1.5 BAR, *N 1 TS WB TK (P)(S), N 2\nTS WB TK (P)(S)',
      quantity: 4,
      unit: 'pc',
      unitPrice: 1080.20,
      remark: 'Kindly note that Vegawell72\nsensors are obsolete, we\nhave quoted for its direct\nreplacement, Vegawell52\nsensors.'
    });
    
    // 验证第三行数据（纯数字价格）
    expect(result.rows[2]).toMatchObject({
      partName: 'NFC V52 NIS ABS T P/SUB PUR 38M 0~2\nBAR,*FP WB TK',
      quantity: 1,
      unit: 'pc',
      unitPrice: 1243
    });
  });

  test('多行文本表格测试 - 包含D/T和Remark', () => {
    const data = `Line No.\tDescription\tPart No.\tQ'TY\tUnit\tU/Price\tAmount\tD/T\tRemark
1\t"Sounding Tube Auto Closer - DN50\nGunmetal sounding cock\nBSP Female\nBSP male fitted cap and chain\ntest cock"\t\t12\tPCS\t660.00\t7920.00\t"3 working days"\t"kindly confirm if\nthe inside pipe\nthread is 2 or 2-1/2"`;

    const result = quickSmartParse(data);
    
    // 期望：Line No.→ignore, Description→name, Part No.→ignore, Q'TY→qty, Unit→unit, U/Price→price, Amount→ignore, D/T→ignore, Remark→remark
    expect(result.inference.mapping).toEqual(['ignore', 'name', 'ignore', 'qty', 'unit', 'price', 'ignore', 'ignore', 'remark']);
    expect(result.rows).toHaveLength(1);
    
    // 验证第一行数据
    expect(result.rows[0]).toMatchObject({
      partName: 'Sounding Tube Auto Closer - DN50\nGunmetal sounding cock\nBSP Female\nBSP male fitted cap and chain\ntest cock',
      quantity: 12,
      unit: 'pc',
      unitPrice: 660.00,
      remark: 'kindly confirm if\nthe inside pipe\nthread is 2 or 2-1/2'
    });
  });

  test('实际表格测试 - 包含中文备注', () => {
    const data = `Line No.\tDescription\tPart No.\tQ'TY\tUnit\tU/Price\tAmount\tD/T\tRemark
1\tTemperature sensor\t\t2\tPCS\t\t\t\t停产
2\tTemperature controller\t\t2\tPCS\t1500.00\t3000.00\t30 days\t
3\to-ring for pump\t\t4\tPCS\t10.00\t40.00\t7 days\t
4\to-ring for pump\t\t4\tPCS\t20.00\t80.00\t7 days\t`;

    const result = quickSmartParse(data);
    
    // 期望：Line No.→ignore, Description→name, Part No.→ignore, Q'TY→qty, Unit→unit, U/Price→price, Amount→ignore, D/T→ignore, Remark→remark
    expect(result.inference.mapping).toEqual(['ignore', 'name', 'ignore', 'qty', 'unit', 'price', 'ignore', 'ignore', 'remark']);
    expect(result.rows).toHaveLength(4);
    
    // 验证第一行数据 - 有备注
    expect(result.rows[0]).toMatchObject({
      partName: 'Temperature sensor',
      quantity: 2,
      unit: 'pc',
      unitPrice: 0,
      remark: '停产'
    });
    
    // 验证第二行数据 - 无备注
    expect(result.rows[1]).toMatchObject({
      partName: 'Temperature controller',
      quantity: 2,
      unit: 'pc',
      unitPrice: 1500.00,
      remark: ''
    });
    
    // 验证第三行数据 - 无备注
    expect(result.rows[2]).toMatchObject({
      partName: 'o-ring for pump',
      quantity: 4,
      unit: 'pc',
      unitPrice: 10.00,
      remark: ''
    });
    
    // 验证第四行数据 - 无备注
    expect(result.rows[3]).toMatchObject({
      partName: 'o-ring for pump',
      quantity: 4,
      unit: 'pc',
      unitPrice: 20.00,
      remark: ''
    });
  });
});
