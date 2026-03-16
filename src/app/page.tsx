'use client'
// app/page.tsx

import { useState, Suspense, lazy } from 'react'
import Link from 'next/link'
import { CountryWithStats } from '@/types'
import { useCountries } from '@/hooks/useCountries'
import TrendingBanner from '@/components/trending/TrendingBanner'
import ActivityFeed from '@/components/feed/ActivityFeed'
import Leaderboard from '@/components/leaderboard/Leaderboard'
import DailyQuestion from '@/components/DailyQuestion'
import CountryPanel from '@/components/panels/CountryPanel'

// Lazy load the heavy map component
const WorldMap = lazy(() => import('@/components/map/WorldMap'))
const MapLegend = lazy(() => import('@/components/map/MapLegend'))

export default function HomePage() {
  const { countries, isLoading } = useCountries()
  const [selectedCountry, setSelectedCountry] = useState<CountryWithStats | null>(null)

  const countryMap = new Map(countries.map(c => [c.iso_code, c]))

  const handleCountryClick = (country: CountryWithStats) => {
    setSelectedCountry(country)
  }

  const handleIsoClick = (iso: string) => {
    const c = countryMap.get(iso)
    if (c) setSelectedCountry(c)
  }

  return (
    <div className="min-h-screen bg-[#06060f] text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-30 bg-[#06060f]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌍</span>
            <span className="font-bold text-white">WorldMood</span>
            <span className="hidden sm:inline text-white/30 text-sm">Global Sentiment Map</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/rankings" className="text-white/50 hover:text-white text-sm transition-colors">
              Rankings
            </Link>
            <span className="flex items-center gap-1.5 text-xs text-white/30">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Live
            </span>
          </nav>
        </div>
      </header>

      {/* Main layout */}
      <div className="pt-14 flex flex-col xl:flex-row min-h-screen">

        {/* Map — full center */}
        <div className="flex-1 relative" style={{ minHeight: 'calc(100vh - 56px)' }}>
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-3 animate-spin">🌍</div>
                <p className="text-white/30 text-sm">Loading global data…</p>
              </div>
            </div>
          ) : (
            <Suspense fallback={
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white/30">Loading map…</div>
              </div>
            }>
              <WorldMap
                countries={countries}
                onCountryClick={handleCountryClick}
              />
              <MapLegend />
            </Suspense>
          )}

          {/* Stats bar */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-[#0d0d1a]/90 backdrop-blur border border-white/10 rounded-full px-5 py-2 text-xs text-white/60 whitespace-nowrap">
            <span>
              🗳️ <span className="text-white font-medium">
                {countries.reduce((a, c) => a + c.total_votes, 0).toLocaleString()}
              </span> votes today
            </span>
            <span className="text-white/20">·</span>
            <span>
              🌍 <span className="text-white font-medium">
                {countries.filter(c => c.total_votes > 0).length}
              </span> countries active
            </span>
            <span className="text-white/20 hidden sm:inline">·</span>
            <span className="hidden sm:inline">
              Click any country to vote
            </span>
          </div>
        </div>

        {/* Right sidebar */}
        <aside className="xl:w-[340px] xl:min-h-screen xl:border-l xl:border-white/5 xl:overflow-y-auto">
          <div className="p-4 space-y-4">
            <DailyQuestion />
            <TrendingBanner onCountryClick={handleIsoClick} />
            <Leaderboard onCountryClick={handleIsoClick} />
            <ActivityFeed />

            {/* Footer */}
            <div className="text-center text-white/15 text-xs py-4">
              <p>WorldMood · Anonymous · Live</p>
              <p className="mt-1">
                <Link href="/rankings" className="hover:text-white/40 transition-colors">
                  Rankings
                </Link>
                {' · '}
                <Link href="/admin" className="hover:text-white/40 transition-colors">
                  Admin
                </Link>
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* Country detail panel */}
      <CountryPanel
        country={selectedCountry}
        onClose={() => setSelectedCountry(null)}
      />
    </div>
  )
}
