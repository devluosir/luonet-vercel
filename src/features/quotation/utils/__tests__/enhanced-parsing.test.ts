// Day 2 单元测试：增强解析系统 - 重新设计版本
import { quickSmartParse } from '../quickSmartParse';
import { enhancedColumnDetection } from '../enhancedColumnDetection';
import { setFeatureFlags, getFeatureFlags, DEFAULT_FEATURE_FLAGS } from '../parseMetrics';

describe('Enhanced Parsing System - Day 2 (重新设计版本)', () => {
  beforeEach(() => {
    // 重置特性开关
    setFeatureFlags(DEFAULT_FEATURE_FLAGS);
  });

  describe('Format 1: Line No. | Description | Part No. | Q\'TY | Unit | U/Price | Amount | D/T | Remark', () => {
    test('测试第一种格式：标准格式', () => {
      const data = `Line No.	Description	Part No.	Q'TY	Unit	U/Price	Amount	D/T	Remark
1	IMPACT WRENCH CORDLESS	590922	1	PCS	598.00	598.00	3 working days	
2	DRILL DRIVER CORDLESS	590902	1	PCS	348.00	348.00	3 working days	
3	Work Bench Wooden	613885	1	PCS	788.00	788.00	3 working days	`;

      const result = quickSmartParse(data);
      
      // 期望：正确识别格式1
      expect(result.inference.mapping).toEqual(['ignore', 'name', 'ignore', 'qty', 'unit', 'price', 'ignore', 'ignore', 'remark']);
      expect(result.rows).toHaveLength(3);
      expect(result.rows[0]).toMatchObject({
        partName: 'IMPACT WRENCH CORDLESS',
        quantity: 1,
        unit: 'pc',
        unitPrice: 598.00
      });
             expect(result.confidence).toBeGreaterThan(0.85); // 高置信度
    });

    test('测试第一种格式：带说明行', () => {
      const data = `Line No.	Description	Part No.	Q'TY	Unit	U/Price	Amount	D/T	Remark
"BRAND NEW .MADE IN CHINA."								
1	hock Absorber, Anti-Vibration Rubber Isolator Mounts		20	PCS	8.00 	160.00 	3 working days	we can only offer similar size, kindly see attached.`;

      const result = quickSmartParse(data);
      
      expect(result.inference.mapping).toEqual(['ignore', 'name', 'ignore', 'qty', 'unit', 'price', 'ignore', 'ignore', 'remark']);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toMatchObject({
        partName: 'hock Absorber, Anti-Vibration Rubber Isolator Mounts',
        quantity: 20,
        unit: 'pc',
        unitPrice: 8.00,
        remarks: 'we can only offer similar size, kindly see attached.'
      });
    });
  });

  describe('Format 2: Item | Part No. | Description | Qty | Unit | U/P | Item Total | Remark', () => {
    test('测试第二种格式：标准格式', () => {
      const data = `Item	Part No.	Description	Qty	Unit	U/P	Item Total	Remark
		Alternator Specs: Maker: DOLMEL Type: GDB-1410M/04 Rated Output: 1199kW, pf=0.8, 3 x 440V, 60Hz, 1923A, 720 RPM Rectifier Diode Type: D51-100-16-NO-DA2-U x 22					
1		Diode, DOLMEL, D51-100-16-NO-DA2-U	10	PCS 	25.00 	250.00 	5 pcs Positive and 5 pcs negative`;

      const result = quickSmartParse(data);
      
      // 期望：正确识别格式2
      expect(result.inference.mapping).toEqual(['ignore', 'ignore', 'name', 'qty', 'unit', 'price', 'ignore', 'remark']);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toMatchObject({
        partName: 'Diode, DOLMEL, D51-100-16-NO-DA2-U',
        quantity: 10,
        unit: 'pc',
        unitPrice: 25.00
      });
      expect(result.confidence).toBeGreaterThan(0.85);
    });

    test('测试第二种格式：带说明行', () => {
      const data = `Item	Part No.	Description	Qty	Unit	U/P	Item Total	Remark
		Waste Basket					
1	174153	Waste Basket Pedal Flip, Stainless Steel 12ltr	30	PCS 	10.85 	325.50 	带不锈钢内胆`;

      const result = quickSmartParse(data);
      
      expect(result.inference.mapping).toEqual(['ignore', 'ignore', 'name', 'qty', 'unit', 'price', 'ignore', 'remark']);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toMatchObject({
        partName: 'Waste Basket Pedal Flip, Stainless Steel 12ltr',
        quantity: 30,
        unit: 'pc',
        unitPrice: 10.85
      });
    });
  });

  describe('Format 3: Item | Part No. | Description | Qty | Unit | U/P | Item Total | Remark (单价可能为空)', () => {
    test('测试第三种格式：单价为空的情况', () => {
      const data = `Item	Part No.	Description	Qty	Unit	U/P	Item Total	Remark
							
1		END COVER type: ER-160 ,R-160 , t-0.8 ,	2	PCS 			
2		ELBOW type: B-160/90 , D-ø158.7 , R-139 , L-165 , H-202 , t-0.5	3	PCS 			
3		PIPE type: R-160, in side diameter 160 , outside diameter 164 , lenght 1200mm by pcs. of pipe	3	PCS 			
4		DUCT FAN type: CK 160 ,220v , 60Hz , d-ø160 , D-ø344 , A-28 , B-174	1	PCS 	165.00 	165.00 	OOSTBERG ,CK160C
5		SLEEVE type:M-160 , L100 , R-160 , t-0.5	8	PCS 			
6		NIPPLE type:N-160 , L-80 , R-160 , t-0.5	8	PCS 			
7		TEE type: T-160 / 100 , L-165 , H-109 , R1-160 , R2-100 , t-0.5	1	PCS 			
8		DAMPER type:SRD-160 , D-ø158.7 , L1-140 , L-214	1	PCS 			
9		DAMPER type: SRD-100 , D-ø98.9 , L1-140 , L-214	1	PCS 			
10		LEAD-IN type:G-160 / 200 , D-ø171.0 , L-200 , R-160 , t-5.2	1	PCS 			
11		ELBOW type:B-160 / 45 , D158.7 , R-139 , L80 , H-117 , t-0.5	2	PCS 			
12		ELBOW type:B-160 / 30 ,D-ø158.7 , R-139 , L-60 , H-97 , t-0.5	2	PCS 			
13		FLEXIBLE HOSE type: PS-160	4	PCS 			
14		SUSPENSION CLAMP type: PU(A)-160	12	PCS 			
15		CLAMP type:FB-160 , S-160	12	PCS 			
16		TAPE type: W-75mm , Lenght-25m	2	PCS 			
17		DIFFUSER type: HKR-MS65 COMPLITED	1	PCS 			
18		DIFFUSER type: KU 100 - COMPLITED	1	PCS 			`;

      const result = quickSmartParse(data);
      
      // 期望：正确识别格式3，处理单价为空的情况
      expect(result.inference.mapping).toEqual(['ignore', 'ignore', 'name', 'qty', 'unit', 'price', 'ignore', 'remark']);
      expect(result.rows).toHaveLength(18);
      
      // 检查有价格的商品
      expect(result.rows[3]).toMatchObject({
        partName: 'DUCT FAN type: CK 160 ,220v , 60Hz , d-ø160 , D-ø344 , A-28 , B-174',
        quantity: 1,
        unit: 'pc',
        unitPrice: 165.00
      });
      
      // 检查没有价格的商品（应该被跳过或价格为0）
      expect(result.rows[0]).toMatchObject({
        partName: 'END COVER type: ER-160 ,R-160 , t-0.8 ,',
        quantity: 2,
        unit: 'pc',
        unitPrice: 0 // 单价为空时应该为0
      });
      
      expect(result.confidence).toBeGreaterThan(0.85);
    });
  });

  test('测试混合格式检测', () => {
    const data = `Line No.	Description	Part No.	Q'TY	Unit	U/Price	Amount	D/T	Remark
1	IMPACT WRENCH CORDLESS	590922	1	PCS	598.00 	598.00 	3 working days	
2	DRILL DRIVER CORDLESS	590902	1	PCS	348.00 	348.00 	3 working days	`;

    const result = quickSmartParse(data);
    
    expect(result.inference.mixedFormat).toBe(false);
    expect(result.confidence).toBeGreaterThan(0.85);
  });

  test('测试表头识别功能', () => {
    const headers1 = ['Line No.', 'Description', 'Part No.', 'Q\'TY', 'Unit', 'U/Price', 'Amount', 'D/T', 'Remark'];
    const headers2 = ['Item', 'Part No.', 'Description', 'Qty', 'Unit', 'U/P', 'Item Total', 'Remark'];
    
    const result1 = enhancedColumnDetection([headers1]);
    const result2 = enhancedColumnDetection([headers2]);
    
    expect(result1.mapping).toEqual(['ignore', 'name', 'ignore', 'qty', 'unit', 'price', 'ignore', 'ignore', 'remark']);
    expect(result2.mapping).toEqual(['ignore', 'ignore', 'name', 'qty', 'unit', 'price', 'ignore', 'remark']);
    expect(result1.confidence).toBeGreaterThan(80);
    expect(result2.confidence).toBeGreaterThan(80);
  });

  test('测试数据质量验证', () => {
    const data = `Item	Part No.	Description	Qty	Unit	U/P	Item Total	Remark
1		Test Product	10001	PCS	0.001	10.00	Large quantity and tiny price`;

    const result = quickSmartParse(data);
    
    expect(result.rows).toHaveLength(1);
    expect(result.stats.warnings.length).toBeGreaterThan(0);
    
    // 检查是否有大数量和微小价格的警告
    const hasLargeQuantityWarning = result.stats.warnings.some(w => w.type === 'large_quantity');
    const hasTinyPriceWarning = result.stats.warnings.some(w => w.type === 'tiny_price');
    
    expect(hasLargeQuantityWarning).toBe(true);
    expect(hasTinyPriceWarning).toBe(true);
  });

  test('测试空值和零值处理', () => {
    const data = `Item	Part No.	Description	Qty	Unit	U/P	Item Total	Remark
1		Product with zero price	10	PCS		0.00	Zero price
2		Product with zero quantity	0	PCS	100.00	0.00	Zero quantity`;

    const result = quickSmartParse(data);
    
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({
      partName: 'Product with zero price',
      quantity: 10,
      unit: 'pc',
      unitPrice: 0
    });
    expect(result.rows[1]).toMatchObject({
      partName: 'Product with zero quantity',
      quantity: 0,
      unit: 'pc',
      unitPrice: 100.00
    });
  });
});
