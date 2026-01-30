import { format, addDays, parseISO, isSameDay, isWithinInterval, differenceInMinutes } from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';
import { CITY_SCHEDULE, TIME_SLOTS } from './constants';
import { DayInfo, Activity, FixedItem } from './types';

// All times should be displayed in Hong Kong timezone
const HK_TIMEZONE = 'Asia/Hong_Kong';
const EST_TIMEZONE = 'America/Toronto';

export function getCityForDate(dateStr: string): string {
  for (const schedule of CITY_SCHEDULE) {
    const start = parseISO(schedule.start);
    const end = parseISO(schedule.end);
    const date = parseISO(dateStr);
    if (isWithinInterval(date, { start, end }) || isSameDay(date, start) || isSameDay(date, end)) {
      return schedule.city;
    }
  }
  return '';
}

export function getDaysInRange(startDate: string, endDate: string): DayInfo[] {
  const days: DayInfo[] = [];
  let current = parseISO(startDate);
  const end = parseISO(endDate);

  while (current <= end) {
    const dateStr = format(current, 'yyyy-MM-dd');
    days.push({
      date: current,
      dateStr,
      dayOfWeek: format(current, 'EEE'),
      city: getCityForDate(dateStr),
    });
    current = addDays(current, 1);
  }

  return days;
}

export function getWeekDays(weekStart: Date, tripStart: string, tripEnd: string): DayInfo[] {
  const days: DayInfo[] = [];
  const tripStartDate = parseISO(tripStart);
  const tripEndDate = parseISO(tripEnd);

  for (let i = 0; i < 7; i++) {
    const current = addDays(weekStart, i);
    if (current >= tripStartDate && current <= tripEndDate) {
      const dateStr = format(current, 'yyyy-MM-dd');
      days.push({
        date: current,
        dateStr,
        dayOfWeek: format(current, 'EEE'),
        city: getCityForDate(dateStr),
      });
    }
  }

  return days;
}

export function formatDateHeader(date: Date): string {
  return format(date, 'MMM d');
}

// Parse a datetime string and assume it's in HKT if no timezone info
function parseAsHKT(datetime: string): Date {
  // If the string doesn't have timezone info, append HKT offset
  if (!datetime.includes('Z') && !datetime.includes('+') && !datetime.includes('-', 10)) {
    // Treat as HKT (UTC+8)
    return new Date(datetime + '+08:00');
  }
  return new Date(datetime);
}

export function formatTime(datetime: string): string {
  // Parse as HKT and format in HKT
  const date = parseAsHKT(datetime);
  return formatInTimeZone(date, HK_TIMEZONE, 'h:mma').toLowerCase();
}

export function formatTimeWithEst(datetime: string, showEst: boolean = false): string {
  const date = parseAsHKT(datetime);
  const hkTime = formatInTimeZone(date, HK_TIMEZONE, 'h:mma').toLowerCase();

  if (showEst) {
    const estTime = formatInTimeZone(date, EST_TIMEZONE, 'h:mma').toLowerCase();
    return `${hkTime} (${estTime} EST)`;
  }
  return hkTime;
}

export function formatTimeRange(start: string, end: string): string {
  return `${formatTime(start)} - ${formatTime(end)}`;
}

export function getTimeSlotIndex(datetime: string): number {
  // Parse as HKT and get the time components in HKT
  const date = parseAsHKT(datetime);
  const hkDate = toZonedTime(date, HK_TIMEZONE);
  const hour = hkDate.getHours();
  const minute = hkDate.getMinutes();

  // For 24-hour calendar, calculate slot index directly
  // Each hour has 2 slots (0 and 30 minutes)
  const slotIndex = hour * 2 + (minute >= 30 ? 1 : 0);

  // Clamp to valid range
  return Math.max(0, Math.min(slotIndex, TIME_SLOTS.length - 1));
}

export function getActivitySpan(activity: Activity): number {
  const start = parseAsHKT(activity.start_datetime);
  const end = parseAsHKT(activity.end_datetime);
  const minutes = differenceInMinutes(end, start);
  return Math.max(1, Math.ceil(minutes / 30));
}

export function getActivityDateStr(activity: Activity): string {
  const date = parseAsHKT(activity.start_datetime);
  // Use Hong Kong timezone
  return formatInTimeZone(date, HK_TIMEZONE, 'yyyy-MM-dd');
}

export function getFixedItemDateStr(item: FixedItem): string {
  const date = parseAsHKT(item.start_datetime);
  // Use Hong Kong timezone
  return formatInTimeZone(date, HK_TIMEZONE, 'yyyy-MM-dd');
}

export function isActivityInSlot(activity: Activity, dateStr: string, slotIndex: number): boolean {
  const startDate = parseAsHKT(activity.start_datetime);
  const endDate = parseAsHKT(activity.end_datetime);
  const hkStart = toZonedTime(startDate, HK_TIMEZONE);
  const hkEnd = toZonedTime(endDate, HK_TIMEZONE);

  // Create the slot time for this specific date
  const slotDate = parseISO(dateStr);
  const slot = TIME_SLOTS[slotIndex];
  const slotStart = new Date(slotDate);
  slotStart.setHours(slot.hour, slot.minute, 0, 0);

  const slotEnd = new Date(slotStart);
  slotEnd.setMinutes(slotEnd.getMinutes() + 30);

  // Check if activity overlaps with this slot (including multi-day activities)
  return hkStart < slotEnd && hkEnd > slotStart;
}

// Check if activity starts on this specific day and slot
export function doesActivityStartInSlot(activity: Activity, dateStr: string, slotIndex: number): boolean {
  const activityDateStr = getActivityDateStr(activity);
  if (activityDateStr !== dateStr) return false;

  const activitySlotIndex = getTimeSlotIndex(activity.start_datetime);
  return activitySlotIndex === slotIndex;
}

// Check if a continuation of a multi-day activity starts at midnight on this day
export function doesActivityContinueOnDay(activity: Activity, dateStr: string): boolean {
  const activityStartDateStr = getActivityDateStr(activity);
  if (activityStartDateStr === dateStr) return false; // Started on this day, not a continuation

  const startDate = parseAsHKT(activity.start_datetime);
  const endDate = parseAsHKT(activity.end_datetime);
  const hkEnd = toZonedTime(endDate, HK_TIMEZONE);

  // Check if the activity end is on or after this date
  const targetDate = parseISO(dateStr);
  const targetDayStart = new Date(targetDate);
  targetDayStart.setHours(0, 0, 0, 0);

  return hkEnd > targetDayStart && startDate < targetDayStart;
}

// Get the visible span of an activity on a specific day (capped at day boundaries)
export function getActivitySpanForDay(activity: Activity, dateStr: string): number {
  const startDate = parseAsHKT(activity.start_datetime);
  const endDate = parseAsHKT(activity.end_datetime);
  const hkStart = toZonedTime(startDate, HK_TIMEZONE);
  const hkEnd = toZonedTime(endDate, HK_TIMEZONE);

  const targetDate = parseISO(dateStr);
  const dayStart = new Date(targetDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(targetDate);
  dayEnd.setHours(23, 59, 59, 999);

  // Clamp start and end to day boundaries
  const visibleStart = hkStart < dayStart ? dayStart : hkStart;
  const visibleEnd = hkEnd > dayEnd ? new Date(dayEnd.getTime() + 1) : hkEnd; // +1 to include last minute

  const minutes = differenceInMinutes(visibleEnd, visibleStart);
  return Math.max(1, Math.ceil(minutes / 30));
}

export function isFlightInSlot(flight: FixedItem, dateStr: string, slotIndex: number): boolean {
  const startDate = parseAsHKT(flight.start_datetime);
  const endDate = parseAsHKT(flight.end_datetime);
  const hkStart = toZonedTime(startDate, HK_TIMEZONE);
  const hkEnd = toZonedTime(endDate, HK_TIMEZONE);

  // Create the slot time for this specific date
  const slotDate = parseISO(dateStr);
  const slot = TIME_SLOTS[slotIndex];
  const slotStart = new Date(slotDate);
  slotStart.setHours(slot.hour, slot.minute, 0, 0);

  const slotEnd = new Date(slotStart);
  slotEnd.setMinutes(slotEnd.getMinutes() + 30);

  return hkStart < slotEnd && hkEnd > slotStart;
}

// Check if flight starts on this specific day and slot
export function doesFlightStartInSlot(flight: FixedItem, dateStr: string, slotIndex: number): boolean {
  const flightDateStr = getFixedItemDateStr(flight);
  if (flightDateStr !== dateStr) return false;

  const flightSlotIndex = getFlightTimeSlotIndex(flight.start_datetime);
  return flightSlotIndex === slotIndex;
}

// Check if a flight continues from a previous day
export function doesFlightContinueOnDay(flight: FixedItem, dateStr: string): boolean {
  const flightStartDateStr = getFixedItemDateStr(flight);
  if (flightStartDateStr === dateStr) return false;

  const startDate = parseAsHKT(flight.start_datetime);
  const endDate = parseAsHKT(flight.end_datetime);
  const hkEnd = toZonedTime(endDate, HK_TIMEZONE);

  const targetDate = parseISO(dateStr);
  const targetDayStart = new Date(targetDate);
  targetDayStart.setHours(0, 0, 0, 0);

  return hkEnd > targetDayStart && startDate < targetDayStart;
}

// Get the visible span of a flight on a specific day
export function getFlightSpanForDay(flight: FixedItem, dateStr: string): number {
  const startDate = parseAsHKT(flight.start_datetime);
  const endDate = parseAsHKT(flight.end_datetime);
  const hkStart = toZonedTime(startDate, HK_TIMEZONE);
  const hkEnd = toZonedTime(endDate, HK_TIMEZONE);

  const targetDate = parseISO(dateStr);
  const dayStart = new Date(targetDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(targetDate);
  dayEnd.setHours(23, 59, 59, 999);

  const visibleStart = hkStart < dayStart ? dayStart : hkStart;
  const visibleEnd = hkEnd > dayEnd ? new Date(dayEnd.getTime() + 1) : hkEnd;

  const minutes = differenceInMinutes(visibleEnd, visibleStart);
  return Math.max(1, Math.ceil(minutes / 30));
}

export function getFlightSpan(flight: FixedItem): number {
  const start = parseAsHKT(flight.start_datetime);
  const end = parseAsHKT(flight.end_datetime);
  const minutes = differenceInMinutes(end, start);
  return Math.max(1, Math.ceil(minutes / 30));
}

export function getFlightTimeSlotIndex(datetime: string): number {
  return getTimeSlotIndex(datetime);
}

export function getFixedItemSpan(item: FixedItem, weekStart: Date, tripStart: string, tripEnd: string): { startCol: number; span: number } {
  const tripStartDate = parseISO(tripStart);
  const tripEndDate = parseISO(tripEnd);
  const itemStart = new Date(item.start_datetime);
  const itemEnd = new Date(item.end_datetime);

  // Calculate the visible days in this week
  const visibleDays: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStart, i);
    if (day >= tripStartDate && day <= tripEndDate) {
      visibleDays.push(day);
    }
  }

  if (visibleDays.length === 0) return { startCol: 0, span: 0 };

  // Find where the item starts and ends within visible days
  let startCol = -1;
  let endCol = -1;

  for (let i = 0; i < visibleDays.length; i++) {
    const dayStart = new Date(visibleDays[i]);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(visibleDays[i]);
    dayEnd.setHours(23, 59, 59, 999);

    if (itemStart <= dayEnd && itemEnd >= dayStart) {
      if (startCol === -1) startCol = i;
      endCol = i;
    }
  }

  if (startCol === -1) return { startCol: 0, span: 0 };

  return { startCol, span: endCol - startCol + 1 };
}

export function getMapsUrl(address: string): string {
  const encoded = encodeURIComponent(address);
  // Check if iOS/macOS - use Apple Maps, otherwise Google Maps
  if (typeof navigator !== 'undefined' && /iPad|iPhone|iPod|Mac/.test(navigator.userAgent)) {
    return `maps://maps.apple.com/?q=${encoded}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encoded}`;
}
