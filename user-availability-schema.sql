-- User Availability System
-- Run this in your Supabase SQL Editor to add availability tracking

-- Create user_availability table
CREATE TABLE IF NOT EXISTS user_availability (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 1=Monday, etc.
  available BOOLEAN DEFAULT true NOT NULL,
  UNIQUE(user_id, day_of_week)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS user_availability_user_idx ON user_availability(user_id);
CREATE INDEX IF NOT EXISTS user_availability_day_idx ON user_availability(day_of_week);
CREATE INDEX IF NOT EXISTS user_availability_available_idx ON user_availability(available);

-- Enable RLS
ALTER TABLE user_availability ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_availability table
DROP POLICY IF EXISTS "Users can view all availability" ON user_availability;
CREATE POLICY "Users can view all availability" ON user_availability
  FOR SELECT USING (true); -- Everyone can see availability for match planning

DROP POLICY IF EXISTS "Users can manage their own availability" ON user_availability;
CREATE POLICY "Users can manage their own availability" ON user_availability
  FOR ALL USING (auth.uid() = user_id);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_user_availability_updated_at ON user_availability;
CREATE TRIGGER update_user_availability_updated_at 
  BEFORE UPDATE ON user_availability
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Helper function to get users available on a specific day
CREATE OR REPLACE FUNCTION get_available_users_for_day(p_day_of_week INTEGER)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.id,
    up.full_name,
    au.email
  FROM user_profiles up
  JOIN auth.users au ON up.id = au.id
  LEFT JOIN user_availability ua ON up.id = ua.user_id AND ua.day_of_week = p_day_of_week
  WHERE 
    COALESCE(ua.available, true) = true; -- If no availability set, assume available
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get a user's availability for all days
CREATE OR REPLACE FUNCTION get_user_availability(p_user_id UUID)
RETURNS TABLE (
  day_of_week INTEGER,
  available BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH days AS (
    SELECT generate_series(0, 6) AS day_num
  )
  SELECT 
    days.day_num::INTEGER,
    COALESCE(ua.available, true) AS available
  FROM days
  LEFT JOIN user_availability ua ON ua.user_id = p_user_id AND ua.day_of_week = days.day_num
  ORDER BY days.day_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to set user availability for a specific day
CREATE OR REPLACE FUNCTION set_user_availability(
  p_user_id UUID,
  p_day_of_week INTEGER,
  p_available BOOLEAN
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_availability (user_id, day_of_week, available)
  VALUES (p_user_id, p_day_of_week, p_available)
  ON CONFLICT (user_id, day_of_week)
  DO UPDATE SET 
    available = p_available,
    updated_at = timezone('utc'::text, now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get available users for a specific date (converts date to day of week)
CREATE OR REPLACE FUNCTION get_available_users_for_date(p_date DATE)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  email TEXT
) AS $$
DECLARE
  day_of_week_num INTEGER;
BEGIN
  -- Extract day of week from date (0=Sunday, 1=Monday, etc.)
  day_of_week_num := EXTRACT(DOW FROM p_date);
  
  RETURN QUERY
  SELECT * FROM get_available_users_for_day(day_of_week_num);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 