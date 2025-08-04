'use client'

import { useState, useEffect, useRef } from 'react'
import { searchUsers, UserSearchResult, getAvailableUsersForDate, searchUsersWithAvailability } from '@/lib/supabase'
import { Search, X, UserPlus, CheckCircle, XCircle, User } from 'lucide-react'

interface UserSearchProps {
  onUserSelect: (user: UserSearchResult) => void
  selectedUsers: UserSearchResult[]
  placeholder?: string
  excludeUserIds?: string[]
  matchDate?: string // Match date to check availability
}

export default function UserSearch({ 
  onUserSelect, 
  selectedUsers, 
  placeholder = "Search users to invite...",
  excludeUserIds = [],
  matchDate
}: UserSearchProps) {
  const [query, setQuery] = useState('')
  const [availableUsers, setAvailableUsers] = useState<UserSearchResult[]>([])
  const [unavailableUsers, setUnavailableUsers] = useState<UserSearchResult[]>([])
  const [otherUsers, setOtherUsers] = useState<UserSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const performSearch = async () => {
      if (query.trim().length < 2) {
        setAvailableUsers([])
        setUnavailableUsers([])
        setOtherUsers([])
        setShowResults(false)
        return
      }

      setIsSearching(true)
      try {
        const selectedIds = selectedUsers.map(u => u.id)
        const allExcludeIds = [...excludeUserIds, ...selectedIds]
        
        if (matchDate) {
          // Use the original working function for availability-aware search
          const results = await searchUsersWithAvailability(query.trim(), matchDate, allExcludeIds)
          console.log('UserSearch received availability results:', results)
          
          setAvailableUsers(results.availableUsers)
          setUnavailableUsers(results.unavailableUsers)
          setOtherUsers(results.otherUsers)
        } else {
          // Fallback to simple search when no match date
          const searchResults = await searchUsers(query.trim(), allExcludeIds)
          console.log('UserSearch received simple results:', searchResults)
          
          setAvailableUsers([])
          setUnavailableUsers([])
          setOtherUsers(searchResults)
        }
        
        setShowResults(true)
      } catch (error) {
        console.error('Error searching users:', error)
        setAvailableUsers([])
        setUnavailableUsers([])
        setOtherUsers([])
        setShowResults(false)
      } finally {
        setIsSearching(false)
      }
    }

    const timeoutId = setTimeout(performSearch, 300)
    return () => clearTimeout(timeoutId)
  }, [query, selectedUsers, excludeUserIds, matchDate])

  const handleUserSelect = (selectedUser: UserSearchResult) => {
    console.log('UserSearch: handleUserSelect called with user:', selectedUser)
    try {
      onUserSelect(selectedUser)
      setQuery('')
      setAvailableUsers([])
      setUnavailableUsers([])
      setOtherUsers([])
      setShowResults(false)
      console.log('UserSearch: user selection completed successfully')
    } catch (error) {
      console.error('UserSearch: error in handleUserSelect:', error)
    }
  }

  const renderUserButton = (user: UserSearchResult, isAvailable?: boolean) => {
    const availabilityIcon = isAvailable === true ? (
      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
    ) : isAvailable === false ? (
      <XCircle className="h-4 w-4 text-red-500 dark:text-red-400" />
    ) : (
      <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
    )

    const availabilityText = isAvailable === true ? 
      "Available" : isAvailable === false ? 
      "Not available" : "Click to invite"

    const bgColor = isAvailable === true ? 
      "bg-green-100 dark:bg-green-900/30" : isAvailable === false ?
      "bg-red-100 dark:bg-red-900/30" : "bg-gray-100 dark:bg-gray-700"

    const iconBgColor = isAvailable === true ?
      "bg-green-100 dark:bg-green-900/30" : isAvailable === false ?
      "bg-red-100 dark:bg-red-900/30" : "bg-gray-100 dark:bg-gray-700"

    return (
      <button
        key={user.id}
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          console.log('User button clicked for user:', user)
          handleUserSelect(user)
        }}
        className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 focus:bg-gray-50 dark:focus:bg-gray-700 focus:outline-none transition-colors flex items-center gap-3 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
      >
        <div className="flex-shrink-0">
          <div className={`w-8 h-8 ${iconBgColor} rounded-full flex items-center justify-center`}>
            {availabilityIcon}
          </div>
        </div>
        <div className="flex-1">
          <p className="font-medium text-gray-900 dark:text-gray-100">{user.full_name}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {availabilityText}
          </p>
        </div>
      </button>
    )
  }

  const hasResults = availableUsers.length > 0 || unavailableUsers.length > 0 || otherUsers.length > 0

  return (
    <div className="relative" ref={searchRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          onFocus={() => {
            if (hasResults) setShowResults(true)
          }}
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600 dark:border-green-500"></div>
          </div>
        )}
      </div>

      {showResults && hasResults && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {/* Available Users */}
          {availableUsers.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800">
                <p className="text-sm font-medium text-green-800 dark:text-green-300 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Available ({availableUsers.length})
                </p>
              </div>
              {availableUsers.map((user) => renderUserButton(user, true))}
            </div>
          )}

          {/* Unavailable Users */}
          {unavailableUsers.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
                <p className="text-sm font-medium text-red-800 dark:text-red-300 flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Not Available ({unavailableUsers.length})
                </p>
              </div>
              {unavailableUsers.map((user) => renderUserButton(user, false))}
            </div>
          )}

          {/* Other Users (when no match date provided) */}
          {otherUsers.length > 0 && (
            <div>
              {matchDate && (
                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Other Users ({otherUsers.length})
                  </p>
                </div>
              )}
              {otherUsers.map((user) => renderUserButton(user))}
            </div>
          )}
        </div>
      )}

      {showResults && !hasResults && query.length >= 2 && !isSearching && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-4 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">No users found matching &ldquo;{query}&rdquo;</p>
        </div>
      )}
    </div>
  )
}

// Selected Users List Component
interface SelectedUsersListProps {
  users: UserSearchResult[]
  onRemoveUser: (userId: string) => void
}

export function SelectedUsersList({ users, onRemoveUser }: SelectedUsersListProps) {
  if (users.length === 0) return null

  return (
    <div className="mt-4">
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Selected Users ({users.length})
      </h4>
      <div className="flex flex-wrap gap-2">
        {users.map((user) => (
          <div
            key={user.id}
            className="flex items-center gap-2 px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-sm"
          >
            <span>{user.full_name}</span>
            <button
              type="button"
              onClick={() => onRemoveUser(user.id)}
              className="hover:bg-green-200 dark:hover:bg-green-800/50 rounded-full p-1 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
} 