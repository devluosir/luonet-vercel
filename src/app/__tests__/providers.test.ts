import { SESSION_REFETCH_INTERVAL_SECONDS } from '../providers';

describe('Providers session polling (TASK-162)', () => {
  it('uses a 24-hour session refetch interval', () => {
    expect(SESSION_REFETCH_INTERVAL_SECONDS).toBe(24 * 60 * 60);
  });
});
