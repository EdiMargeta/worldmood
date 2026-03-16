'use client'
// components/leaderboard/Leaderboard.tsx

import { useEffect, useState } from 'react'
import { CountryWithStats } from '@/types'

interface LeaderboardProps {
  onCountryClick?: (isoCode: string) => void
}

export default function Leaderboard({ onCountryClick }: LeaderboardProps) {
  const [countries, setCountries] = useState<CountryWithStats[]>([])
  const [tab, setTab] = useState<'loved' | 'disliked' | 'controversial'>('loved')
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
    controversial: [...countries]
      .filter(c => c.total_votes >= 5)
      .sort((a, b) => Math.abs(a.sentiment) - Math.abs(b.sentiment))
      .slice(0, 10),
  }

  const tabs = [
    { key: 'loved', label: '❤️ Most Loved', emoji: '❤️' },
    { key: 'disliked', label: '💔 Most Disliked', emoji: '💔' },
    { key: 'controversial', label: '⚡ Controversial', emoji: '⚡' },
  ]

  const list = sorted[tab]

  return (
    <div className="bg-[#0d0d1a] border border-white/10 rounded-2xl overflow-hidden">
      <div className="flex border-b border-white/10">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className={`flex-1 py-3 text-xs font-medium transition-colors ${
              tab === t.key ? 'text-white border-b-2 border-white bg-white/5' : 'text-white/30 hover:text-white/60'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-2">
        {loading ? (
          <div className="space-y-2 p-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <p className="text-center text-white/30 text-sm p-6">
            Start voting to see the leaderboard!
          </p>
        ) : (
          list.map((c, i) => {
            const positivePercent = c.total_votes > 0
              ? Math.round((c.likes_24h / c.total_votes) * 100) : 0
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`

            return (
              <button
                key={c.id}
                onClick={() => onCountryClick?.(c.iso_code)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-left"
              >
                <span className="text-sm w-6 flex-shrink-0 text-center">{medal}</span>
                <span className="text-xl flex-shrink-0">{c.flag_emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{c.name}</p>
                  <p className="text-white/30 text-xs">{c.total_votes.toLocaleString()} votes</p>
                </div>
                <div className={`text-sm font-bold flex-shrink-0 ${
                  tab === 'disliked' ? 'text-red-400'
                    : tab === 'controversial' ? 'text-yellow-400'
                    : 'text-green-400'
                }`}>
                  {tab === 'controversial'
                    ? `${100 - Math.abs(positivePercent - 50)}% split`
                    : `${positivePercent}%`}
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
