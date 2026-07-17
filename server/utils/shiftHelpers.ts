/**
 * Shared server utilities for shift-related and timezone operations.
 */

/**
 * Get current time in Bangkok timezone (UTC+7) — stable across environments.
 * Returns a Date whose getUTC*() methods return Bangkok local values.
 */
export function getBangkokNow(): Date {
  const utcMs = Date.now();
  return new Date(utcMs + 7 * 60 * 60 * 1000);
}

/** Format a Date (Bangkok-shifted) as YYYY-MM-DD string */
export function getBangkokDateStr(d?: Date): string {
  const now = d ?? getBangkokNow();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
}

/** Map a shift name to its Thai display name */
export function getShiftThaiName(shift: string): string {
  switch (shift) {
    case 'Morning': return 'เช้า';
    case 'Afternoon': return 'บ่าย';
    case 'Night': return 'ดึก';
    case 'NightBeforeMorning': return 'ดึกก่อนเช้า';
    default: return shift; // Return raw name for unknown shifts
  }
}

/** Parse the start hour from a shift time range string like "08:00 - 16:00" */
export function parseShiftStartHour(timeRangeStr: string | undefined, defaultHour: number): number {
  if (!timeRangeStr) return defaultHour;
  const match = timeRangeStr.match(/^(\d{1,2})[:.](\d{2})/);
  if (!match) return defaultHour;
  const hr = parseInt(match[1], 10);
  const min = parseInt(match[2], 10);
  return hr + (min / 60);
}

/** Parse the end hour from a shift time range string like "08:00 - 16:00" */
export function parseShiftEndHour(timeRangeStr: string | undefined, defaultEnd: number): number {
  if (!timeRangeStr) return defaultEnd;
  const match = timeRangeStr.match(/-\s*(\d{1,2})[:.](\d{2})/);
  if (!match) return defaultEnd;
  const hr = parseInt(match[1], 10);
  const min = parseInt(match[2], 10);
  return hr + (min / 60);
}
