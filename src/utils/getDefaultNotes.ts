export function getDefaultNotes(salesPerson: string, type: 'quotation' | 'confirmation'): string[] {
  // 报价单的备注
  if (type === 'quotation') {
    switch(salesPerson) {
      case 'Sharon':
        return [
          'Delivery time: 30 days',
          'Price based on EXW-Jiangsu, China',
          'Delivery terms: As mentioned above, subj to unsold',
          'Excluding handling & packing charge and freight cost',
          'Payment term: 30 days',
          'Validity: 10 days',
        ];
      case 'Emily':
        return [
          'Delivery time: 30 days',
          'Price based on EXW-Jiangsu, China',
          'Delivery terms: As mentioned above, subj to unsold',
          'Payment term: 50% deposit, the balance paid before delivery',
          'Validity: 10 days',
        ];
      case 'Nina':
        return [
          'Delivery time: 30 days',
          'Price based on EXW-Jiangsu, China',
          'Delivery terms: As mentioned above, subj to unsold',
          'Payment term: 50% deposit, the balance paid before delivery',
          'Validity: 10 days',
        ];
      case 'Summer':
        return [
          'Delivery time: 30 days',
          'Price based on EXW-Jiangsu, China',
          'Delivery terms: As mentioned above, subj to unsold',
          'Payment term: 50% deposit, the balance paid before delivery',
          'Validity: 10 days',
        ];
      default:
        return [
          'Delivery time: 30 days',
          'Price based on EXW-Shanghai, China',
          'Delivery terms: As mentioned above, subj to unsold',
          'Payment term: 50% deposit, the balance paid before delivery',
          'Validity: 10 days',
        ];
    }
  }
  
  // 订单确认书的备注
  return [
    'Price based on EXW-Shanghai',
    'Delivery terms: As mentioned above, subj to unsold',
    // 付款条款已移除，默认不显示
  ];
} 