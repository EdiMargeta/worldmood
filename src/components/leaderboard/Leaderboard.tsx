'use client'

import { useEffect, useState } from 'react'
import { CountryWithStats } from '@/types'

interface LeaderboardProps {
  onCountryClick?: (isoCode: string) => void
}

export default function Leaderboard({ onCountryClick }: LeaderboardProps) {
  const [countries, setCountries] = useState<CountryWithStats[]>([])
  const [tab, setTab] = useState<'loved' | 'disliked'>('loved')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/rankings?sort=sentiment&order=desc')
      .then(r => r.json())
      .then((data: CountryWithStats[]) => {
        setCountries(data.filter(c => c.total_votes > 0))
        setLoading(false)
      })
  }, [])

  const sorted = {
    loved: [...countries].sort((a, b) => b.sentiment - a.sentiment).slice(0, 10),
    disliked: [...countries].sort((a, b) => a.sentiment - b.sentiment).slice(0, 10),
  }

  const list = sorted[tab]

  return (
    <div style={{ background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {([['loved', '❤️ Most Loved'], ['disliked', '💔 Most Disliked']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              flex: 1, padding: '12px', fontSize: '12px', fontWeight: 500,
              background: tab === key ? 'rgba(255,255,255,0.05)' : 'none',
              color: tab === key ? 'white' : 'rgba(255,255,255,0.3)',
              border: 'none', borderBottom: tab === key ? '2px solid white' : '2px solid transparent',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ padding: '8px' }}>
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} style={{ height: '48px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', marginBottom: '6px' }} />
          ))
        ) : list.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px', padding: '24px' }}>
            Start voting to see the leaderboard!
          </p>
        ) : (
          list.map((c, i) => {
            const pct = c.total_votes > 0 ? Math.round((c.likes_24h / c.total_votes) * 100) : 0
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`
            const color = tab === 'disliked' ? '#f87171' : '#4ade80'

            return (
              <button
                key={c.id}
                onClick={() => onCountryClick?.(c.iso_code)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 12px', borderRadius: '12px', background: 'none',
                  border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <span style={{ fontSize: '13px', width: '20px', textAlign: 'center', flexShrink: 0 }}>{medal}</span>
                <span style={{ fontSize: '20px', flexShrink: 0 }}>{c.flag_emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: 'white', fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</p>
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{c.total_votes.toLocaleString()} votes</p>
                </div>
                <span style={{ color, fontWeight: 700, fontSize: '13px', flexShrink: 0 }}>{pct}%</span>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
