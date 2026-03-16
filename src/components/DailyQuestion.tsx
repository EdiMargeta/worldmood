'use client'
// components/DailyQuestion.tsx

import { useEffect, useState } from 'react'
import { getFingerprint } from '@/lib/fingerprint'

interface Country {
  id: string
  name: string
  iso_code: string
  flag_emoji: string
}

interface QuestionResult {
  country: Country
  votes: number
  percentage: number
}

interface QuestionData {
  id: string
  question: string
  date: string
  results: QuestionResult[]
  total_votes: number
  user_voted: boolean
  user_vote_country: string | null
}

export default function DailyQuestion() {
  const [data, setData] = useState<QuestionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [allCountries, setAllCountries] = useState<Country[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const fetchQuestion = async () => {
    const fp = await getFingerprint()
    const res = await fetch(`/api/daily-question?fp=${fp}`)
    const d = await res.json()
    setData(d)
    setLoading(false)
  }

  useEffect(() => {
    fetchQuestion()
    fetch('/api/countries')
      .then(r => r.json())
      .then((cs: any[]) => setAllCountries(cs.map(c => ({
        id: c.id, name: c.name, iso_code: c.iso_code, flag_emoji: c.flag_emoji,
      }))))
  }, [])

  const handleVote = async (country: Country) => {
    if (!data || submitting) return
    setSubmitting(true)
    const fp = await getFingerprint()

    await fetch('/api/daily-question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question_id: data.id,
        country_id: country.id,
        fingerprint: fp,
      }),
    })

    setShowPicker(false)
    await fetchQuestion()
    setSubmitting(false)
  }

  const filteredCountries = allCountries.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return <div className="bg-[#0d0d1a] border border-white/10 rounded-2xl p-5 animate-pulse h-40" />
  }
  if (!data) return null

  return (
    <div className="bg-gradient-to-br from-violet-900/20 to-blue-900/20 border border-violet-500/20 rounded-2xl overflow-hidden">
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full font-medium">
            Daily Question
          </span>
          <span className="text-xs text-white/30">{data.date}</span>
        </div>

        <h3 className="text-white font-semibold text-lg leading-tight mb-4">
          {data.question}
        </h3>

        {/* Results */}
        {data.results.slice(0, 5).map((result, i) => (
          <div key={result.country.id} className="mb-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm">{result.country.flag_emoji}</span>
              <span className="text-white/70 text-sm flex-1">{result.country.name}</span>
              <span className="text-white/50 text-xs">{result.percentage}%</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-violet-500/70 transition-all duration-700"
                style={{ width: `${result.percentage}%` }}
              />
            </div>
          </div>
        ))}

        {data.total_votes > 0 && (
          <p className="text-white/25 text-xs mt-3">{data.total_votes.toLocaleString()} votes total</p>
        )}

        {/* Vote / voted state */}
        {data.user_voted ? (
          <p className="mt-4 text-center text-white/40 text-sm">
            You voted for {data.user_vote_country} · Come back tomorrow!
          </p>
        ) : (
          <button
            onClick={() => setShowPicker(true)}
            className="mt-4 w-full py-2.5 rounded-xl bg-violet-600/30 text-violet-300 hover:bg-violet-600/50 transition-colors text-sm font-medium"
          >
            Cast your vote
          </button>
        )}
      </div>

      {/* Country picker modal */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowPicker(false)} />
          <div className="relative z-10 bg-[#0d0d1a] border border-white/10 rounded-t-2xl md:rounded-2xl w-full md:max-w-sm max-h-[70vh] flex flex-col">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h4 className="text-white font-medium">Choose a country</h4>
              <button onClick={() => setShowPicker(false)} className="text-white/40">✕</button>
            </div>
            <div className="p-3 border-b border-white/10">
              <input
                type="text"
                placeholder="Search countries..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-violet-500/50"
                autoFocus
              />
            </div>
            <div className="overflow-y-auto flex-1">
              {filteredCountries.slice(0, 50).map(c => (
                <button
                  key={c.id}
                  onClick={() => handleVote(c)}
                  disabled={submitting}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                >
                  <span className="text-xl">{c.flag_emoji}</span>
                  <span className="text-white text-sm">{c.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
