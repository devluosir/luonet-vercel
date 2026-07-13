import {
  getOrderRowBgClass,
  getOrderSubStatusLetter,
  isFollowupCompleted,
  isInProgressOrder,
  isNormalOrder,
} from '../orderStatus';
import type { InquiryRecord } from '../../types';

function baseRecord(overrides: Partial<InquiryRecord> = {}): InquiryRecord {
  return {
    id: 'r1',
    inquiryDate: '2026-07-13',
    inquiryNo: 'C260713F',
    inquirer: '张三',
    customerNo: 'CUST-1',
    description: '',
    supplierStatuses: [],
    quotedStatuses: [],
    createdAt: '2026-07-13T00:00:00.000Z',
    updatedAt: '2026-07-13T00:00:00.000Z',
    ...overrides,
  };
}

describe('isFollowupCompleted', () => {
  it('善后S 且标记完成时为 true', () => {
    expect(isFollowupCompleted({ orderSubStatus: 'followup', orderFollowupCompleted: true })).toBe(true);
  });

  it('善后S 但未标记完成时为 false', () => {
    expect(isFollowupCompleted({ orderSubStatus: 'followup', orderFollowupCompleted: false })).toBe(false);
    expect(isFollowupCompleted({ orderSubStatus: 'followup' })).toBe(false);
  });

  it('非善后S 状态下即使 orderFollowupCompleted 为 true 也不生效（撤销/悬挂没有"完成"概念）', () => {
    expect(isFollowupCompleted({ orderSubStatus: 'cancelled', orderFollowupCompleted: true })).toBe(false);
    expect(isFollowupCompleted({ orderSubStatus: 'suspended', orderFollowupCompleted: true })).toBe(false);
    expect(isFollowupCompleted({ orderFollowupCompleted: true })).toBe(false);
  });
});

describe('isNormalOrder', () => {
  it.each([
    ['missing', undefined, false, true],
    ['legacy null', null, false, true],
    ['suspended', 'suspended', false, true],
    ['cancelled', 'cancelled', false, false],
    ['followup 未完成', 'followup', false, false],
    ['followup 已完成', 'followup', true, true],
  ] as const)('classifies %s order sub-status (completed=%s)', (_label, orderSubStatus, completed, expected) => {
    expect(isNormalOrder({ orderSubStatus, orderFollowupCompleted: completed })).toBe(expected);
  });
});

describe('isInProgressOrder', () => {
  it('辙销C 永远不算进行中', () => {
    expect(isInProgressOrder(baseRecord({ orderSubStatus: 'cancelled', orderDeliveryStatus: '发票已开' }))).toBe(false);
  });

  it('悬挂P 永远算进行中，不看执行情况文字', () => {
    expect(isInProgressOrder(baseRecord({ orderSubStatus: 'suspended', orderDeliveryStatus: '发票已开' }))).toBe(true);
  });

  it('善后S 未完成时永远算进行中，不看执行情况文字', () => {
    expect(isInProgressOrder(baseRecord({ orderSubStatus: 'followup', orderDeliveryStatus: '发票已开' }))).toBe(true);
  });

  it('善后S 已完成后按真实执行情况文字判断，不再强制算进行中', () => {
    expect(
      isInProgressOrder(baseRecord({ orderSubStatus: 'followup', orderFollowupCompleted: true, orderDeliveryStatus: '发票已开' }))
    ).toBe(false);
    expect(
      isInProgressOrder(baseRecord({ orderSubStatus: 'followup', orderFollowupCompleted: true, orderDeliveryStatus: '备货中' }))
    ).toBe(true);
  });

  it('无 C/P/S 标记时按执行情况文字判断：非"发票..."前缀都算进行中', () => {
    expect(isInProgressOrder(baseRecord({ orderDeliveryStatus: '合同确认中' }))).toBe(true);
    expect(isInProgressOrder(baseRecord({ orderDeliveryStatus: '发票已开' }))).toBe(false);
    expect(isInProgressOrder(baseRecord({}))).toBe(true);
  });
});

describe('getOrderRowBgClass', () => {
  it('辙销C → 灰底', () => {
    expect(getOrderRowBgClass({ orderSubStatus: 'cancelled' })).toContain('bg-gray-300');
  });

  it('悬挂P → 绿底', () => {
    expect(getOrderRowBgClass({ orderSubStatus: 'suspended' })).toContain('bg-green-100');
  });

  it('善后S 未完成 → 红底', () => {
    expect(getOrderRowBgClass({ orderSubStatus: 'followup' })).toContain('bg-red-100');
  });

  it('善后S 已完成 → 归入正常（无特殊底色）', () => {
    const cls = getOrderRowBgClass({ orderSubStatus: 'followup', orderFollowupCompleted: true });
    expect(cls).not.toContain('bg-red-100');
    expect(cls).not.toContain('bg-gray-300');
    expect(cls).not.toContain('bg-green-100');
  });

  it('无标记 → 默认（无特殊底色）', () => {
    const cls = getOrderRowBgClass({});
    expect(cls).not.toContain('bg-red-100');
    expect(cls).not.toContain('bg-gray-300');
    expect(cls).not.toContain('bg-green-100');
  });
});

describe('getOrderSubStatusLetter', () => {
  it('无 orderSubStatus 时返回 null', () => {
    expect(getOrderSubStatusLetter({})).toBeNull();
  });

  it('辙销C → { letter: "C", completed: false }', () => {
    expect(getOrderSubStatusLetter({ orderSubStatus: 'cancelled' })).toEqual({ letter: 'C', completed: false });
  });

  it('悬挂P → { letter: "P", completed: false }', () => {
    expect(getOrderSubStatusLetter({ orderSubStatus: 'suspended' })).toEqual({ letter: 'P', completed: false });
  });

  it('善后S 未完成 → { letter: "S", completed: false }', () => {
    expect(getOrderSubStatusLetter({ orderSubStatus: 'followup' })).toEqual({ letter: 'S', completed: false });
  });

  it('善后S 已完成 → { letter: "S", completed: true }（调用方据此渲染 S-OK）', () => {
    expect(getOrderSubStatusLetter({ orderSubStatus: 'followup', orderFollowupCompleted: true })).toEqual({
      letter: 'S',
      completed: true,
    });
  });
});
