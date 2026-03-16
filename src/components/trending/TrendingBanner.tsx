'use client'
// components/trending/TrendingBanner.tsx

import { useEffect, useState } from 'react'
import { TrendingCountry } from '@/types'

interface TrendingData {
  trending: TrendingCountry[]
  rising: TrendingCountry[]
  falling: TrendingCountry[]
}

interface TrendingBannerProps {
  onCountryClick?: (isoCode: string) => void
}

export default function TrendingBanner({ onCountryClick }: TrendingBannerProps) {
  const [data, setData] = useState<TrendingData | null>(null)
  const [tab, setTab] = useState<'trending' | 'rising' | 'falling'>('trending')

  useEffect(() => {
    fetch('/api/trending')
      .then(r => r.json())
      .then(setData)
  }, [])

  const countries = data?.[tab] || []

  const tabs = [
    { key: 'trending', label: '🔥 Trending', color: 'text-orange-400' },
    { key: 'rising', label: '📈 Rising', color: 'text-green-400' },
    { key: 'falling', label: '📉 Falling', color: 'text-red-400' },
  ]

  return (
    <div className="bg-[#0d0d1a] border border-white/10 rounded-2xl overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-white/10">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className={`flex-1 py-3 text-xs font-medium transition-colors ${
              tab === t.key
                ? `${t.color} border-b-2 border-current bg-white/5`
                : 'text-white/30 hover:text-white/60'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Country list */}
      <div className="p-2">
        {!data ? (
          <div className="space-y-2 p-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : countries.length === 0 ? (
          <div className="p-4 text-center text-white/30 text-sm">
            No data yet — vote to see trending!
          </div>
        ) : (
          countries.slice(0, 5).map((c, i) => {
            const positivePercent = c.total_votes > 0
              ? Math.round((c.likes_24h / c.total_votes) * 100)
              : 0

            return (
              <button
                key={c.id}
                onClick={() => onCountryClick?.(c.iso_code)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-left"
              >
                <span className="text-white/30 text-sm w-4 flex-shrink-0">{i + 1}</span>
                <span className="text-xl flex-shrink-0">{c.flag_emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{c.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <div className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-green-500/70"
                        style={{ width: `${positivePercent}%` }}
                      />
                    </div>
                    <span className="text-white/30 text-xs flex-shrink-0">
                      {positivePercent}%
                    </span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-white/60 text-xs">{c.total_votes.toLocaleString()}</p>
                  <p className="text-white/25 text-[10px]">votes</p>
                </div>
                {tab !== 'trending' && (
                  <span className={`text-xs font-bold flex-shrink-0 ${
                    c.sentiment_delta > 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {c.sentiment_delta > 0 ? '▲' : '▼'}
                    {Math.abs(Math.round(c.sentiment_delta * 100))}%
                  </span>
                )}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
