import type { DomesticPartyDetails } from '@/types/quotation';

// 内销报价单"供方"（我方公司）默认资料。
// 与 src/utils/bankInfo.ts 的开票资料保持同一数据源，避免两处硬编码后数据漂移。
export const OUR_COMPANY_PROFILE: DomesticPartyDetails = {
  name: '上海飞罗贸易有限公司',
  address: '中国（上海）自由贸易区富特北路211号302部位368室',
  phone: '4008930883',
  taxNo: '913101150935185537',
  bankName: '中国银行上海市外高桥保税区支行',
  bankAccount: '455969175704',
};
