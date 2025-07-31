import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper function to ensure current user has a profile with proper name
export async function ensureUserProfile(user: any): Promise<void> {
  if (!user) return

  const fullName = user.user_metadata?.full_name || user.user_metadata?.fullName

  if (fullName) {
    try {
      // Simply insert, let the database trigger handle conflicts
      await supabase
        .from('user_profiles')
        .insert({
          id: user.id,
          full_name: fullName
        })
    } catch (error) {
      // Profile might already exist, that's fine
      console.log('Profile may already exist:', error)
    }
  }
}

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

// New interfaces for invitations and notifications
export interface Invitation {
  id: string
  created_at: string
  updated_at: string
  match_id: string
  inviter_id: string
  invitee_id: string
  status: 'pending' | 'accepted' | 'declined'
  message?: string
  // Related objects when joined
  match?: Match
  inviter?: UserProfile
  invitee?: UserProfile
}

export interface Notification {
  id: string
  created_at: string
  user_id: string
  type: 'match_invitation' | 'new_match' | 'match_update' | 'invitation_accepted' | 'invitation_declined'
  title: string
  message: string
  read: boolean
  related_match_id?: string
  related_invitation_id?: string
  data?: any
  // Related objects when joined
  related_match?: Match
  related_invitation?: Invitation
}

// Helper functions for notifications
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const { data, error } = await supabase
    .rpc('get_unread_notification_count', { p_user_id: userId })
  
  if (error) {
    console.error('Error getting unread count:', error)
    return 0
  }
  
  return data || 0
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
  
  if (error) {
    console.error('Error marking notification as read:', error)
    throw error
  }
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false)
  
  if (error) {
    console.error('Error marking all notifications as read:', error)
    throw error
  }
}

// Helper functions for invitations
export async function createInvitation(
  matchId: string, 
  inviteeId: string, 
  message?: string
): Promise<Invitation> {
  const { data, error } = await supabase
    .from('invitations')
    .insert([{
      match_id: matchId,
      invitee_id: inviteeId,
      inviter_id: (await supabase.auth.getUser()).data.user?.id,
      message
    }])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateInvitationStatus(
  invitationId: string, 
  status: 'accepted' | 'declined'
): Promise<void> {
  const { error } = await supabase
    .from('invitations')
    .update({ status })
    .eq('id', invitationId)
  
  if (error) throw error
}

// Simple user interface for search results
export interface UserSearchResult {
  id: string
  full_name: string
}

// User availability interface
export interface UserAvailability {
  id: string
  created_at: string
  updated_at: string
  user_id: string
  day_of_week: number // 0=Sunday, 1=Monday, etc.
  available: boolean
}

// Day availability for UI
export interface DayAvailability {
  day_of_week: number
  available: boolean
  day_name: string
}

// Search users for invitations
export async function searchUsers(query: string, excludeIds: string[] = []): Promise<UserSearchResult[]> {
  try {
    console.log('Searching users with query:', query, 'excludeIds:', excludeIds)
    
    // Build the base query
    let dbQuery = supabase
      .from('user_profiles')
      .select('id, full_name')
      .ilike('full_name', `%${query}%`)
      .limit(10)
    
    // Filter out excluded IDs if any exist
    if (excludeIds.length > 0) {
      dbQuery = dbQuery.not('id', 'in', `(${excludeIds.join(',')})`)
    }
    
    const { data, error } = await dbQuery
    
    if (error) {
      console.error('Database error in searchUsers:', error)
      // Try a fallback approach without exclusion if the query fails
      if (excludeIds.length > 0) {
        console.log('Retrying search without exclusion filter...')
        const fallbackQuery = supabase
          .from('user_profiles')
          .select('id, full_name')
          .ilike('full_name', `%${query}%`)
          .limit(10)
        
        const { data: fallbackData, error: fallbackError } = await fallbackQuery
        
        if (fallbackError) {
          console.error('Fallback query also failed:', fallbackError)
          return []
        }
        
        // Manually filter out excluded IDs
        const filteredData = (fallbackData || []).filter(user => !excludeIds.includes(user.id))
        console.log('Fallback search results (filtered):', filteredData)
        return filteredData
      }
      return []
    }
    
    console.log('Search results:', data)
    return data || []
  } catch (err) {
    console.error('Unexpected error in searchUsers:', err)
    return []
  }
}

// ====== AVAILABILITY FUNCTIONS ======

// Get day names for UI
export const DAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
]

// Get user's availability for all days of the week
export async function getUserAvailability(userId: string): Promise<DayAvailability[]> {
  try {
    const { data, error } = await supabase.rpc('get_user_availability', {
      p_user_id: userId
    })

    if (error) throw error

    return (data || []).map((item: any) => ({
      day_of_week: item.day_of_week,
      available: item.available,
      day_name: DAY_NAMES[item.day_of_week]
    }))
  } catch (error) {
    console.error('Error fetching user availability:', error)
    // Return default availability (all days available)
    return DAY_NAMES.map((name, index) => ({
      day_of_week: index,
      available: true,
      day_name: name
    }))
  }
}

// Set user availability for a specific day
export async function setUserAvailability(userId: string, dayOfWeek: number, available: boolean): Promise<void> {
  try {
    const { error } = await supabase.rpc('set_user_availability', {
      p_user_id: userId,
      p_day_of_week: dayOfWeek,
      p_available: available
    })

    if (error) throw error
  } catch (error) {
    console.error('Error setting user availability:', error)
    throw error
  }
}

// Get users available for a specific date
export async function getAvailableUsersForDate(matchDate: string): Promise<UserSearchResult[]> {
  try {
    const { data, error } = await supabase.rpc('get_available_users_for_date', {
      p_date: matchDate
    })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching available users for date:', error)
    return []
  }
}

// Search users with availability priority for a specific date
export async function searchUsersWithAvailability(
  query: string, 
  matchDate?: string, 
  excludeIds: string[] = []
): Promise<{ available: UserSearchResult[], unavailable: UserSearchResult[], others: UserSearchResult[] }> {
  try {
    console.log('searchUsersWithAvailability called with:', { query, matchDate, excludeIds })
    
    // Get all users matching the search query
    const allUsers = await searchUsers(query, excludeIds)
    console.log('All users from search:', allUsers)
    
    if (!matchDate) {
      console.log('No match date provided, returning all as others')
      return { available: [], unavailable: [], others: allUsers }
    }

    // Get the day of week for the match date
    const matchDateObj = new Date(matchDate)
    const dayOfWeek = matchDateObj.getDay() // 0=Sunday, 1=Monday, etc.
    console.log('Match date:', matchDate, 'Day of week:', dayOfWeek)

    // Get detailed availability for all users
    const userAvailabilityPromises = allUsers.map(async (user) => {
      try {
        const { data, error } = await supabase.rpc('get_user_availability', {
          p_user_id: user.id
        })
        
        if (error) {
          console.error(`Error getting availability for user ${user.id}:`, error)
          return { user, status: 'unknown' }
        }

        // Find the availability for the specific day
        const dayAvailability = data?.find((d: any) => d.day_of_week === dayOfWeek)
        
        if (dayAvailability === undefined) {
          // No availability data, assume available (default behavior)
          console.log(`User ${user.full_name} has no availability data for day ${dayOfWeek}, assuming available`)
          return { user, status: 'available' }
        }
        
        const status = dayAvailability.available ? 'available' : 'unavailable'
        console.log(`User ${user.full_name} is ${status} on day ${dayOfWeek}`)
        return { user, status }
        
      } catch (err) {
        console.error(`Exception getting availability for user ${user.id}:`, err)
        return { user, status: 'unknown' }
      }
    })

    const userAvailabilityResults = await Promise.all(userAvailabilityPromises)
    console.log('User availability results:', userAvailabilityResults)

    // Categorize users based on their availability status
    const available = userAvailabilityResults
      .filter(result => result.status === 'available')
      .map(result => result.user)
    
    const unavailable = userAvailabilityResults
      .filter(result => result.status === 'unavailable')
      .map(result => result.user)
    
    const others = userAvailabilityResults
      .filter(result => result.status === 'unknown')
      .map(result => result.user)

    console.log('Final categorization:', { 
      available: available.length, 
      unavailable: unavailable.length, 
      others: others.length 
    })

    return { available, unavailable, others }
    
  } catch (error) {
    console.error('Error in searchUsersWithAvailability:', error)
    // Fallback: treat all users as others
    const allUsers = await searchUsers(query, excludeIds)
    return { available: [], unavailable: [], others: allUsers }
  }
} 