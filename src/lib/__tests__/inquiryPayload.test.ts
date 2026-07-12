import { mergeInquiryPayload } from '../inquiryPayload';

describe('mergeInquiryPayload', () => {
  it('removes clearable fields explicitly sent as null in a partial patch', () => {
    expect(
      mergeInquiryPayload(
        { orderSubStatus: 'followup', orderSubStatusRemark: '待处理', description: '原内容' },
        { orderSubStatus: null, orderSubStatusRemark: null },
        false
      )
    ).toEqual({ description: '原内容' });
  });

  it('keeps unrelated fields and non-null clearable values', () => {
    expect(
      mergeInquiryPayload(
        { orderNo: 'FL2601', customerId: 'old', description: '原内容' },
        { customerId: 'new' },
        false
      )
    ).toEqual({ orderNo: 'FL2601', customerId: 'new', description: '原内容' });
  });

  it('removes omitted clearable fields for a full inquiry record', () => {
    expect(
      mergeInquiryPayload(
        { orderSubStatus: 'cancelled', description: '旧内容' },
        { inquiryNo: 'C260101F', supplierStatuses: [], quotedStatuses: [], description: '新内容' },
        true
      )
    ).toEqual({
      inquiryNo: 'C260101F',
      supplierStatuses: [],
      quotedStatuses: [],
      description: '新内容',
    });
  });
});
