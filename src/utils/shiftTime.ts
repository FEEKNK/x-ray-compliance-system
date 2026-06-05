import type { Shift } from '../types';

/**
 * Get current local date string in YYYY-MM-DD format
 */
export function getLocalTodayStr(dateObj = new Date()): string {
  return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
}

/**
 * Fallback Shift start hours (24h)
 */
export const SHIFT_START: Record<Shift, number> = {
  Morning: 8,    // 08:00
  Afternoon: 16, // 16:00
  Night: 0,      // 00:00
};

export const parseShiftStartHour = (shiftStr: string | undefined, fallback: number): number => {
  if (!shiftStr) return fallback;
  const match = shiftStr.match(/^(\d{2}):/);
  if (match) return parseInt(match[1], 10);
  return fallback;
};

/**
 * Fallback lockout limits if settings are missing
 */
export const DEFAULT_LOCKOUT_HOURS: Record<Shift, number> = {
  Morning: 3,
  Afternoon: 2,
  Night: 2,
};

/**
 * Alert trigger offset from shift start (in hours)
 * Morning alert at 2h, Afternoon/Night alert at 1h
 */
export const ALERT_AFTER_HOURS: Record<Shift, number> = {
  Morning: 2,
  Afternoon: 1,
  Night: 1,
};

/**
 * Get the deadline (Date) by which a form must be submitted for a given schedule date+shift.
 * After this time, the form is LOCKED and cannot be submitted.
 */
export function getSubmitDeadline(scheduleDate: string, shift: Shift, lockoutHours?: Record<string, number>, shiftsConfig?: Record<string, string>): Date {
  const [year, month, day] = scheduleDate.split('-').map(Number);
  
  const startHour = shift === 'Morning' ? parseShiftStartHour(shiftsConfig?.Morning, SHIFT_START.Morning) :
                    shift === 'Afternoon' ? parseShiftStartHour(shiftsConfig?.Afternoon, SHIFT_START.Afternoon) :
                    parseShiftStartHour(shiftsConfig?.Night, SHIFT_START.Night);

  const windowHours = lockoutHours ? lockoutHours[shift] : DEFAULT_LOCKOUT_HOURS[shift];

  // For Night shift, deadline is next day 02:00
  const deadline = new Date(year, month - 1, day, startHour, 0, 0, 0);
  deadline.setHours(deadline.getHours() + windowHours);
  
  // Also support decimal hours
  if (!Number.isInteger(windowHours)) {
    deadline.setMinutes(deadline.getMinutes() + (windowHours % 1) * 60);
  }
  
  return deadline;
}

/**
 * Get the alert trigger time (Date) for a given schedule date+shift.
 */
export function getAlertTime(scheduleDate: string, shift: Shift, shiftsConfig?: Record<string, string>): Date {
  const [year, month, day] = scheduleDate.split('-').map(Number);
  
  const startHour = shift === 'Morning' ? parseShiftStartHour(shiftsConfig?.Morning, SHIFT_START.Morning) :
                    shift === 'Afternoon' ? parseShiftStartHour(shiftsConfig?.Afternoon, SHIFT_START.Afternoon) :
                    parseShiftStartHour(shiftsConfig?.Night, SHIFT_START.Night);
  const alertAfter = ALERT_AFTER_HOURS[shift];

  const alertTime = new Date(year, month - 1, day, startHour, 0, 0, 0);
  alertTime.setHours(alertTime.getHours() + alertAfter);
  return alertTime;
}

/**
 * Check if a form submission is still allowed (not yet locked).
 */
export function isSubmitAllowed(scheduleDate: string, shift: Shift, lockoutHours?: Record<string, number>, shiftsConfig?: Record<string, string>): boolean {
  const now = new Date();
  const deadline = getSubmitDeadline(scheduleDate, shift, lockoutHours, shiftsConfig);
  return now < deadline;
}

/**
 * Check if the alert should already be triggered (past alert time).
 */
export function isAlertTime(scheduleDate: string, shift: Shift, shiftsConfig?: Record<string, string>): boolean {
  const now = new Date();
  const alertTime = getAlertTime(scheduleDate, shift, shiftsConfig);
  return now >= alertTime;
}

/**
 * Get a human-readable countdown string until lock or description of lock status.
 */
export function getLockStatus(scheduleDate: string, shift: Shift, lockoutHours?: Record<string, number>, shiftsConfig?: Record<string, string>): {
  isLocked: boolean;
  label: string;
  minutesLeft?: number;
} {
  const now = new Date();
  const deadline = getSubmitDeadline(scheduleDate, shift, lockoutHours, shiftsConfig);
  const diff = deadline.getTime() - now.getTime();

  if (diff <= 0) {
    return { isLocked: true, label: 'หมดเวลากรอก (ล็อกแล้ว)' };
  }

  const minutesLeft = Math.floor(diff / 60000);
  const hoursLeft = Math.floor(minutesLeft / 60);
  const minsLeft = minutesLeft % 60;

  if (hoursLeft > 0) {
    return { isLocked: false, label: `ปิดรับใน ${hoursLeft}ชม. ${minsLeft}น.`, minutesLeft };
  }
  return { isLocked: false, label: `ปิดรับใน ${minutesLeft} นาที`, minutesLeft };
}

/**
 * Composite status for a given schedule+shift, optionally passing in a custom 'now'.
 */
export function getShiftStatus(scheduleDate: string, shift: Shift, now?: Date, lockoutHours?: Record<string, number>, shiftsConfig?: Record<string, string>) {
  const currentTime = now ?? new Date();
  const alertTime = getAlertTime(scheduleDate, shift, shiftsConfig);
  const deadline = getSubmitDeadline(scheduleDate, shift, lockoutHours, shiftsConfig);

  return {
    isAlertTime: currentTime >= alertTime,
    isLocked: currentTime >= deadline,
  };
}

export const parseDbDate = (dateStr: string) => {
  if (!dateStr) return new Date();
  return new Date(dateStr.endsWith('Z') ? dateStr : dateStr.replace(' ', 'T') + 'Z');
};