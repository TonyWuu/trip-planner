import { FixedItem, Category } from './types';

export const SEED_FLIGHTS: Omit<FixedItem, 'id' | 'trip_id' | 'created_at'>[] = [
  {
    type: 'flight',
    name: 'CX 805: YYZ → HKG',
    start_datetime: '2025-02-20T12:00', // Departs 11:00 PM EST on Feb 19
    end_datetime: '2025-02-21T04:00',   // Arrives 4:00 AM HKT on Feb 21 (~16h flight)
    details: {
      flight_number: 'CX 805',
      airline: 'Cathay Pacific',
      departure_city: 'Toronto',
      arrival_city: 'Hong Kong',
      departure_code: 'YYZ',
      arrival_code: 'HKG',
    },
    color: '#3B82F6',
  },
  {
    type: 'flight',
    name: 'UO 542: HKG → HAN',
    start_datetime: '2025-02-21T20:05', // Departs HKG 20:05 HKT
    end_datetime: '2025-02-21T22:10',   // Arrives HAN 21:10 Vietnam time = 22:10 HKT
    details: {
      flight_number: 'UO 542',
      airline: 'HK Express',
      departure_city: 'Hong Kong',
      arrival_city: 'Hanoi',
      departure_code: 'HKG',
      arrival_code: 'HAN',
      local_arrival_time: '21:10 (Vietnam)',
    },
    color: '#3B82F6',
  },
  {
    type: 'flight',
    name: 'UO 543: HAN → HKG',
    start_datetime: '2025-02-27T22:55', // Departs HAN 21:55 Vietnam time = 22:55 HKT
    end_datetime: '2025-02-28T00:40',   // Arrives HKG 00:40 HKT
    details: {
      flight_number: 'UO 543',
      airline: 'HK Express',
      departure_city: 'Hanoi',
      arrival_city: 'Hong Kong',
      departure_code: 'HAN',
      arrival_code: 'HKG',
      local_departure_time: '21:55 (Vietnam)',
    },
    color: '#3B82F6',
  },
  {
    type: 'flight',
    name: 'FM 3022: HKG → PVG',
    start_datetime: '2025-02-28T15:25',
    end_datetime: '2025-02-28T18:05',
    details: {
      flight_number: 'FM 3022',
      airline: 'Shanghai Airlines',
      departure_city: 'Hong Kong',
      arrival_city: 'Shanghai',
      departure_code: 'HKG',
      arrival_code: 'PVG',
    },
    color: '#3B82F6',
  },
  {
    type: 'flight',
    name: 'HO 1059: SHA → TFU',
    start_datetime: '2025-03-04T13:30',
    end_datetime: '2025-03-04T16:55',
    details: {
      flight_number: 'HO 1059',
      airline: 'Juneyao Air',
      departure_city: 'Shanghai',
      arrival_city: 'Chengdu',
      departure_code: 'SHA',
      arrival_code: 'TFU',
    },
    color: '#3B82F6',
  },
  {
    type: 'flight',
    name: 'ZH 8033: TFU → HKG',
    start_datetime: '2025-03-07T15:35',
    end_datetime: '2025-03-07T18:10',
    details: {
      flight_number: 'ZH 8033',
      airline: 'Shenzhen Airlines',
      departure_city: 'Chengdu',
      arrival_city: 'Hong Kong',
      departure_code: 'TFU',
      arrival_code: 'HKG',
    },
    color: '#3B82F6',
  },
  {
    type: 'flight',
    name: 'CX 828: HKG → YYZ',
    start_datetime: '2025-03-08T10:25',
    end_datetime: '2025-03-09T02:15', // Arrives 13:15 EST = 02:15 HKT next day
    details: {
      flight_number: 'CX 828',
      airline: 'Cathay Pacific',
      departure_city: 'Hong Kong',
      arrival_city: 'Toronto',
      departure_code: 'HKG',
      arrival_code: 'YYZ',
    },
    color: '#3B82F6',
  },
  {
    type: 'flight',
    name: 'KL 888: HKG → AMS',
    start_datetime: '2025-03-08T23:25',
    end_datetime: '2025-03-09T13:40', // Arrives 06:40 CET = 13:40 HKT
    details: {
      flight_number: 'KL 888',
      airline: 'KLM',
      departure_city: 'Hong Kong',
      arrival_city: 'Amsterdam',
      departure_code: 'HKG',
      arrival_code: 'AMS',
      local_arrival_time: '06:40 (Amsterdam)',
    },
    color: '#3B82F6',
  },
  {
    type: 'flight',
    name: 'KL 1217: AMS → ARN',
    start_datetime: '2025-03-09T15:40', // Departs 08:40 CET = 15:40 HKT
    end_datetime: '2025-03-09T17:40',   // Arrives 10:40 CET = 17:40 HKT
    details: {
      flight_number: 'KL 1217',
      airline: 'KLM',
      departure_city: 'Amsterdam',
      arrival_city: 'Stockholm',
      departure_code: 'AMS',
      arrival_code: 'ARN',
      local_departure_time: '08:40 (Amsterdam)',
      local_arrival_time: '10:40 (Stockholm)',
    },
    color: '#3B82F6',
  },
];

export const SEED_HOTELS: Omit<FixedItem, 'id' | 'trip_id' | 'created_at'>[] = [
  {
    type: 'hotel',
    name: 'Kornhill Garden, Hong Kong',
    start_datetime: '2025-02-20T15:00',
    end_datetime: '2025-02-28T11:00',
    details: {
      address: '1 Hong On St, Kornhill, Hong Kong',
      city: 'Hong Kong',
    },
    color: '#22C55E',
  },
  {
    type: 'hotel',
    name: 'Langham Xintiandi, Shanghai',
    start_datetime: '2025-02-28T15:00',
    end_datetime: '2025-03-04T11:00',
    details: {
      address: '99 Madang Rd, Huangpu, Shanghai',
      city: 'Shanghai',
    },
    color: '#22C55E',
  },
  {
    type: 'hotel',
    name: 'Ritz-Carlton, Chengdu',
    start_datetime: '2025-03-04T15:00',
    end_datetime: '2025-03-07T11:00',
    details: {
      address: '269 Shuncheng Ave, Luomashi, Chengdu',
      city: 'Chengdu',
    },
    color: '#22C55E',
  },
  {
    type: 'hotel',
    name: 'Kornhill Garden, Hong Kong',
    start_datetime: '2025-03-07T15:00',
    end_datetime: '2025-03-08T11:00',
    details: {
      address: '1 Hong On St, Kornhill, Hong Kong',
      city: 'Hong Kong',
    },
    color: '#22C55E',
  },
];

export const SEED_CATEGORIES: Omit<Category, 'id' | 'trip_id' | 'created_at'>[] = [
  { name: 'Restaurant', color: '#F97316' },
  { name: 'Activity', color: '#A855F7' },
  { name: 'Transport', color: '#6B7280' },
  { name: 'Shopping', color: '#EC4899' },
];
