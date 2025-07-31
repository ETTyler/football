'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { MapPin, Plus, List, User, LogOut, Target } from 'lucide-react'
import NotificationCenter from './NotificationCenter'

export default function Navigation() {
  const { user, signOut, loading } = useAuth()

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <Link href="/" className="flex items-center space-x-2 text-xl font-bold text-green-600">
            <Target className="h-6 w-6" />
            <span>MatchHub</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-gray-700 hover:text-green-600 transition-colors">
              Home
            </Link>
            <Link href="/matches" className="flex items-center space-x-1 text-gray-700 hover:text-green-600 transition-colors">
              <List className="h-4 w-4" />
              <span>Browse Matches</span>
            </Link>
            {user && (
              <Link href="/create-match" className="flex items-center space-x-1 text-gray-700 hover:text-green-600 transition-colors">
                <Plus className="h-4 w-4" />
                <span>Create Match</span>
              </Link>
            )}
          </div>

          {/* Auth Section */}
          <div className="flex items-center space-x-4">
            {loading ? (
              <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse"></div>
            ) : user ? (
              <div className="flex items-center space-x-4">
                {/* Notification Center */}
                <NotificationCenter />
                
                <Link
                  href="/dashboard"
                  className="flex items-center space-x-1 text-gray-700 hover:text-green-600 transition-colors"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>
                <button
                  onClick={() => signOut()}
                  className="flex items-center space-x-1 text-gray-700 hover:text-red-600 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/auth/signin"
                  className="text-gray-700 hover:text-green-600 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        {user && (
          <div className="md:hidden border-t py-2">
            <div className="flex justify-around">
              <Link href="/matches" className="flex flex-col items-center py-2 text-xs text-gray-600">
                <List className="h-5 w-5 mb-1" />
                <span>Browse</span>
              </Link>
              <Link href="/create-match" className="flex flex-col items-center py-2 text-xs text-gray-600">
                <Plus className="h-5 w-5 mb-1" />
                <span>Create</span>
              </Link>
              <Link href="/dashboard" className="flex flex-col items-center py-2 text-xs text-gray-600">
                <User className="h-5 w-5 mb-1" />
                <span>Profile</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
} 