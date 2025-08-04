'use client'

import Link from 'next/link'
import { Target, Users, Calendar, MapPin } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full">
                <Target className="h-12 w-12 text-green-600 dark:text-green-500" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 sm:text-5xl md:text-6xl">
              Find Your Perfect
              <span className="text-green-600 dark:text-green-500"> Football Match</span>
            </h1>
            <p className="mt-6 text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Connect with local football players, organize matches, and never miss a game. 
              Join the community that makes football accessible to everyone.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/matches"
                className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors"
              >
                Browse Matches
              </Link>
              <Link
                href="/auth/signup"
                className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 px-8 py-4 rounded-lg font-semibold text-lg transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Why Choose MatchHub?
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Everything you need to organize and join football matches
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-8 w-8 text-green-600 dark:text-green-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Easy Match Creation
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Create matches in minutes with our simple form. Set location, time, and player limits with ease.
            </p>
          </div>

          <div className="text-center">
            <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-green-600 dark:text-green-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Connect with Players
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Find local players and build your football community. Join matches or invite others to yours.
            </p>
          </div>

          <div className="text-center">
            <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <MapPin className="h-8 w-8 text-green-600 dark:text-green-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Local Matches
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Discover matches near you with our location-based search. Never travel far for a game again.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-green-600 dark:bg-green-700">
        <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Play?
          </h2>
          <p className="text-xl text-green-100 mb-8 max-w-2xl mx-auto">
            Join thousands of football players who have already found their perfect matches on MatchHub.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="bg-white text-green-600 hover:bg-gray-100 px-8 py-4 rounded-lg font-semibold text-lg transition-colors"
            >
              Create Account
            </Link>
            <Link
              href="/matches"
              className="border-2 border-white text-white hover:bg-white hover:text-green-600 px-8 py-4 rounded-lg font-semibold text-lg transition-colors"
            >
              Browse Matches
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
