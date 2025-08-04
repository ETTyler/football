'use client'

import Link from 'next/link'
import { Match } from '@/lib/supabase'
import { formatTime } from '@/lib/utils'
import { Calendar, Clock, MapPin, Users, PoundSterling, CheckCircle, Settings } from 'lucide-react'
import { format } from 'date-fns'

interface MatchCardProps {
  match: Match
  userParticipationStatus?: 'joined' | 'organizer' | 'not-joined'
  currentUserId?: string
}

export default function MatchCard({ 
  match, 
  userParticipationStatus = 'not-joined',
  currentUserId 
}: MatchCardProps) {
  const matchDate = new Date(match.date)
  const isUpcoming = matchDate >= new Date()
  const isFull = match.current_players >= match.max_players
  const isOrganizer = currentUserId && match.organizer_id === currentUserId

  // Determine the action text and styling based on user's relationship to the match
  const getActionContent = () => {
    if (!isUpcoming) {
      return {
        text: 'View Match Details',
        color: 'text-gray-600 dark:text-gray-400',
        icon: null
      }
    }

    if (isOrganizer || userParticipationStatus === 'organizer') {
      return {
        text: 'Manage Match',
        color: 'text-blue-600 dark:text-blue-400',
        icon: <Settings className="h-4 w-4" />
      }
    }

    if (userParticipationStatus === 'joined') {
      return {
        text: 'Already Joined',
        color: 'text-green-600 dark:text-green-400',
        icon: <CheckCircle className="h-4 w-4" />
      }
    }

    if (isFull) {
      return {
        text: 'Match Full',
        color: 'text-red-600 dark:text-red-400',
        icon: null
      }
    }

    return {
      text: 'Join Match →',
      color: 'text-green-600 dark:text-green-400',
      icon: null
    }
  }

  const actionContent = getActionContent()

  return (
    <Link href={`/matches/${match.id}`}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md dark:hover:shadow-xl transition-shadow cursor-pointer">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">{match.title}</h3>
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{format(matchDate, 'MMM dd, yyyy')}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{formatTime(match.time)}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {/* Status badges */}
            <div className="flex flex-col items-end gap-1">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                isUpcoming 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
              }`}>
                {isUpcoming ? 'Upcoming' : 'Past'}
              </span>
              
              {/* Participation status badge */}
              {isOrganizer && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                  Your Match
                </span>
              )}
              {userParticipationStatus === 'joined' && !isOrganizer && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                  Joined
                </span>
              )}
            </div>
            
            <span className="text-lg font-bold text-green-600 dark:text-green-500">
              {match.pitch_type}
            </span>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-start gap-2 mb-4">
          <MapPin className="h-4 w-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
          <span className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{match.location}</span>
        </div>

        {/* Match Details */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              <span className={`text-sm font-medium ${
                isFull ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'
              }`}>
                {match.current_players}/{match.max_players}
                {isFull && ' (Full)'}
              </span>
            </div>
            
            {match.pricing > 0 && (
              <div className="flex items-center gap-1">
                <PoundSterling className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">£{match.pricing}</span>
              </div>
            )}
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400">
            by {match.organizer?.full_name || match.organizer?.email || 'Anonymous'}
          </div>
        </div>

        {/* Notes Preview */}
        {match.notes && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{match.notes}</p>
          </div>
        )}

        {/* Action Indicator */}
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div className={`flex items-center gap-2 text-sm font-medium ${actionContent.color}`}>
              {actionContent.icon}
              <span>{actionContent.text}</span>
            </div>
            {!isUpcoming && (
              <span className="text-xs text-gray-400 dark:text-gray-500">Match completed</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
} 