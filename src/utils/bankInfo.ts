import { OUR_COMPANY_PROFILE } from './domesticCompanyProfile';

export const getBankInfo = () => {
  const p = OUR_COMPANY_PROFILE;
  return [
    '开票资料：',
    `公司名称：${p.name}`,
    `公司住所：${p.address}`,
    `电话：${p.phone}`,
    `税号：${p.taxNo}`,
    `开户行及账号：${p.bankName} ${p.bankAccount}`
  ];
};
