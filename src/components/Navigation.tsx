'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { MapPin, Plus, List, User, LogOut, Target, Menu, X } from 'lucide-react'
import NotificationCenter from './NotificationCenter'

export default function Navigation() {
  const { user, signOut, loading } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const closeMobileMenu = () => setIsMobileMenuOpen(false)

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <Link href="/" className="flex items-center space-x-2 text-xl font-bold text-green-600 dark:text-green-500">
            <Target className="h-6 w-6" />
            <span>MatchHub</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-500 transition-colors">
              Home
            </Link>
            <Link href="/matches" className="flex items-center space-x-1 text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-500 transition-colors">
              <List className="h-4 w-4" />
              <span>Browse Matches</span>
            </Link>
            {user && (
              <Link href="/create-match" className="flex items-center space-x-1 text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-500 transition-colors">
                <Plus className="h-4 w-4" />
                <span>Create Match</span>
              </Link>
            )}
          </div>

          {/* Desktop Auth Section */}
          <div className="hidden md:flex items-center space-x-4">
            {user && <NotificationCenter />}
            
            {loading ? (
              <div className="animate-pulse">
                <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ) : user ? (
              <div className="flex items-center space-x-4">
                <Link 
                  href="/dashboard"
                  className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-500 transition-colors"
                >
                  <User className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
                <button
                  onClick={() => signOut()}
                  className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link 
                  href="/auth/signin"
                  className="text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-500 transition-colors"
                >
                  Sign In
                </Link>
                <Link 
                  href="/auth/signup"
                  className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile - Notifications + Menu Button */}
          <div className="md:hidden flex items-center space-x-2">
            {user && <NotificationCenter />}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-700">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {/* Navigation Links */}
              <Link 
                href="/" 
                className="block px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-500 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md transition-colors"
                onClick={closeMobileMenu}
              >
                Home
              </Link>
              <Link 
                href="/matches" 
                className="flex items-center space-x-2 px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-500 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md transition-colors"
                onClick={closeMobileMenu}
              >
                <List className="h-4 w-4" />
                <span>Browse Matches</span>
              </Link>
              {user && (
                <Link 
                  href="/create-match" 
                  className="flex items-center space-x-2 px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-500 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md transition-colors"
                  onClick={closeMobileMenu}
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Match</span>
                </Link>
              )}
              
              {/* Auth Section */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                {loading ? (
                  <div className="px-3 py-2">
                    <div className="animate-pulse">
                      <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                  </div>
                ) : user ? (
                  <div className="space-y-1">
                    <Link 
                      href="/dashboard"
                      className="flex items-center space-x-2 px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-500 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md transition-colors"
                      onClick={closeMobileMenu}
                    >
                      <User className="h-4 w-4" />
                      <span>Dashboard</span>
                    </Link>
                    <button
                      onClick={() => {
                        signOut()
                        closeMobileMenu()
                      }}
                      className="flex items-center space-x-2 w-full px-3 py-2 text-left text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Link 
                      href="/auth/signin"
                      className="block px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-500 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md transition-colors"
                      onClick={closeMobileMenu}
                    >
                      Sign In
                    </Link>
                    <Link 
                      href="/auth/signup"
                      className="block px-3 py-2 bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white rounded-md font-medium transition-colors text-center"
                      onClick={closeMobileMenu}
                    >
                      Get Started
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
} 