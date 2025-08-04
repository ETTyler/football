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
      // Update the notification to reflect the new status
      setNotifications(prev => 
        prev.map(n => {
          if (n.related_invitation_id === invitationId && n.related_invitation) {
            return {
              ...n,
              related_invitation: { ...n.related_invitation, status }
            }
          }
          return n
        })
      )
    } catch (error) {
      console.error('Error updating invitation status:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'match_invitation':
        return <Users className="h-5 w-5 text-blue-500" />
      case 'match_update':
        return <Edit className="h-5 w-5 text-green-500" />
      case 'new_match':
        return <Bell className="h-5 w-5 text-green-500" />
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
              className="px-3 py-1 bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white text-xs rounded transition-colors disabled:opacity-50"
            >
              {actionLoading === notification.related_invitation_id ? 'Processing...' : 'Accept'}
            </button>
            <button
              onClick={() => handleInvitationResponse(notification.related_invitation_id!, 'declined')}
              disabled={actionLoading === notification.related_invitation_id}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600 text-white text-xs rounded transition-colors disabled:opacity-50"
            >
              {actionLoading === notification.related_invitation_id ? 'Processing...' : 'Decline'}
            </button>
          </div>
        )
      }
    }
    return null
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Bell className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Authentication Required</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Please sign in to view your notifications.</p>
          <Link href="/auth/signin" className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium transition-colors">
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-green-600 dark:text-green-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading notifications...</p>
        </div>
      </div>
    )
  }

  const filteredNotifications = getFilteredNotifications()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Notifications</h1>
          <p className="text-gray-600 dark:text-gray-400">Stay updated with your match activities</p>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'unread'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Unread ({notifications.filter(n => !n.read).length})
              </button>
              <button
                onClick={() => setFilter('invitations')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'invitations'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Invitations ({notifications.filter(n => n.type === 'match_invitation').length})
              </button>
            </div>

            {notifications.some(n => !n.read) && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={actionLoading === 'all'}
                className="flex items-center gap-2 text-sm text-green-600 dark:text-green-500 hover:text-green-700 dark:hover:text-green-400 disabled:opacity-50"
              >
                <CheckCheck className="h-4 w-4" />
                Mark all read
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {filteredNotifications.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
              <Bell className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No notifications</h3>
              <p className="text-gray-600 dark:text-gray-400">
                {filter === 'all' 
                  ? "You're all caught up! Check back later for new notifications."
                  : filter === 'unread'
                  ? "No unread notifications."
                  : "No invitation notifications."
                }
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${
                  !notification.read ? 'border-l-4 border-l-blue-500 dark:border-l-blue-400' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">
                          {notification.title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                          {notification.message}
                        </p>
                        
                        {renderNotificationActions(notification)}
                        
                        <div className="flex items-center gap-4 mt-3">
                          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                            <Clock className="h-3 w-3" />
                            <span>{formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}</span>
                          </div>
                          
                          {notification.related_match && (
                            <Link
                              href={`/matches/${notification.related_match.id}`}
                              className="text-xs text-green-600 dark:text-green-500 hover:text-green-700 dark:hover:text-green-400"
                            >
                              View Match
                            </Link>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        {!notification.read && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            disabled={actionLoading === notification.id}
                            className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors disabled:opacity-50"
                            title="Mark as read"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleDeleteNotification(notification.id)}
                          disabled={actionLoading === notification.id}
                          className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                          title="Delete notification"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
} 