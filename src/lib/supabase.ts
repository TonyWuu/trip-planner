import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Trip, FixedItem, Activity, Category } from './types';
import { SEED_FLIGHTS, SEED_HOTELS, SEED_CATEGORIES } from './seed-data';
import { TRIP_NAME, TRIP_START_DATE, TRIP_END_DATE, TRIP_TIMEZONE } from './constants';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let supabaseInstance: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.');
    }
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseInstance;
}

// Trip functions
export async function createTrip(shareToken: string): Promise<Trip | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('trips')
    .insert({
      name: TRIP_NAME,
      start_date: TRIP_START_DATE,
      end_date: TRIP_END_DATE,
      timezone: TRIP_TIMEZONE,
      share_token: shareToken,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating trip:', error);
    return null;
  }

  // Seed fixed items and categories
  await seedTripData(data.id);

  return data;
}

export async function getTripByShareToken(shareToken: string): Promise<Trip | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('share_token', shareToken)
    .single();

  if (error) {
    console.error('Error fetching trip:', error);
    return null;
  }

  return data;
}

async function seedTripData(tripId: string): Promise<void> {
  const supabase = getSupabase();

  // Seed flights
  const flightsToInsert = SEED_FLIGHTS.map(flight => ({
    ...flight,
    trip_id: tripId,
  }));

  const { error: flightError } = await supabase
    .from('fixed_items')
    .insert(flightsToInsert);

  if (flightError) {
    console.error('Error seeding flights:', flightError);
  }

  // Seed hotels
  const hotelsToInsert = SEED_HOTELS.map(hotel => ({
    ...hotel,
    trip_id: tripId,
  }));

  const { error: hotelError } = await supabase
    .from('fixed_items')
    .insert(hotelsToInsert);

  if (hotelError) {
    console.error('Error seeding hotels:', hotelError);
  }

  // Seed categories
  const categoriesToInsert = SEED_CATEGORIES.map(category => ({
    ...category,
    trip_id: tripId,
  }));

  const { error: categoryError } = await supabase
    .from('categories')
    .insert(categoriesToInsert);

  if (categoryError) {
    console.error('Error seeding categories:', categoryError);
  }
}

// Fixed Items functions
export async function getFixedItems(tripId: string): Promise<FixedItem[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('fixed_items')
    .select('*')
    .eq('trip_id', tripId)
    .order('start_datetime', { ascending: true });

  if (error) {
    console.error('Error fetching fixed items:', error);
    return [];
  }

  return data || [];
}

export async function updateFixedItem(id: string, updates: Partial<FixedItem>): Promise<FixedItem | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('fixed_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating fixed item:', error);
    return null;
  }

  return data;
}

export async function deleteFixedItem(id: string): Promise<boolean> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('fixed_items')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting fixed item:', error);
    return false;
  }

  return true;
}

// Activities functions
export async function getActivities(tripId: string): Promise<Activity[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('trip_id', tripId)
    .order('start_datetime', { ascending: true });

  if (error) {
    console.error('Error fetching activities:', error);
    return [];
  }

  return data || [];
}

export async function createActivity(activity: Omit<Activity, 'id' | 'created_at' | 'updated_at'>): Promise<Activity | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('activities')
    .insert(activity)
    .select()
    .single();

  if (error) {
    console.error('Error creating activity:', error);
    return null;
  }

  return data;
}

export async function updateActivity(id: string, updates: Partial<Activity>): Promise<Activity | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('activities')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating activity:', error);
    return null;
  }

  return data;
}

export async function deleteActivity(id: string): Promise<boolean> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('activities')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting activity:', error);
    return false;
  }

  return true;
}

// Categories functions
export async function getCategories(tripId: string): Promise<Category[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('trip_id', tripId)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }

  return data || [];
}

export async function createCategory(category: Omit<Category, 'id' | 'created_at'>): Promise<Category | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('categories')
    .insert(category)
    .select()
    .single();

  if (error) {
    console.error('Error creating category:', error);
    return null;
  }

  return data;
}

// Realtime subscriptions
export function subscribeToActivities(
  tripId: string,
  onInsert: (activity: Activity) => void,
  onUpdate: (activity: Activity) => void,
  onDelete: (id: string) => void
) {
  const supabase = getSupabase();
  const channel = supabase
    .channel(`activities:${tripId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'activities',
        filter: `trip_id=eq.${tripId}`,
      },
      (payload) => onInsert(payload.new as Activity)
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'activities',
        filter: `trip_id=eq.${tripId}`,
      },
      (payload) => onUpdate(payload.new as Activity)
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'activities',
        filter: `trip_id=eq.${tripId}`,
      },
      (payload) => onDelete(payload.old.id as string)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToFixedItems(
  tripId: string,
  onInsert: (item: FixedItem) => void,
  onUpdate: (item: FixedItem) => void,
  onDelete: (id: string) => void
) {
  const supabase = getSupabase();
  const channel = supabase
    .channel(`fixed_items:${tripId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'fixed_items',
        filter: `trip_id=eq.${tripId}`,
      },
      (payload) => onInsert(payload.new as FixedItem)
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'fixed_items',
        filter: `trip_id=eq.${tripId}`,
      },
      (payload) => onUpdate(payload.new as FixedItem)
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'fixed_items',
        filter: `trip_id=eq.${tripId}`,
      },
      (payload) => onDelete(payload.old.id as string)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
