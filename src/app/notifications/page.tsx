'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { 
  supabase, 
  Notification, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  updateInvitationStatus 
} from '@/lib/supabase'
import { Bell, X, Check, CheckCheck, Clock, Users, Loader2, AlertCircle, Trash2, Edit } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import Link from 'next/link'

export default function NotificationsPage() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread' | 'invitations'>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchNotifications()
    }
  }, [user])

  const fetchNotifications = async () => {
    if (!user) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          related_match:matches(id, title, date, time),
          related_invitation:invitations(id, status)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setNotifications(data || [])
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsRead = async (notificationId: string) => {
    setActionLoading(notificationId)
    try {
      await markNotificationAsRead(notificationId)
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      )
    } catch (error) {
      console.error('Error marking notification as read:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleMarkAllAsRead = async () => {
    if (!user) return

    setActionLoading('all')
    try {
      await markAllNotificationsAsRead(user.id)
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    } catch (error) {
      console.error('Error marking all as read:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteNotification = async (notificationId: string) => {
    setActionLoading(notificationId)
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      if (error) throw error
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
    } catch (error) {
      console.error('Error deleting notification:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleInvitationResponse = async (invitationId: string, status: 'accepted' | 'declined') => {
    setActionLoading(invitationId)
    try {
      await updateInvitationStatus(invitationId, status)
      // Refresh notifications to update the status
      await fetchNotifications()
    } catch (error) {
      console.error('Error updating invitation:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'match_invitation':
        return <Users className="h-5 w-5 text-blue-500" />
      case 'new_match':
        return <Bell className="h-5 w-5 text-green-500" />
      case 'match_update':
        return <Edit className="h-5 w-5 text-orange-500" />
      case 'invitation_accepted':
        return <Check className="h-5 w-5 text-green-500" />
      case 'invitation_declined':
        return <X className="h-5 w-5 text-red-500" />
      default:
        return <Bell className="h-5 w-5 text-gray-500" />
    }
  }

  const getFilteredNotifications = () => {
    switch (filter) {
      case 'unread':
        return notifications.filter(n => !n.read)
      case 'invitations':
        return notifications.filter(n => n.type === 'match_invitation')
      default:
        return notifications
    }
  }

  const renderNotificationActions = (notification: Notification) => {
    if (notification.type === 'match_invitation' && notification.related_invitation_id) {
      const invitation = notification.related_invitation
      if (invitation?.status === 'pending') {
        return (
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => handleInvitationResponse(notification.related_invitation_id!, 'accepted')}
              disabled={actionLoading === notification.related_invitation_id}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {actionLoading === notification.related_invitation_id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Accept
            </button>
            <button
              onClick={() => handleInvitationResponse(notification.related_invitation_id!, 'declined')}
              disabled={actionLoading === notification.related_invitation_id}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {actionLoading === notification.related_invitation_id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
              Decline
            </button>
          </div>
        )
      } else {
        return (
          <div className="mt-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
              invitation?.status === 'accepted' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {invitation?.status === 'accepted' ? 'Accepted' : 'Declined'}
            </span>
          </div>
        )
      }
    }
    return null
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h1>
          <p className="text-gray-600 mb-6">You need to be signed in to view notifications.</p>
          <Link
            href="/auth/signin"
            className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  const filteredNotifications = getFilteredNotifications()
  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Notifications</h1>
        <p className="text-gray-600">Stay updated with your matches and invitations</p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'unread'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setFilter('invitations')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'invitations'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Invitations ({notifications.filter(n => n.type === 'match_invitation').length})
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={actionLoading === 'all'}
              className="flex items-center gap-2 px-4 py-2 text-green-600 hover:text-green-700 font-medium transition-colors disabled:opacity-50"
            >
              {actionLoading === 'all' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCheck className="h-4 w-4" />
              )}
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-lg shadow-sm">
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-green-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {filter === 'unread' ? 'No unread notifications' : 
               filter === 'invitations' ? 'No invitations' : 'No notifications'}
            </h3>
            <p className="text-gray-600">
              {filter === 'all' 
                ? "You'll see notifications here when you receive match invitations or updates."
                : `Switch to "All" to see your complete notification history.`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-6 transition-colors ${!notification.read ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {notification.title}
                        </h3>
                        <p className="text-gray-600 mb-2">
                          {notification.message}
                        </p>

                        {notification.related_match && (
                          <div className="bg-gray-50 rounded-lg p-3 mb-3">
                            <p className="font-medium text-gray-900">
                              {notification.related_match.title}
                            </p>
                            <p className="text-sm text-gray-600">
                              {format(new Date(notification.related_match.date), 'EEEE, MMMM dd, yyyy')} at{' '}
                              {notification.related_match.time}
                            </p>
                          </div>
                        )}
                        
                        {renderNotificationActions(notification)}
                        
                        <div className="flex items-center gap-2 mt-3">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-500">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {!notification.read && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            disabled={actionLoading === notification.id}
                            className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                            title="Mark as read"
                          >
                            {actionLoading === notification.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </button>
                        )}
                        
                        {notification.related_match_id && (
                          <Link
                            href={`/matches/${notification.related_match_id}`}
                            className="p-2 text-green-600 hover:text-green-700 transition-colors"
                            title="View match"
                          >
                            <Users className="h-4 w-4" />
                          </Link>
                        )}
                        
                        <button
                          onClick={() => handleDeleteNotification(notification.id)}
                          disabled={actionLoading === notification.id}
                          className="p-2 text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                          title="Delete notification"
                        >
                          {actionLoading === notification.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 