'use client'

import { useState, useEffect } from 'react'
import { CountryWithStats } from '@/types'
import { getFingerprint, setLocalVoteCooldown } from '@/lib/fingerprint'

interface CountryPanelProps {
  country: CountryWithStats | null
  onClose: () => void
}

function CooldownTimer({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState('')

  useEffect(() => {
    const update = () => {
      const ms = new Date(expiresAt).getTime() - Date.now()
      if (ms <= 0) { setRemaining(''); return }
      const h = Math.floor(ms / 3600000)
      const m = Math.floor((ms % 3600000) / 60000)
      const s = Math.floor((ms % 60000) / 1000)
      setRemaining(`${h}h ${m}m ${s}s`)
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  if (!remaining) return null

  return (
    <div style={{
      background: 'rgba(251,191,36,0.1)',
      border: '1px solid rgba(251,191,36,0.25)',
      borderRadius: '12px',
      padding: '10px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '8px',
    }}>
      <span style={{ fontSize: '16px' }}>⏳</span>
      <div>
        <p style={{ color: 'rgba(251,191,36,0.9)', fontSize: '12px', fontWeight: 600 }}>
          Cooldown active
        </p>
        <p style={{ color: 'rgba(251,191,36,0.6)', fontSize: '11px' }}>
          Next vote available in {remaining}
        </p>
      </div>
    </div>
  )
}

export default function CountryPanel({ country, onClose }: CountryPanelProps) {
  const [voted, setVoted] = useState<'positive' | 'negative' | null>(null)
  const [onCooldown, setOnCooldown] = useState(false)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [checkingCooldown, setCheckingCooldown] = useState(false)
  const [localStats, setLocalStats] = useState<CountryWithStats | null>(null)

  useEffect(() => {
    if (!country) return
    setLocalStats(country)
    setVoted(null)
    setOnCooldown(false)
    setExpiresAt(null)
    setCheckingCooldown(true)

    getFingerprint().then(fp => {
      fetch(`/api/votes?country_id=${country.id}&fingerprint=${fp}`)
        .then(r => r.json())
        .then(data => {
          if (data.has_voted) {
            setVoted(data.vote_type)
            setOnCooldown(true)
            setExpiresAt(data.expires_at)
          }
          setCheckingCooldown(false)
        })
        .catch(() => setCheckingCooldown(false))
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
        body: JSON.stringify({ country_id: country.id, vote_type: voteType, fingerprint: fp }),
      })

      const data = await res.json()

      if (res.ok) {
        setVoted(voteType)
        setOnCooldown(true)
        setLocalVoteCooldown(country.id)
        // Set expires_at based on cooldown hours returned
        const cooldownHours = data.cooldown_hours || 24
        setExpiresAt(new Date(Date.now() + cooldownHours * 3600000).toISOString())
        setLocalStats(prev => {
          if (!prev) return prev
          return {
            ...prev,
            likes_24h: voteType === 'positive' ? prev.likes_24h + 1 : prev.likes_24h,
            dislikes_24h: voteType === 'negative' ? prev.dislikes_24h + 1 : prev.dislikes_24h,
            total_votes: prev.total_votes + 1,
          }
        })
      } else if (res.status === 409) {
        // Already voted — show cooldown
        setVoted(data.vote_type || null)
        setOnCooldown(true)
        setExpiresAt(data.expires_at)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleShare = () => {
    if (!localStats) return
    const positive = localStats.total_votes > 0
      ? Math.round((localStats.likes_24h / localStats.total_votes) * 100) : 0
    const text = `Global sentiment toward ${localStats.flag_emoji} ${localStats.name} today: ${positive}% positive — Cast your vote at WorldMood`
    if (navigator.share) {
      navigator.share({ text, url: window.location.href })
    } else {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`)
    }
  }

  if (!country || !localStats) return null

  const positivePercent = localStats.total_votes > 0
    ? Math.round((localStats.likes_24h / localStats.total_votes) * 100) : 0

  const sentimentLabel = localStats.sentiment > 0.2 ? 'Positive'
    : localStats.sentiment > 0.05 ? 'Slightly Positive'
    : localStats.sentiment < -0.2 ? 'Negative'
    : localStats.sentiment < -0.05 ? 'Slightly Negative'
    : 'Neutral'

  const sentimentColor = localStats.sentiment > 0.05 ? '#4ade80'
    : localStats.sentiment < -0.05 ? '#f87171'
    : 'rgba(255,255,255,0.5)'

  const panel: React.CSSProperties = {
    position: 'fixed',
    zIndex: 50,
    right: '16px',
    top: '72px',
    width: '360px',
    backgroundColor: '#0d0d1a',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '16px',
    boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
    overflow: 'hidden',
  }

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 40 }}
        onClick={onClose}
      />
      <div style={panel}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '40px' }}>{localStats.flag_emoji}</span>
            <div>
              <h2 style={{ color: 'white', fontWeight: 700, fontSize: '20px', lineHeight: 1.2 }}>{localStats.name}</h2>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>{localStats.region} · {localStats.continent}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Sentiment bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>Global Sentiment (24h)</span>
              <span style={{ fontWeight: 700, color: sentimentColor }}>{sentimentLabel}</span>
            </div>
            <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: '4px',
                width: `${positivePercent}%`,
                background: positivePercent >= 50 ? 'linear-gradient(to right, #16a34a, #22c55e)' : 'linear-gradient(to right, #dc2626, #ef4444)',
                transition: 'width 0.7s ease',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
              <span>👎 {localStats.dislikes_24h.toLocaleString()}</span>
              <span>{positivePercent}% positive</span>
              <span>👍 {localStats.likes_24h.toLocaleString()}</span>
            </div>
          </div>

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            {[
              { label: 'Total Votes', value: localStats.total_votes.toLocaleString(), color: 'white' },
              { label: '👍 Likes', value: localStats.likes_24h.toLocaleString(), color: '#4ade80' },
              { label: '👎 Dislikes', value: localStats.dislikes_24h.toLocaleString(), color: '#f87171' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                <p style={{ fontSize: '18px', fontWeight: 700, color }}>{value}</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Cooldown timer */}
          {onCooldown && expiresAt && <CooldownTimer expiresAt={expiresAt} />}

          {/* Vote buttons */}
          <div>
            {!onCooldown && (
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', textAlign: 'center', marginBottom: '8px' }}>
                {checkingCooldown ? 'Checking…' : 'Cast your vote · once per cooldown period'}
              </p>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {(['positive', 'negative'] as const).map(type => {
                const isThis = voted === type
                const isPos = type === 'positive'
                const activeColor = isPos ? '#22c55e' : '#ef4444'
                const activeBg = isPos ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'
                const hoverBg = isPos ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)'

                return (
                  <button
                    key={type}
                    onClick={() => handleVote(type)}
                    disabled={onCooldown || loading || checkingCooldown}
                    style={{
                      padding: '12px',
                      borderRadius: '12px',
                      border: isThis ? `2px solid ${activeColor}` : '2px solid transparent',
                      background: isThis ? activeBg : onCooldown ? 'rgba(255,255,255,0.04)' : activeBg,
                      color: isThis ? activeColor : onCooldown ? 'rgba(255,255,255,0.2)' : activeColor,
                      cursor: onCooldown || loading ? 'not-allowed' : 'pointer',
                      fontWeight: 700,
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.15s',
                      opacity: onCooldown && !isThis ? 0.4 : 1,
                    }}
                    onMouseEnter={e => {
                      if (!onCooldown && !loading) (e.currentTarget as HTMLButtonElement).style.background = hoverBg
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = isThis ? activeBg : onCooldown ? 'rgba(255,255,255,0.04)' : activeBg
                    }}
                  >
                    <span style={{ fontSize: '18px' }}>{isPos ? '👍' : '👎'}</span>
                    {isPos ? 'Positive' : 'Negative'}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Share */}
          <button
            onClick={handleShare}
            style={{
              width: '100%', padding: '10px', borderRadius: '12px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '13px',
              fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            }}
          >
            ↗ Share sentiment card
          </button>
        </div>
      </div>
    </>
  )
}
