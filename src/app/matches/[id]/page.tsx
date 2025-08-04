'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, Match, MatchParticipant, Invitation, createInvitation, UserSearchResult } from '@/lib/supabase'
import { formatTime } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import dynamic from 'next/dynamic'
import UserSearch, { SelectedUsersList } from '@/components/UserSearch'
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  PoundSterling, 
  User, 
  UserPlus, 
  UserMinus, 
  Edit,
  Trash2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Send,
  Mail,
  CheckCircle,
  XCircle,
  Clock as ClockIcon
} from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'

// Simple static map display using OpenStreetMap
const SimpleMapDisplay = ({ latitude, longitude, location }: { 
  latitude: number; 
  longitude: number; 
  location: string;
}) => {
  return (
    <div className="space-y-2">
      <div className="h-64 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
        <iframe
          width="100%"
          height="100%"
          style={{ border: 0 }}
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${longitude-0.01},${latitude-0.01},${longitude+0.01},${latitude+0.01}&layer=mapnik&marker=${latitude},${longitude}`}
          title={`Map showing ${location}`}
        />
      </div>
      <div className="p-3 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <MapPin className="h-4 w-4 mr-2" />
            <span>{location}</span>
          </div>
          <a
            href={`https://www.google.com/maps?q=${latitude},${longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Open in Google Maps →
          </a>
        </div>
      </div>
    </div>
  )
}

export default function MatchDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [match, setMatch] = useState<Match | null>(null)
  const [participants, setParticipants] = useState<MatchParticipant[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userParticipation, setUserParticipation] = useState<MatchParticipant | null>(null)
  
  // Invitation states
  const [showInviteSection, setShowInviteSection] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<UserSearchResult[]>([])
  const [inviteMessage, setInviteMessage] = useState('Hey! I thought you might be interested in joining this football match. Hope to see you there!')
  const [inviteLoading, setInviteLoading] = useState(false)

  const matchId = params.id as string

  useEffect(() => {
    if (matchId) {
      fetchMatchDetails()
      fetchParticipants()
    }
  }, [matchId])

  // Separate effect for invitations that depends on user and match being loaded
  useEffect(() => {
    if (matchId && user && match) {
      fetchInvitations()
    }
  }, [matchId, user, match])

  const fetchMatchDetails = async () => {
    try {
      setLoading(true)
      console.log('Fetching match with ID:', matchId)
      
      // First, try to get the match data without the join
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single()

      if (matchError) {
        console.error('Match query error:', matchError)
        throw new Error(`Match not found: ${matchError.message}`)
      }

      if (!matchData) {
        throw new Error('No match data returned')
      }

      console.log('Match data found:', matchData)

      // Then get the organizer data separately
      const { data: organizerData, error: organizerError } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .eq('id', matchData.organizer_id)
        .single()

      // If user_profiles doesn't have the data, try to get it from auth.users metadata
      let organizerInfo = {
        id: matchData.organizer_id,
        email: 'Unknown',
        full_name: 'Anonymous Organizer'
      }

      if (organizerData) {
        organizerInfo = {
          id: organizerData.id,
          email: 'Unknown',
          full_name: organizerData.full_name || 'Anonymous Organizer'
        }
      } else {
        // Try to get email from auth.users (this might not work due to RLS)
        const { data: userData } = await supabase
          .from('auth.users')
          .select('email, raw_user_meta_data')
          .eq('id', matchData.organizer_id)
          .single()

        if (userData) {
          organizerInfo = {
            id: matchData.organizer_id,
            email: userData.email || 'Unknown',
            full_name: userData.raw_user_meta_data?.full_name || 'Anonymous Organizer'
          }
        }
      }

      // Get actual participant count to ensure accuracy
      const { data: participantCountData, error: countError } = await supabase
        .from('match_participants')
        .select('id', { count: 'exact' })
        .eq('match_id', matchId)

      const actualParticipantCount = participantCountData?.length || 0

      const transformedMatch = {
        ...matchData,
        // Use actual participant count instead of relying on database trigger
        current_players: actualParticipantCount,
        organizer: organizerInfo
      } as Match

      console.log('Transformed match with corrected participant count:', transformedMatch)
      setMatch(transformedMatch)
    } catch (err) {
      console.error('Error fetching match details:', err)
      setError(err instanceof Error ? err.message : 'Failed to load match details')
    } finally {
      setLoading(false)
    }
  }

  const fetchParticipants = async () => {
    try {
      console.log('Fetching participants for match:', matchId)
      
      const { data, error } = await supabase
        .from('match_participants')
        .select(`
          id,
          created_at,
          match_id,
          user_id
        `)
        .eq('match_id', matchId)

      if (error) {
        console.error('Participants query error:', error)
        return
      }

      console.log('Participants data:', data)

      // Get user info for each participant
      const participantsWithUserInfo = await Promise.all(
        data.map(async (participant) => {
          // Try to get user info from user_profiles first
          const { data: profileData } = await supabase
            .from('user_profiles')
            .select('id, full_name')
            .eq('id', participant.user_id)
            .single()

          const userInfo = {
            id: participant.user_id,
            email: 'Unknown',
            full_name: profileData?.full_name || 'Anonymous Player'
          }

          return {
            ...participant,
            user: userInfo,
            joined_at: participant.created_at
          } as MatchParticipant
        })
      )

      setParticipants(participantsWithUserInfo)

      // Check if current user is participating
      if (user) {
        const userParticipant = participantsWithUserInfo.find(p => p.user_id === user.id)
        setUserParticipation(userParticipant || null)
      }
    } catch (err) {
      console.error('Error fetching participants:', err)
    }
  }

  const fetchInvitations = async () => {
    try {
      console.log('Fetching invitations for match:', matchId, 'user:', user?.id, 'match loaded:', !!match)
      
      // Only fetch invitations if user is authenticated and match is loaded
      if (!user || !match) {
        console.log('Skipping invitation fetch - user or match not ready')
        return
      }
      
      // First get the invitation data
      const { data: invitationData, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching invitations:', error)
        setInvitations([]) // Set empty array on error
        return
      }

      console.log('Invitation data:', invitationData)

      if (!invitationData || invitationData.length === 0) {
        console.log('No invitations found')
        setInvitations([])
        return
      }

      // Get user info for each invitee
      const invitationsWithUserInfo = await Promise.all(
        invitationData.map(async (invitation) => {
          // Get invitee user info
          const { data: inviteeData } = await supabase
            .from('user_profiles')
            .select('id, full_name')
            .eq('id', invitation.invitee_id)
            .single()

          return {
            ...invitation,
            invitee: inviteeData || { 
              id: invitation.invitee_id, 
              full_name: 'Unknown User' 
            }
          } as Invitation
        })
      )

      console.log('Invitations with user info:', invitationsWithUserInfo)
      setInvitations(invitationsWithUserInfo)
    } catch (err) {
      console.error('Error fetching invitations:', err)
      setInvitations([]) // Set empty array on error
    }
  }

  const handleJoinMatch = async () => {
    if (!user || !match) return

    try {
      setActionLoading(true)
      const { error } = await supabase
        .from('match_participants')
        .insert([
          {
            match_id: matchId,
            user_id: user.id,
          },
        ])

      if (error) throw error

      // Immediately update local state for better UX
      setMatch(prev => prev ? { ...prev, current_players: prev.current_players + 1 } : null)
      
      // Immediately set user participation to prevent double-join
      const newParticipant = {
        id: 'temp-' + Date.now(), // Temporary ID
        created_at: new Date().toISOString(),
        match_id: matchId,
        user_id: user.id,
        joined_at: new Date().toISOString(),
        user: {
          id: user.id,
          email: user.email || 'Unknown',
          full_name: user.user_metadata?.full_name || 'You'
        }
      } as MatchParticipant
      
      setUserParticipation(newParticipant)

      // Refresh data to ensure consistency
      await Promise.all([fetchMatchDetails(), fetchParticipants()])
    } catch (err) {
      // Revert the optimistic update if there was an error
      setMatch(prev => prev ? { ...prev, current_players: Math.max(0, prev.current_players - 1) } : null)
      setUserParticipation(null) // Reset participation on error
      setError(err instanceof Error ? err.message : 'Failed to join match')
    } finally {
      setActionLoading(false)
    }
  }

  const handleLeaveMatch = async () => {
    if (!user || !userParticipation) return

    try {
      setActionLoading(true)
      const { error } = await supabase
        .from('match_participants')
        .delete()
        .eq('id', userParticipation.id)

      if (error) throw error

      // Immediately update local state for better UX
      setMatch(prev => prev ? { ...prev, current_players: Math.max(0, prev.current_players - 1) } : null)
      
      // Immediately remove user participation
      setUserParticipation(null)

      // Refresh data to ensure consistency
      await Promise.all([fetchMatchDetails(), fetchParticipants()])
    } catch (err) {
      // Revert the optimistic update if there was an error
      setMatch(prev => prev ? { ...prev, current_players: prev.current_players + 1 } : null)
      setError(err instanceof Error ? err.message : 'Failed to leave match')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteMatch = async () => {
    if (!user || !match || match.organizer_id !== user.id) return

    const confirmed = window.confirm('Are you sure you want to delete this match? This action cannot be undone.')
    if (!confirmed) return

    try {
      setActionLoading(true)
      const { error } = await supabase
        .from('matches')
        .delete()
        .eq('id', matchId)

      if (error) throw error

      router.push('/matches')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete match')
      setActionLoading(false)
    }
  }

  const handleUserSelect = (selectedUser: UserSearchResult) => {
    console.log('Match page: handleUserSelect called with user:', selectedUser)
    console.log('Match page: current selectedUsers:', selectedUsers)
    
    try {
      setSelectedUsers(prev => {
        const newUsers = [...prev, selectedUser]
        console.log('Match page: updating selectedUsers to:', newUsers)
        return newUsers
      })
      console.log('Match page: user selection completed successfully')
    } catch (error) {
      console.error('Match page: error in handleUserSelect:', error)
    }
  }

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(prev => prev.filter(u => u.id !== userId))
  }

  const handleSendInvitations = async () => {
    if (!user || !match || selectedUsers.length === 0) return

    setInviteLoading(true)
    try {
      const invitePromises = selectedUsers.map(selectedUser =>
        createInvitation(match.id, selectedUser.id, inviteMessage)
      )

      await Promise.all(invitePromises)
      
      // Reset form
      setSelectedUsers([])
      setShowInviteSection(false)
      
      // Refresh invitations
      await fetchInvitations()
      
      // Show success message
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitations')
    } finally {
      setInviteLoading(false)
    }
  }

  const getInvitationStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'declined':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <ClockIcon className="h-4 w-4 text-yellow-500" />
    }
  }

  const getInvitationStatusText = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'Accepted'
      case 'declined':
        return 'Declined'
      default:
        return 'Pending'
    }
  }

  // Get users who are already participants or have pending invitations
  const getExcludedUserIds = () => {
    const participantIds = participants.map(p => p.user_id)
    const invitedIds = invitations.map(i => i.invitee_id)
    return [...participantIds, ...invitedIds]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-green-600 dark:text-green-400" />
          <span className="text-gray-600 dark:text-gray-400">Loading match details...</span>
        </div>
      </div>
    )
  }

  if (error || !match) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">Unable to Load Match</h2>
          <p className="text-red-600 dark:text-red-400 mb-4">{error || 'This match could not be found or may have been deleted.'}</p>
          <div className="space-y-2">
            <p className="text-sm text-red-500 dark:text-red-400">Match ID: {matchId}</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
              <Link
                href="/matches"
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Back to Matches
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const matchDate = new Date(match.date)
  const isUpcoming = matchDate >= new Date()
  const isFull = match.current_players >= match.max_players
  const isOrganizer = user && match.organizer_id === user.id
  
  // More robust participation check
  const isUserParticipant = user && (
    userParticipation || 
    participants.some(p => p.user_id === user?.id)
  )
  
  const canJoin = user && !isUserParticipant && !isFull && isUpcoming && !isOrganizer
  const canLeave = user && isUserParticipant && !isOrganizer

  // Debug logging
  console.log('Match participation debug:', {
    userId: user?.id,
    userParticipation: !!userParticipation,
    participantsIncludeUser: participants.some(p => p.user_id === user?.id),
    isUserParticipant,
    canJoin,
    canLeave,
    isOrganizer,
    isFull,
    isUpcoming
  })

  return (
    <div className="max-w-4xl mx-auto bg-gray-50 dark:bg-gray-900 min-h-screen p-4">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/matches"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Matches
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{match.title}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Organized by {match.organizer?.full_name || match.organizer?.email || 'Anonymous'}
            </p>
          </div>
          
          {isOrganizer && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowInviteSection(!showInviteSection)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
              >
                <Mail className="h-4 w-4" />
                Invite Players
              </button>
              <Link
                href={`/matches/${matchId}/edit`}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
              >
                <Edit className="h-4 w-4" />
                Edit Match
              </Link>
              <button
                onClick={handleDeleteMatch}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 border border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Invitation Section (for organizers) */}
      {isOrganizer && showInviteSection && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Invite More Players</h3>
          
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <span className="text-red-700 dark:text-red-300">{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <UserSearch
              onUserSelect={handleUserSelect}
              selectedUsers={selectedUsers}
              excludeUserIds={getExcludedUserIds()}
              placeholder="Search for more players to invite..."
              matchDate={match?.date} // Pass the match date for availability filtering
            />

            <SelectedUsersList
              users={selectedUsers}
              onRemoveUser={handleRemoveUser}
            />

            {selectedUsers.length > 0 && (
              <div>
                <label htmlFor="invite-message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Invitation Message
                </label>
                <textarea
                  id="invite-message"
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  rows={3}
                  maxLength={500}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 resize-none"
                  placeholder="Add a personal message to your invitation..."
                />
                <div className="flex justify-between items-center mt-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    This message will be sent to {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {inviteMessage.length}/500
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleSendInvitations}
                disabled={selectedUsers.length === 0 || inviteLoading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {inviteLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send Invitations
              </button>
              <button
                onClick={() => {
                  setShowInviteSection(false)
                  setSelectedUsers([])
                  setError(null)
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Match Info Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{format(matchDate, 'EEEE, MMMM dd, yyyy')}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{format(matchDate, 'EEEE')}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{formatTime(match.time)}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Local time</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{match.pitch_type}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Pitch type</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">Location</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{match.location}</p>
                  </div>
                </div>

                {match.pricing > 0 && (
                  <div className="flex items-center gap-3">
                    <PoundSterling className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">£{match.pricing} per player</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Entry fee</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {match.current_players}/{match.max_players} players
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {isFull ? 'Match is full' : `${match.max_players - match.current_players} spots left`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {match.notes && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h3 className="font-medium mb-2 text-gray-900 dark:text-gray-100">Additional Notes</h3>
                <p className="text-gray-600 dark:text-gray-400">{match.notes}</p>
              </div>
            )}
          </div>

          {/* Map */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-medium mb-4 text-gray-900 dark:text-gray-100">Location</h3>
            <SimpleMapDisplay
              latitude={match.latitude}
              longitude={match.longitude}
              location={match.location}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Join/Leave Actions */}
          {user && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-medium mb-4 text-gray-900 dark:text-gray-100">Actions</h3>
              
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
                </div>
              )}

              <div className="space-y-3">
                {canJoin && (
                  <button
                    onClick={handleJoinMatch}
                    disabled={actionLoading}
                    className="w-full bg-green-600 dark:bg-green-500 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 dark:hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {actionLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="h-5 w-5" />
                        Join Match
                      </>
                    )}
                  </button>
                )}

                {canLeave && (
                  <button
                    onClick={handleLeaveMatch}
                    disabled={actionLoading}
                    className="w-full border-2 border-red-600 dark:border-red-500 text-red-600 dark:text-red-400 py-3 px-4 rounded-lg font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {actionLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <UserMinus className="h-5 w-5" />
                        Leave Match
                      </>
                    )}
                  </button>
                )}

                {!isUpcoming && (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                    This match has already taken place
                  </div>
                )}

                {isFull && !userParticipation && isUpcoming && (
                  <div className="text-center text-red-600 dark:text-red-400 py-4">
                    This match is full
                  </div>
                )}
              </div>
            </div>
          )}

          {!user && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-medium mb-4 text-gray-900 dark:text-gray-100">Join This Match</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Sign in to join this match and connect with other players.</p>
              <Link
                href="/auth/signin"
                className="w-full bg-green-600 dark:bg-green-500 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 dark:hover:bg-green-600 transition-colors block text-center"
              >
                Sign In to Join
              </Link>
            </div>
          )}

          {/* Participants */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-medium mb-4 text-gray-900 dark:text-gray-100">
              Players ({participants.length}/{match.max_players})
            </h3>
            
            {participants.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">No players have joined yet</p>
            ) : (
              <div className="space-y-3">
                {participants.map((participant) => (
                  <div key={participant.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
                        {participant.user?.full_name || participant.user?.email || 'Anonymous'}
                        {participant.user_id === match.organizer_id && (
                          <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs rounded-full">
                            Organizer
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Joined {format(new Date(participant.joined_at), 'MMM dd')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Invitations (for organizers) */}
          {isOrganizer && invitations.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-medium mb-4 text-gray-900 dark:text-gray-100">
                Invitations ({invitations.length})
              </h3>
              
              <div className="space-y-3">
                {invitations.map((invitation) => (
                  <div key={invitation.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                      {getInvitationStatusIcon(invitation.status)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
                        {invitation.invitee?.full_name || 'Anonymous User'}
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {getInvitationStatusText(invitation.status)}
                        </p>
                        <span className="text-xs text-gray-300 dark:text-gray-600">•</span>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {format(new Date(invitation.created_at), 'MMM dd')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 