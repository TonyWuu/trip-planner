import { TimeSlot } from './types';

export const TRIP_TIMEZONE = 'Asia/Hong_Kong';

export const TRIP_START_DATE = '2025-02-19';
export const TRIP_END_DATE = '2025-03-08';
export const TRIP_NAME = 'Hong Kong & China Trip 2025';

export const DEFAULT_CATEGORIES = [
  { name: 'Flight', color: '#3B82F6' },      // Blue
  { name: 'Hotel', color: '#22C55E' },       // Green
  { name: 'Restaurant', color: '#F97316' },  // Orange
  { name: 'Activity', color: '#A855F7' },    // Purple
  { name: 'Transport', color: '#6B7280' },   // Gray
  { name: 'Shopping', color: '#EC4899' },    // Pink
];

export const CATEGORY_COLORS: Record<string, string> = {
  Flight: '#3B82F6',
  Hotel: '#22C55E',
  Restaurant: '#F97316',
  Activity: '#A855F7',
  Transport: '#6B7280',
  Shopping: '#EC4899',
};

// City schedule based on dates
export const CITY_SCHEDULE: { start: string; end: string; city: string }[] = [
  { start: '2025-02-19', end: '2025-02-19', city: 'Transit' },
  { start: '2025-02-20', end: '2025-02-27', city: 'Hong Kong' },
  { start: '2025-02-28', end: '2025-02-28', city: 'Hong Kong → Shanghai' },
  { start: '2025-03-01', end: '2025-03-03', city: 'Shanghai' },
  { start: '2025-03-04', end: '2025-03-04', city: 'Shanghai → Chengdu' },
  { start: '2025-03-05', end: '2025-03-06', city: 'Chengdu' },
  { start: '2025-03-07', end: '2025-03-07', city: 'Chengdu → Hong Kong' },
  { start: '2025-03-08', end: '2025-03-08', city: 'Hong Kong → Toronto' },
];

// Time slots from 8:00am to 11:30pm in 30-minute increments
export const TIME_SLOTS: TimeSlot[] = [];
for (let hour = 8; hour <= 23; hour++) {
  for (let minute = 0; minute < 60; minute += 30) {
    const period = hour >= 12 ? 'pm' : 'am';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    const label = `${displayHour}:${minute === 0 ? '00' : '30'}${period}`;
    TIME_SLOTS.push({ hour, minute, label });
  }
}
// Remove the last 11:30pm slot to end at 11:30pm (32 slots: 8:00 to 11:30)
TIME_SLOTS.pop(); // Remove 12:00am if exists

export const CURRENCIES = ['HKD', 'CNY', 'CAD', 'USD'];
