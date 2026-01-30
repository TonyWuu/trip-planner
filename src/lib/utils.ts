import { format, addDays, parseISO, startOfWeek, endOfWeek, isSameDay, isWithinInterval, differenceInMinutes } from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';
import { CITY_SCHEDULE, TRIP_TIMEZONE, TIME_SLOTS } from './constants';
import { DayInfo, Activity, FixedItem } from './types';

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

export function formatTime(datetime: string): string {
  const date = toZonedTime(parseISO(datetime), TRIP_TIMEZONE);
  return format(date, 'h:mma').toLowerCase();
}

export function formatTimeRange(start: string, end: string): string {
  return `${formatTime(start)} - ${formatTime(end)}`;
}

export function getTimeSlotIndex(datetime: string): number {
  const date = toZonedTime(parseISO(datetime), TRIP_TIMEZONE);
  const hour = date.getHours();
  const minute = date.getMinutes();

  // Find the index in TIME_SLOTS
  for (let i = 0; i < TIME_SLOTS.length; i++) {
    const slot = TIME_SLOTS[i];
    if (slot.hour === hour && slot.minute === minute) {
      return i;
    }
    if (slot.hour === hour && minute < slot.minute + 30 && minute >= slot.minute) {
      return i;
    }
  }

  // If before 8am, return 0
  if (hour < 8) return 0;
  // If after last slot, return last index
  return TIME_SLOTS.length - 1;
}

export function getActivitySpan(activity: Activity): number {
  const start = parseISO(activity.start_datetime);
  const end = parseISO(activity.end_datetime);
  const minutes = differenceInMinutes(end, start);
  return Math.ceil(minutes / 30);
}

export function getActivitiesForDayAndSlot(
  activities: Activity[],
  dateStr: string,
  slotIndex: number
): Activity[] {
  return activities.filter(activity => {
    const startDate = toZonedTime(parseISO(activity.start_datetime), TRIP_TIMEZONE);
    const activityDateStr = format(startDate, 'yyyy-MM-dd');

    if (activityDateStr !== dateStr) return false;

    const activitySlotIndex = getTimeSlotIndex(activity.start_datetime);
    return activitySlotIndex === slotIndex;
  });
}

export function isActivityInSlot(activity: Activity, dateStr: string, slotIndex: number): boolean {
  const startDate = toZonedTime(parseISO(activity.start_datetime), TRIP_TIMEZONE);
  const endDate = toZonedTime(parseISO(activity.end_datetime), TRIP_TIMEZONE);
  const activityDateStr = format(startDate, 'yyyy-MM-dd');

  if (activityDateStr !== dateStr) return false;

  const slot = TIME_SLOTS[slotIndex];
  const slotStart = new Date(startDate);
  slotStart.setHours(slot.hour, slot.minute, 0, 0);

  const slotEnd = new Date(slotStart);
  slotEnd.setMinutes(slotEnd.getMinutes() + 30);

  return startDate < slotEnd && endDate > slotStart;
}

export function createDateTimeString(dateStr: string, hour: number, minute: number): string {
  return formatInTimeZone(
    new Date(`${dateStr}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`),
    TRIP_TIMEZONE,
    "yyyy-MM-dd'T'HH:mm:ssXXX"
  );
}

export function getFixedItemsForDateRange(
  items: FixedItem[],
  startDate: string,
  endDate: string
): FixedItem[] {
  const start = parseISO(startDate);
  const end = parseISO(endDate);

  return items.filter(item => {
    const itemStart = parseISO(item.start_datetime);
    const itemEnd = parseISO(item.end_datetime);
    return itemStart <= end && itemEnd >= start;
  });
}

export function getFixedItemSpan(item: FixedItem, weekStart: Date, tripStart: string, tripEnd: string): { startCol: number; span: number } {
  const tripStartDate = parseISO(tripStart);
  const tripEndDate = parseISO(tripEnd);
  const itemStart = toZonedTime(parseISO(item.start_datetime), TRIP_TIMEZONE);
  const itemEnd = toZonedTime(parseISO(item.end_datetime), TRIP_TIMEZONE);

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
