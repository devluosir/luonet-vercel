import { isNormalOrder } from '../orderStatus';

describe('isNormalOrder', () => {
  it.each([
    ['missing', undefined, true],
    ['legacy null', null, true],
    ['suspended', 'suspended', true],
    ['cancelled', 'cancelled', false],
    ['followup', 'followup', false],
  ] as const)('classifies %s order sub-status', (_label, orderSubStatus, expected) => {
    expect(isNormalOrder({ orderSubStatus })).toBe(expected);
  });
});
