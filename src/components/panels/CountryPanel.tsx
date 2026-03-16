'use client'
// components/panels/CountryPanel.tsx

import { useState, useEffect } from 'react'
import { CountryWithStats } from '@/types'
import { getFingerprint, isOnCooldown, setLocalVoteCooldown } from '@/lib/fingerprint'

interface CountryPanelProps {
  country: CountryWithStats | null
  onClose: () => void
}

export default function CountryPanel({ country, onClose }: CountryPanelProps) {
  const [voted, setVoted] = useState<'positive' | 'negative' | null>(null)
  const [onCooldown, setOnCooldown] = useState(false)
  const [loading, setLoading] = useState(false)
  const [localStats, setLocalStats] = useState<CountryWithStats | null>(null)

  useEffect(() => {
    if (!country) return
    setLocalStats(country)
    setVoted(null)
    setOnCooldown(false)

    // Check cooldown
    if (isOnCooldown(country.id)) {
      setOnCooldown(true)
    }

    // Check server-side cooldown too
    getFingerprint().then(fp => {
      fetch(`/api/votes?country_id=${country.id}&fingerprint=${fp}`)
        .then(r => r.json())
        .then(data => {
          if (data.has_voted) {
            setVoted(data.vote_type)
            setOnCooldown(true)
          }
        })
    })
  }, [country])

  const handleVote = async (voteType: 'positive' | 'negative') => {
    if (!country || onCooldown || loading) return
    setLoading(true)

    try {
      const fp = await getFingerprint()
      const res = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          country_id: country.id,
          vote_type: voteType,
          fingerprint: fp,
        }),
      })

      if (res.ok) {
        setVoted(voteType)
        setOnCooldown(true)
        setLocalVoteCooldown(country.id)

        // Optimistically update stats
        setLocalStats(prev => {
          if (!prev) return prev
          return {
            ...prev,
            likes_24h: voteType === 'positive' ? prev.likes_24h + 1 : prev.likes_24h,
            dislikes_24h: voteType === 'negative' ? prev.dislikes_24h + 1 : prev.dislikes_24h,
            total_votes: prev.total_votes + 1,
          }
        })
      } else {
        const data = await res.json()
        console.error('Vote failed:', data.error)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleShare = () => {
    if (!localStats) return
    const positive = localStats.total_votes > 0
      ? Math.round((localStats.likes_24h / localStats.total_votes) * 100)
      : 0
    const text = `Global sentiment toward ${localStats.flag_emoji} ${localStats.name} today: ${positive}% positive — Cast your vote at WorldSentimentMap.com`
    if (navigator.share) {
      navigator.share({ text, url: window.location.href })
    } else {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`)
    }
  }

  if (!country || !localStats) return null

  const positivePercent = localStats.total_votes > 0
    ? Math.round((localStats.likes_24h / localStats.total_votes) * 100)
    : 0

  const sentimentLabel = localStats.sentiment > 0.2
    ? 'Positive' : localStats.sentiment > 0.05
    ? 'Slightly Positive' : localStats.sentiment < -0.2
    ? 'Negative' : localStats.sentiment < -0.05
    ? 'Slightly Negative' : 'Neutral'

  const sentimentColor = localStats.sentiment > 0.05
    ? 'text-green-400' : localStats.sentiment < -0.05
    ? 'text-red-400' : 'text-white/60'

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="
        fixed z-50
        bottom-0 left-0 right-0
        md:bottom-auto md:top-4 md:right-4 md:left-auto
        md:w-[360px]
        bg-[#0d0d1a] border border-white/10
        rounded-t-2xl md:rounded-2xl
        shadow-2xl shadow-black/60
        overflow-hidden
        animate-in slide-in-from-bottom md:slide-in-from-right duration-300
      ">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{localStats.flag_emoji}</span>
            <div>
              <h2 className="text-white font-bold text-xl leading-tight">{localStats.name}</h2>
              <p className="text-white/40 text-sm">{localStats.region} · {localStats.continent}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Stats */}
        <div className="p-5 space-y-4">
          {/* Sentiment bar */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-white/50">Global Sentiment (24h)</span>
              <span className={`font-bold ${sentimentColor}`}>{sentimentLabel}</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${positivePercent}%`,
                  background: `linear-gradient(to right, ${
                    positivePercent > 50
                      ? '#16a34a, #22c55e'
                      : '#dc2626, #ef4444'
                  })`,
                }}
              />
            </div>
            <div className="flex justify-between text-xs mt-1 text-white/30">
              <span>👎 {localStats.dislikes_24h.toLocaleString()}</span>
              <span>{positivePercent}% positive</span>
              <span>👍 {localStats.likes_24h.toLocaleString()}</span>
            </div>
          </div>

          {/* Numbers grid */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Votes', value: localStats.total_votes.toLocaleString(), color: 'text-white' },
              { label: '👍 Likes', value: localStats.likes_24h.toLocaleString(), color: 'text-green-400' },
              { label: '👎 Dislikes', value: localStats.dislikes_24h.toLocaleString(), color: 'text-red-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white/5 rounded-xl p-3 text-center">
                <p className={`text-xl font-bold ${color}`}>{value}</p>
                <p className="text-white/40 text-xs mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Vote buttons */}
          <div className="space-y-2">
            <p className="text-white/40 text-xs text-center">
              {onCooldown
                ? voted
                  ? `You voted ${voted === 'positive' ? '👍 Positive' : '👎 Negative'} · Cooldown 24h`
                  : 'Already voted today'
                : 'Cast your vote (once per 24h)'}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleVote('positive')}
                disabled={onCooldown || loading}
                className={`
                  py-3 rounded-xl font-bold text-sm transition-all duration-200
                  flex items-center justify-center gap-2
                  ${voted === 'positive'
                    ? 'bg-green-500 text-white ring-2 ring-green-400/50'
                    : onCooldown
                    ? 'bg-white/5 text-white/20 cursor-not-allowed'
                    : 'bg-green-500/20 text-green-400 hover:bg-green-500/40 active:scale-95'}
                `}
              >
                <span className="text-lg">👍</span>
                Positive
              </button>
              <button
                onClick={() => handleVote('negative')}
                disabled={onCooldown || loading}
                className={`
                  py-3 rounded-xl font-bold text-sm transition-all duration-200
                  flex items-center justify-center gap-2
                  ${voted === 'negative'
                    ? 'bg-red-500 text-white ring-2 ring-red-400/50'
                    : onCooldown
                    ? 'bg-white/5 text-white/20 cursor-not-allowed'
                    : 'bg-red-500/20 text-red-400 hover:bg-red-500/40 active:scale-95'}
                `}
              >
                <span className="text-lg">👎</span>
                Negative
              </button>
            </div>
          </div>

          {/* Share */}
          <button
            onClick={handleShare}
            className="w-full py-2.5 rounded-xl bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-all text-sm font-medium flex items-center justify-center gap-2"
          >
            <span>↗</span> Share sentiment card
          </button>
        </div>
      </div>
    </>
  )
}
