'use client'

import { useState, Suspense, lazy, useEffect } from 'react'
import Link from 'next/link'
import { CountryWithStats } from '@/types'
import { useCountries } from '@/hooks/useCountries'
import TrendingBanner from '@/components/trending/TrendingBanner'
import ActivityFeed from '@/components/feed/ActivityFeed'
import DailyQuestion from '@/components/DailyQuestion'
import CountryPanel from '@/components/panels/CountryPanel'

const WorldMap = lazy(() => import('@/components/map/WorldMap'))
const MapLegend = lazy(() => import('@/components/map/MapLegend'))

interface LeaderEntry { flag_emoji: string; name: string; iso_code: string; pct: number; id: string }

function FooterLeaderboard({ onCountryClick }: { onCountryClick: (iso: string) => void }) {
  const [loved, setLoved] = useState<LeaderEntry[]>([])
  const [disliked, setDisliked] = useState<LeaderEntry[]>([])

  useEffect(() => {
    fetch('/api/rankings?sort=sentiment&order=desc')
      .then(r => r.json())
      .then((data: CountryWithStats[]) => {
        const withVotes = data.filter(c => c.total_votes > 0)
        const toEntry = (c: CountryWithStats): LeaderEntry => ({
          flag_emoji: c.flag_emoji, name: c.name, iso_code: c.iso_code, id: c.id,
          pct: c.total_votes > 0 ? Math.round((c.likes_24h / c.total_votes) * 100) : 0,
        })
        setLoved([...withVotes].sort((a, b) => b.sentiment - a.sentiment).slice(0, 5).map(toEntry))
        setDisliked([...withVotes].sort((a, b) => a.sentiment - b.sentiment).slice(0, 5).map(toEntry))
      })
  }, [])

  const strip: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '0',
    height: '48px', overflow: 'hidden',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(6,6,15,0.95)',
    flexShrink: 0,
  }

  const label: React.CSSProperties = {
    padding: '0 12px', fontSize: '10px', fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.08em',
    whiteSpace: 'nowrap', flexShrink: 0,
  }

  const divider: React.CSSProperties = {
    width: '1px', height: '28px', background: 'rgba(255,255,255,0.08)', flexShrink: 0, margin: '0 4px',
  }

  const item = (e: LeaderEntry, color: string) => (
    <button
      key={e.id}
      onClick={() => onCountryClick(e.iso_code)}
      style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '0 10px', height: '100%', background: 'none', border: 'none',
        cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background 0.15s',
        borderRight: '1px solid rgba(255,255,255,0.05)',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
    >
      <span style={{ fontSize: '16px' }}>{e.flag_emoji}</span>
      <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>{e.name}</span>
      <span style={{ color, fontSize: '11px', fontWeight: 700 }}>{e.pct}%</span>
    </button>
  )

  return (
    <div style={strip}>
      <span style={{ ...label, color: '#4ade80' }}>❤️ Loved</span>
      {loved.map(e => item(e, '#4ade80'))}
      <div style={divider} />
      <span style={{ ...label, color: '#f87171' }}>💔 Disliked</span>
      {disliked.map(e => item(e, '#f87171'))}
    </div>
  )
}

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
    <div style={{ height: '100vh', backgroundColor: '#06060f', color: 'white', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>

      {/* Header */}
      <header style={{
        flexShrink: 0, height: '52px',
        backgroundColor: 'rgba(6,6,15,0.95)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', padding: '0 16px',
        justifyContent: 'space-between', zIndex: 30,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>🌍</span>
          <span style={{ fontWeight: 700, fontSize: '15px', color: 'white' }}>WorldMood</span>
          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px' }}>Global Sentiment Map</span>
        </div>
        <nav style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/rankings" style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', textDecoration: 'none' }}>Rankings</Link>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#4ade80', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            Live
          </span>
        </nav>
      </header>

      {/* Body: map + sidebar */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Map column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Map */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            {isLoading ? (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>🌍</div>
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>Loading global data…</p>
                </div>
              </div>
            ) : (
              <Suspense fallback={<div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ color: 'rgba(255,255,255,0.3)' }}>Loading map…</div></div>}>
                <WorldMap countries={countries} onCountryClick={handleCountryClick} />
                <MapLegend />
              </Suspense>
            )}

            {/* Stats bar */}
            <div style={{
              position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)',
              display: 'flex', alignItems: 'center', gap: '10px',
              backgroundColor: 'rgba(13,13,26,0.92)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: '999px',
              padding: '5px 16px', fontSize: '11px', color: 'rgba(255,255,255,0.55)',
              whiteSpace: 'nowrap', zIndex: 10,
            }}>
              <span>🗳️ <strong style={{ color: 'white' }}>{countries.reduce((a, c) => a + c.total_votes, 0).toLocaleString()}</strong> votes today</span>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
              <span>🌍 <strong style={{ color: 'white' }}>{countries.filter(c => c.total_votes > 0).length}</strong> countries active</span>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
              <span>Click any country to vote</span>
            </div>
          </div>

          {/* Footer leaderboard strip */}
          <FooterLeaderboard onCountryClick={handleIsoClick} />
        </div>

        {/* Sidebar */}
        <div style={{
          width: '320px', flexShrink: 0,
          borderLeft: '1px solid rgba(255,255,255,0.06)',
          overflowY: 'auto', backgroundColor: '#06060f',
        }}>
          <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <DailyQuestion />
            <TrendingBanner onCountryClick={handleIsoClick} />
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
