export interface Trip {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  timezone: string;
  share_token: string;
  created_at: string;
}

export interface FixedItem {
  id: string;
  trip_id: string;
  type: 'flight' | 'hotel';
  name: string;
  start_datetime: string;
  end_datetime: string;
  details: FlightDetails | HotelDetails | null;
  color: string | null;
  created_at: string;
}

export interface FlightDetails {
  flight_number: string;
  airline: string;
  departure_city: string;
  arrival_city: string;
  departure_code: string;
  arrival_code: string;
}

export interface HotelDetails {
  address: string;
  city: string;
  confirmation?: string;
}

export interface Activity {
  id: string;
  trip_id: string;
  name: string;
  category: string;
  start_datetime: string;
  end_datetime: string;
  address: string | null;
  notes: string | null;
  booking_reference: string | null;
  cost_amount: number | null;
  cost_currency: string | null;
  links: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  trip_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface TimeSlot {
  hour: number;
  minute: number;
  label: string;
}

export interface DayInfo {
  date: Date;
  dateStr: string;
  dayOfWeek: string;
  city: string;
}

export type ModalMode = 'create' | 'edit';

export interface ActivityFormData {
  name: string;
  category: string;
  start_datetime: string;
  end_datetime: string;
  address: string;
  notes: string;
  booking_reference: string;
  cost_amount: string;
  cost_currency: string;
  links: string;
}
