import { describe, it, expect } from 'vitest';
import { getSubmitDeadline } from './shiftTime';

describe('getSubmitDeadline', () => {
  it('should return deadline of 11:00 AM for Morning shift (starts 08:00 + 3h window)', () => {
    const scheduleDate = '2026-05-30'; // YYYY-MM-DD
    const shift = 'Morning';
    const result = getSubmitDeadline(scheduleDate, shift);

    // Expected: May 30, 2026 at 11:00:00 local time
    // JS Date month is 0-indexed, so May is 4.
    const expected = new Date(2026, 4, 30, 11, 0, 0, 0);

    expect(result.getTime()).toEqual(expected.getTime());
  });

  it('should return deadline of 02:00 AM the next day for Night shift (starts 00:00 + 2h window)', () => {
    const scheduleDate = '2026-05-30';
    const shift = 'Night';
    const result = getSubmitDeadline(scheduleDate, shift);

    // Expected: May 30, 2026 at 02:00:00 local time
    const expected = new Date(2026, 4, 30, 2, 0, 0, 0);

    expect(result.getTime()).toEqual(expected.getTime());
  });
});
