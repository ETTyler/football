-- MatchHub Database Schema
-- Run these commands in your Supabase SQL Editor

-- Enable Row Level Security (RLS)
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create matches table
CREATE TABLE IF NOT EXISTS matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  pitch_type TEXT NOT NULL CHECK (pitch_type IN ('5-a-side', '7-a-side', '11-a-side')),
  location TEXT NOT NULL,
  latitude FLOAT8 NOT NULL,
  longitude FLOAT8 NOT NULL,
  pricing DECIMAL(10,2) DEFAULT 0,
  max_players INTEGER NOT NULL,
  current_players INTEGER DEFAULT 0,
  notes TEXT,
  organizer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

-- Create match_participants table
CREATE TABLE IF NOT EXISTS match_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(match_id, user_id)
);

-- Create user_profiles table (optional, for extended user info)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  full_name TEXT,
  bio TEXT,
  location TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS matches_date_idx ON matches(date);
CREATE INDEX IF NOT EXISTS matches_organizer_idx ON matches(organizer_id);
CREATE INDEX IF NOT EXISTS matches_location_idx ON matches(latitude, longitude);
CREATE INDEX IF NOT EXISTS match_participants_match_idx ON match_participants(match_id);
CREATE INDEX IF NOT EXISTS match_participants_user_idx ON match_participants(user_id);

-- Enable RLS on all tables
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for matches table
-- Everyone can read matches
CREATE POLICY "Matches are viewable by everyone" ON matches
  FOR SELECT USING (true);

-- Only authenticated users can create matches
CREATE POLICY "Users can create matches" ON matches
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Only organizers can update their matches
CREATE POLICY "Organizers can update their matches" ON matches
  FOR UPDATE USING (auth.uid() = organizer_id);

-- Only organizers can delete their matches
CREATE POLICY "Organizers can delete their matches" ON matches
  FOR DELETE USING (auth.uid() = organizer_id);

-- RLS Policies for match_participants table
-- Everyone can read participants
CREATE POLICY "Match participants are viewable by everyone" ON match_participants
  FOR SELECT USING (true);

-- Only authenticated users can join matches
CREATE POLICY "Users can join matches" ON match_participants
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Users can leave matches they joined
CREATE POLICY "Users can leave matches" ON match_participants
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for user_profiles table
-- Everyone can read profiles
CREATE POLICY "Profiles are viewable by everyone" ON user_profiles
  FOR SELECT USING (true);

-- Users can create and update their own profile
CREATE POLICY "Users can manage their profile" ON user_profiles
  FOR ALL USING (auth.uid() = id);

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to update current_players count
CREATE OR REPLACE FUNCTION update_match_player_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE matches 
    SET current_players = current_players + 1 
    WHERE id = NEW.match_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE matches 
    SET current_players = current_players - 1 
    WHERE id = OLD.match_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update player count
DROP TRIGGER IF EXISTS match_participant_count_trigger ON match_participants;
CREATE TRIGGER match_participant_count_trigger
  AFTER INSERT OR DELETE ON match_participants
  FOR EACH ROW EXECUTE FUNCTION update_match_player_count();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to update updated_at
CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column(); 