import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Constants
export const DAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
]

// Match interface
export interface Match {
  id: string
  created_at: string
  updated_at: string
  title: string
  organizer_id: string
  date: string
  time: string
  pitch_type: '5-a-side' | '6-a-side' | '7-a-side' | '11-a-side'
  location: string
  latitude: number
  longitude: number
  pricing: number
  max_players: number
  current_players: number
  notes?: string
  organizer?: {
    id: string
    full_name: string
    email?: string
  }
}

// Match participant interface
export interface MatchParticipant {
  id: string
  created_at: string
  match_id: string
  user_id: string
  joined_at: string
  user?: {
    id: string
    full_name: string
    email?: string
  }
}

// User profile interface
export interface UserProfile {
  id: string
  full_name: string
  email?: string
}

// Invitation interface
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

// Notification interface
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

// User search result interface
export interface UserSearchResult {
  id: string
  full_name: string
}

// User availability interfaces
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

// Helper functions for invitations
export async function createInvitation(
  matchId: string, 
  inviteeId: string, 
  message?: string
): Promise<Invitation> {
  try {
    console.log('Creating invitation:', { matchId, inviteeId, message })
    
    // Get current user
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError) throw userError
    if (!userData.user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('invitations')
      .insert([{
        match_id: matchId,
        invitee_id: inviteeId,
        inviter_id: userData.user.id,
        message: message || 'You have been invited to join this football match!'
      }])
      .select()
      .single()
    
    if (error) {
      console.error('Error creating invitation:', error)
      throw error
    }
    
    console.log('Successfully created invitation:', data)
    return data
  } catch (error) {
    console.error('Failed to create invitation:', error)
    throw error
  }
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

// User availability functions (for settings page)
export async function getUserAvailability(userId: string): Promise<DayAvailability[]> {
  try {
    const { data, error } = await supabase
      .from('user_availability')
      .select('day_of_week, available')
      .eq('user_id', userId)
      .order('day_of_week')

    if (error) throw error

    // Create array for all 7 days
    return DAY_NAMES.map((dayName, index) => {
      const existingAvailability = data?.find(d => d.day_of_week === index)
      return {
        day_of_week: index,
        available: existingAvailability?.available ?? true, // Default to available
        day_name: dayName
      }
    })
  } catch (error) {
    console.error('Error getting user availability:', error)
    // Return default availability (all days available)
    return DAY_NAMES.map((dayName, index) => ({
      day_of_week: index,
      available: true,
      day_name: dayName
    }))
  }
}

export async function setUserAvailability(userId: string, dayOfWeek: number, available: boolean): Promise<void> {
  try {
    const { error } = await supabase
      .from('user_availability')
      .upsert({
        user_id: userId,
        day_of_week: dayOfWeek,
        available: available
      }, {
        onConflict: 'user_id,day_of_week'
      })

    if (error) throw error
  } catch (error) {
    console.error('Error setting user availability:', error)
    throw error
  }
}

// Additional availability functions (for debug page)
export async function getAvailableUsersForDate(date: string): Promise<UserSearchResult[]> {
  try {
    console.log('Getting available users for date:', date)
    
    // Convert date to day of week (0=Sunday, 1=Monday, etc.)
    const dateObj = new Date(date)
    const dayOfWeek = dateObj.getDay()
    
    console.log('Converted to day of week:', dayOfWeek)
    
    // First try to use the RPC function if it exists
    try {
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_available_users_for_date', { 
          p_date: date 
        })

      if (!rpcError && rpcData) {
        console.log('RPC function worked, data:', rpcData)
        return rpcData.map((user: any) => ({
          id: user.user_id,
          full_name: user.full_name
        }))
      }
      
      console.log('RPC function failed or returned no data, using fallback approach')
    } catch (rpcError) {
      console.log('RPC function not available, using fallback approach')
    }
    
    // Fallback approach: query the tables separately
    console.log('Fetching all users...')
    
    // Get all users first
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('id, full_name')
    
    if (usersError) {
      console.error('Error fetching users:', usersError)
      throw usersError
    }
    
    console.log('Found users:', users?.length || 0)
    
    if (!users || users.length === 0) {
      console.log('No users found')
      return []
    }
    
    // Get availability data for this day of week
    console.log('Fetching availability for day of week:', dayOfWeek)
    
    const { data: availabilityData, error: availabilityError } = await supabase
      .from('user_availability')
      .select('user_id, available')
      .eq('day_of_week', dayOfWeek)
    
    if (availabilityError) {
      console.warn('Error fetching availability data:', availabilityError)
      console.log('Defaulting all users to available')
      // If availability table doesn't exist or has issues, default all users to available
      return users.map(user => ({
        id: user.id,
        full_name: user.full_name
      }))
    }
    
    console.log('Found availability records:', availabilityData?.length || 0)
    
    // Create a map of user availability
    const availabilityMap = new Map()
    if (availabilityData) {
      availabilityData.forEach(record => {
        availabilityMap.set(record.user_id, record.available)
      })
    }
    
    // Filter users who are available on this day
    const availableUsers = users.filter(user => {
      // If no availability record exists, default to available (true)
      // If availability record exists, use the available value
      const isAvailable = availabilityMap.get(user.id) !== false
      
      console.log(`User ${user.full_name}: availability =`, availabilityMap.get(user.id), 'isAvailable =', isAvailable)
      
      return isAvailable
    })
    
    const result = availableUsers.map(user => ({
      id: user.id,
      full_name: user.full_name
    }))
    
    console.log('Available users result:', result.length, 'out of', users.length, 'total users')
    return result
    
  } catch (error) {
    console.error('Error getting available users for date:', error)
    
    // Final fallback: return all users if everything else fails
    try {
      console.log('Using final fallback: returning all users')
      const { data: allUsers, error: fallbackError } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .limit(20)
      
      if (fallbackError) throw fallbackError
      
      return (allUsers || []).map(user => ({
        id: user.id,
        full_name: user.full_name
      }))
    } catch (fallbackError) {
      console.error('Final fallback also failed:', fallbackError)
      return []
    }
  }
}

export async function searchUsersWithAvailability(query: string, date: string, excludeIds: string[] = []): Promise<{
  availableUsers: UserSearchResult[]
  unavailableUsers: UserSearchResult[]
  otherUsers: UserSearchResult[]
}> {
  try {
    console.log('searchUsersWithAvailability called with:', { query, date, excludeIds })
    
    // Get all users matching the search query first
    const searchResults = await searchUsers(query, excludeIds)
    console.log('Search results:', searchResults)
    
    if (searchResults.length === 0) {
      return {
        availableUsers: [],
        unavailableUsers: [],
        otherUsers: []
      }
    }
    
    // Get users available for the specific date
    const availableForDate = await getAvailableUsersForDate(date)
    console.log('Available users for date:', availableForDate)
    
    const availableUserIds = new Set(availableForDate.map(u => u.id))
    
    // Categorize search results by availability
    const availableUsers = searchResults.filter(user => availableUserIds.has(user.id))
    const unavailableUsers = searchResults.filter(user => !availableUserIds.has(user.id))
    
    console.log('Categorized results:', {
      available: availableUsers.length,
      unavailable: unavailableUsers.length
    })
    
    return {
      availableUsers,
      unavailableUsers,
      otherUsers: [] // All users are categorized as available or unavailable
    }
  } catch (error) {
    console.error('Error in searchUsersWithAvailability:', error)
    
    // Fallback to simple search if availability check fails
    try {
      const searchResults = await searchUsers(query, excludeIds)
      return {
        availableUsers: [],
        unavailableUsers: [],
        otherUsers: searchResults
      }
    } catch (fallbackError) {
      console.error('Fallback search also failed:', fallbackError)
      return {
        availableUsers: [],
        unavailableUsers: [],
        otherUsers: []
      }
    }
  }
} 