-- Trip Planner Database Setup
-- Run this SQL in your Supabase SQL Editor

-- Trips table
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  timezone TEXT DEFAULT 'Asia/Hong_Kong',
  share_token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fixed Items (flights, hotels)
CREATE TABLE fixed_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('flight', 'hotel')),
  name TEXT NOT NULL,
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL,
  details JSONB,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activities
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL,
  address TEXT,
  notes TEXT,
  booking_reference TEXT,
  cost_amount DECIMAL(10,2),
  cost_currency TEXT,
  links TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trip_id, name)
);

-- Enable RLS
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Policies (allow all access - link-based security)
CREATE POLICY "Allow all on trips" ON trips FOR ALL USING (true);
CREATE POLICY "Allow all on fixed_items" ON fixed_items FOR ALL USING (true);
CREATE POLICY "Allow all on activities" ON activities FOR ALL USING (true);
CREATE POLICY "Allow all on categories" ON categories FOR ALL USING (true);

-- Enable Realtime for these tables
-- Go to Database > Replication in Supabase dashboard and enable for:
-- - activities
-- - fixed_items
-- - categories
