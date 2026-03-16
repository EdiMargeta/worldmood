'use client'

import { useState, Suspense, lazy } from 'react'
import Link from 'next/link'
import { CountryWithStats } from '@/types'
import { useCountries } from '@/hooks/useCountries'
import TrendingBanner from '@/components/trending/TrendingBanner'
import ActivityFeed from '@/components/feed/ActivityFeed'
import Leaderboard from '@/components/leaderboard/Leaderboard'
import DailyQuestion from '@/components/DailyQuestion'
import CountryPanel from '@/components/panels/CountryPanel'

const WorldMap = lazy(() => import('@/components/map/WorldMap'))
const MapLegend = lazy(() => import('@/components/map/MapLegend'))

export default function HomePage() {
  const { countries, isLoading } = useCountries()
  const [selectedCountry, setSelectedCountry] = useState<CountryWithStats | null>(null)

  const countryMap = new Map(countries.map(c => [c.iso_code, c]))

  const handleCountryClick = (country: CountryWithStats) => setSelectedCountry(country)
  const handleIsoClick = (iso: string) => {
    const c = countryMap.get(iso)
    if (c) setSelectedCountry(c)
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#06060f', color: 'white', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 30,
        backgroundColor: 'rgba(6,6,15,0.9)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        height: '56px', display: 'flex', alignItems: 'center', padding: '0 16px',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>🌍</span>
          <span style={{ fontWeight: 700, fontSize: '16px' }}>WorldMood</span>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>Global Sentiment Map</span>
        </div>
        <nav style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/rankings" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', textDecoration: 'none' }}>
            Rankings
          </Link>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#4ade80', display: 'inline-block' }} />
            Live
          </span>
        </nav>
      </header>

      {/* Main layout: map + sidebar side by side */}
      <div style={{ paddingTop: '56px', display: 'flex', height: '100vh' }}>

        {/* Map area */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {isLoading ? (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>🌍</div>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>Loading global data…</p>
              </div>
            </div>
          ) : (
            <Suspense fallback={
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ color: 'rgba(255,255,255,0.3)' }}>Loading map…</div>
              </div>
            }>
              <WorldMap countries={countries} onCountryClick={handleCountryClick} />
              <MapLegend />
            </Suspense>
          )}

          {/* Stats bar */}
          <div style={{
            position: 'absolute', top: '16px', left: '50%', transform: 'translateX(-50%)',
            display: 'flex', alignItems: 'center', gap: '12px',
            backgroundColor: 'rgba(13,13,26,0.92)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: '999px',
            padding: '6px 20px', fontSize: '12px', color: 'rgba(255,255,255,0.6)',
            whiteSpace: 'nowrap', zIndex: 10
          }}>
            <span>🗳️ <strong style={{ color: 'white' }}>{countries.reduce((a, c) => a + c.total_votes, 0).toLocaleString()}</strong> votes today</span>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
            <span>🌍 <strong style={{ color: 'white' }}>{countries.filter(c => c.total_votes > 0).length}</strong> countries active</span>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
            <span>Click any country to vote</span>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{
          width: '340px', flexShrink: 0,
          borderLeft: '1px solid rgba(255,255,255,0.06)',
          overflowY: 'auto',
          backgroundColor: '#06060f',
          height: '100%'
        }}>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <DailyQuestion />
            <TrendingBanner onCountryClick={handleIsoClick} />
            <Leaderboard onCountryClick={handleIsoClick} />
            <ActivityFeed />
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.15)', fontSize: '11px', padding: '8px 0' }}>
              <p>WorldMood · Anonymous · Live</p>
              <p style={{ marginTop: '4px' }}>
                <Link href="/rankings" style={{ color: 'rgba(255,255,255,0.2)', textDecoration: 'none' }}>Rankings</Link>
                {' · '}
                <Link href="/admin" style={{ color: 'rgba(255,255,255,0.2)', textDecoration: 'none' }}>Admin</Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      <CountryPanel country={selectedCountry} onClose={() => setSelectedCountry(null)} />
    </div>
  )
}
