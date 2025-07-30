import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database
export interface Match {
  id: string
  created_at: string
  title: string
  date: string
  time: string
  pitch_type: '5-a-side' | '7-a-side' | '11-a-side'
  location: string
  latitude: number
  longitude: number
  pricing: number
  max_players: number
  current_players: number
  notes?: string
  organizer_id: string
  organizer: {
    id: string
    email: string
    full_name?: string
  }
}

export interface MatchParticipant {
  id: string
  match_id: string
  user_id: string
  joined_at: string
  user: {
    id: string
    email: string
    full_name?: string
  }
}

export interface UserProfile {
  id: string
  email: string
  full_name?: string
  created_at: string
} 