'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { MapPin, Users, Calendar, Trophy, Plus, Search } from 'lucide-react'

export default function Home() {
  const { user } = useAuth()

  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero Section */}
      <div className="text-center py-16">
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
          Find Your Perfect
          <span className="text-green-600 block">Football Match</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Connect with local players, organize matches, and join games in your area. 
          MatchHub makes it easy to play the beautiful game.
        </p>
        
        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {user ? (
            <>
              <Link
                href="/matches"
                className="bg-green-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <Search className="h-5 w-5" />
                Browse Matches
              </Link>
              <Link
                href="/create-match"
                className="border-2 border-green-600 text-green-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-green-50 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="h-5 w-5" />
                Create Match
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/auth/signup"
                className="bg-green-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-green-700 transition-colors"
              >
                Get Started Free
              </Link>
              <Link
                href="/matches"
                className="border-2 border-green-600 text-green-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-green-50 transition-colors"
              >
                Browse Matches
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Features Section */}
      <div className="grid md:grid-cols-3 gap-8 py-16">
        <div className="text-center p-6">
          <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold mb-3">Find Local Matches</h3>
          <p className="text-gray-600">
            Discover football matches happening near you with our interactive map and location-based search.
          </p>
        </div>

        <div className="text-center p-6">
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-semibold mb-3">Connect with Players</h3>
          <p className="text-gray-600">
            Join matches, meet new players, and build your local football community.
          </p>
        </div>

        <div className="text-center p-6">
          <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="h-8 w-8 text-purple-600" />
          </div>
          <h3 className="text-xl font-semibold mb-3">Easy Organization</h3>
          <p className="text-gray-600">
            Create and manage matches with our simple tools. Set dates, locations, and player limits.
          </p>
        </div>
      </div>

      {/* How it Works */}
      <div className="bg-white rounded-2xl p-8 shadow-sm">
        <h2 className="text-3xl font-bold text-center mb-12">How MatchHub Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="bg-green-600 text-white w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold">
              1
            </div>
            <h3 className="font-semibold mb-2">Create or Browse</h3>
            <p className="text-gray-600 text-sm">
              Create a new match or browse existing ones in your area
            </p>
          </div>

          <div className="text-center">
            <div className="bg-green-600 text-white w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold">
              2
            </div>
            <h3 className="font-semibold mb-2">Join & Connect</h3>
            <p className="text-gray-600 text-sm">
              Join matches that fit your schedule and skill level
            </p>
          </div>

          <div className="text-center">
            <div className="bg-green-600 text-white w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold">
              3
            </div>
            <h3 className="font-semibold mb-2">Play & Enjoy</h3>
            <p className="text-gray-600 text-sm">
              Show up, play, and enjoy the beautiful game with your community
            </p>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold mb-8">Join the Community</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <div className="text-3xl font-bold text-green-600">500+</div>
            <div className="text-gray-600">Matches Created</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-green-600">1,200+</div>
            <div className="text-gray-600">Active Players</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-green-600">50+</div>
            <div className="text-gray-600">Locations</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-green-600">5⭐</div>
            <div className="text-gray-600">User Rating</div>
          </div>
        </div>
      </div>
    </div>
  )
}
