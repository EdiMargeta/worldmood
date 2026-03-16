'use client'
// app/rankings/page.tsx

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { CountryWithStats, Continent, SortField, SortOrder } from '@/types'

const CONTINENTS: Continent[] = ['All', 'Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania']

export default function RankingsPage() {
  const [countries, setCountries] = useState<CountryWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [continent, setContinent] = useState<Continent>('All')
  const [sortBy, setSortBy] = useState<SortField>('votes')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [selectedIso, setSelectedIso] = useState<string | null>(null)

  const fetchRankings = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      continent, sort: sortBy, order: sortOrder, search,
    })
    const res = await fetch(`/api/rankings?${params}`)
    const data = await res.json()
    setCountries(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [continent, sortBy, sortOrder, search])

  useEffect(() => {
    const timeout = setTimeout(fetchRankings, 300)
    return () => clearTimeout(timeout)
  }, [fetchRankings])

  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(o => o === 'desc' ? 'asc' : 'desc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => toggleSort(field)}
      className={`flex items-center gap-1 transition-colors ${
        sortBy === field ? 'text-white' : 'text-white/40 hover:text-white/70'
      }`}
    >
      {label}
      {sortBy === field && (
        <span className="text-[10px]">{sortOrder === 'desc' ? '▼' : '▲'}</span>
      )}
    </button>
  )

  return (
    <div className="min-h-screen bg-[#06060f] text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-30 bg-[#06060f]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl">🌍</span>
            <span className="font-bold text-white">WorldMood</span>
          </Link>
          <span className="text-white/50 text-sm font-medium">Global Rankings</span>
        </div>
      </header>

      <main className="pt-14 max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">Global Rankings</h1>
          <p className="text-white/40">Live sentiment rankings across {countries.length} countries</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            placeholder="Search countries..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-white/30 placeholder:text-white/20"
          />
          <div className="flex gap-2 overflow-x-auto pb-1">
            {CONTINENTS.map(c => (
              <button
                key={c}
                onClick={() => setContinent(c)}
                className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                  continent === c
                    ? 'bg-white/15 text-white'
                    : 'bg-white/5 text-white/40 hover:text-white/70'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-[#0d0d1a] border border-white/10 rounded-2xl overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[2.5rem_1fr_6rem_6rem_7rem_8rem] gap-4 px-4 py-3 border-b border-white/10 text-xs">
            <span className="text-white/30">#</span>
            <SortHeader field="sentiment" label="Country" />
            <SortHeader field="likes" label="👍 Likes" />
            <SortHeader field="dislikes" label="👎 Dislikes" />
            <SortHeader field="votes" label="Total" />
            <SortHeader field="sentiment" label="Sentiment" />
          </div>

          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : countries.length === 0 ? (
            <div className="p-10 text-center text-white/30">No countries found</div>
          ) : (
            <div className="divide-y divide-white/5">
              {countries.map((c, i) => {
                const pct = c.total_votes > 0 ? Math.round((c.likes_24h / c.total_votes) * 100) : 0
                const isSelected = selectedIso === c.iso_code

                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedIso(isSelected ? null : c.iso_code)}
                    className={`w-full grid grid-cols-[2.5rem_1fr_6rem_6rem_7rem_8rem] gap-4 px-4 py-3.5 text-sm transition-colors text-left ${
                      isSelected ? 'bg-white/8' : 'hover:bg-white/4'
                    }`}
                  >
                    <span className="text-white/30 self-center">{i + 1}</span>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xl flex-shrink-0">{c.flag_emoji}</span>
                      <div className="min-w-0">
                        <p className="text-white font-medium truncate">{c.name}</p>
                        <p className="text-white/30 text-xs truncate">{c.continent}</p>
                      </div>
                    </div>
                    <span className="text-green-400 self-center">
                      {c.likes_24h.toLocaleString()}
                    </span>
                    <span className="text-red-400 self-center">
                      {c.dislikes_24h.toLocaleString()}
                    </span>
                    <span className="text-white/60 self-center">
                      {c.total_votes.toLocaleString()}
                    </span>
                    <div className="self-center">
                      {c.total_votes > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${pct >= 50 ? 'bg-green-500' : 'bg-red-500'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className={`text-xs font-medium ${pct >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                            {pct}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-white/20 text-xs">No data</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <p className="text-center text-white/20 text-xs mt-6">
          Updated every 60 seconds · Votes from last 24 hours
        </p>
      </main>
    </div>
  )
}
