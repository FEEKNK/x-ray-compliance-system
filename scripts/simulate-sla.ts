import { parseShiftStartHour, parseShiftEndHour } from '../server/utils/shiftHelpers';

function getBangkokNow(): Date {
  const utcMs = Date.now();
  return new Date(utcMs + 7 * 60 * 60 * 1000);
}

const now = getBangkokNow();
console.log('Bangkok Now:', now.toISOString(), 'Epoch:', now.getTime());

const shiftsConfig = { Morning: '08:00-16:00', Afternoon: '16:00-00:00', Night: '00:00-08:00' };
const slaHoursCfg = { Morning: 1.5, Afternoon: 1.5, Night: 1.5 };

const shiftsList = [
  { name: 'Morning', start: parseShiftStartHour(shiftsConfig?.Morning, 8), endStr: shiftsConfig?.Morning, defaultEnd: 16, sla: slaHoursCfg.Morning ?? 1.5, end: 0, limit: 0 },
  { name: 'Afternoon', start: parseShiftStartHour(shiftsConfig?.Afternoon, 16), endStr: shiftsConfig?.Afternoon, defaultEnd: 0, sla: slaHoursCfg.Afternoon ?? 1.5, end: 0, limit: 0 },
  { name: 'Night', start: parseShiftStartHour(shiftsConfig?.Night, 0), endStr: shiftsConfig?.Night, defaultEnd: 8, sla: slaHoursCfg.Night ?? 1.5, end: 0, limit: 0 },
];

for (const current of shiftsList) {
  let end = parseShiftEndHour(current.endStr, current.defaultEnd);
  if (end <= current.start) {
    end += 24; 
  }
  current.end = end;
  current.limit = current.start + current.sla;
}

const schedDateStr = '2026-06-24';
console.log('--- Testing for schedule date:', schedDateStr, '---');

for (const s of shiftsList) {
  const schedDate = new Date(`${schedDateStr}T00:00:00.000Z`);
  const deadlineTime = schedDate.getTime() + (s.limit * 60 * 60 * 1000);
  const endTime = schedDate.getTime() + (s.end * 60 * 60 * 1000);
  
  console.log(`\nShift: ${s.name}`);
  console.log(`Start: ${s.start}, Limit: ${s.limit}, End: ${s.end}`);
  console.log(`DeadlineTime:`, new Date(deadlineTime).toISOString(), `(Epoch: ${deadlineTime})`);
  console.log(`EndTime:     `, new Date(endTime).toISOString(), `(Epoch: ${endTime})`);
  
  const isSlaBreached = now.getTime() >= deadlineTime;
  const isBeforeEnd = now.getTime() < endTime;
  
  console.log(`now >= deadlineTime? ${isSlaBreached}`);
  console.log(`now < endTime? ${isBeforeEnd}`);
  console.log(`Will alert staff? ${isSlaBreached && isBeforeEnd}`);
  console.log(`Will alert supervisor? ${now.getTime() >= endTime}`);
}
