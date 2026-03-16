'use client'
// app/admin/page.tsx

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Stats {
  total_votes_24h: number
  total_votes_all_time: number
  active_countries: number
  simulated_votes_24h: number
  top_country: any
  most_controversial: any
  simulation_settings: {
    enabled: boolean
    cooldown_hours: number
    votes_per_interval: number
    like_probability: number
    interval_seconds: number
  }
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [simLoading, setSimLoading] = useState(false)
  const [lastResult, setLastResult] = useState<string | null>(null)

  const [settings, setSettings] = useState({
    enabled: false,
    cooldown_hours: 24,
    votes_per_interval: 10,
    like_probability: 0.65,
    interval_seconds: 30,
  })

  const fetchStats = async () => {
    const res = await fetch('/api/admin/stats')
    const data = await res.json()
    setStats(data)
    if (data.simulation_settings) setSettings(data.simulation_settings)
    setLoading(false)
  }

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 10000)
    return () => clearInterval(interval)
  }, [])

  const saveSettings = async () => {
    setSimLoading(true)
    await fetch('/api/admin/simulation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    setSimLoading(false)
    setLastResult('Settings saved.')
  }

  const runNow = async () => {
    setSimLoading(true)
    const res = await fetch('/api/admin/simulation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'run_now' }),
    })
    const data = await res.json()
    setSimLoading(false)
    setLastResult(`Ran: ${data.votes_inserted} votes inserted on ${data.countries_affected?.join(', ')}`)
    fetchStats()
  }

  const StatCard = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
    <div className="bg-white/5 rounded-xl p-4">
      <p className="text-white/40 text-xs mb-1">{label}</p>
      <p className="text-white text-2xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      {sub && <p className="text-white/30 text-xs mt-1">{sub}</p>}
    </div>
  )

  return (
    <div className="min-h-screen bg-[#06060f] text-white">
      <header className="fixed top-0 left-0 right-0 z-30 bg-[#06060f]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl">🌍</span>
            <span className="font-bold text-white">WorldMood</span>
          </Link>
          <span className="text-orange-400 text-sm font-medium">⚙️ Admin</span>
        </div>
      </header>

      <main className="pt-14 max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8">Admin Dashboard</h1>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard label="Votes (24h)" value={stats?.total_votes_24h || 0} />
              <StatCard label="All-time Votes" value={stats?.total_votes_all_time || 0} />
              <StatCard label="Active Countries" value={stats?.active_countries || 0} sub="with votes" />
              <StatCard
                label="Simulated (24h)"
                value={stats?.simulated_votes_24h || 0}
                sub={`${stats && stats.total_votes_24h > 0 ? Math.round((stats.simulated_votes_24h / stats.total_votes_24h) * 100) : 0}% of total`}
              />
            </div>

            {/* Top countries */}
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              {stats?.top_country && (
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-white/40 text-xs mb-2">Most Voted Country</p>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{stats.top_country.flag_emoji}</span>
                    <div>
                      <p className="text-white font-bold">{stats.top_country.name}</p>
                      <p className="text-white/40 text-sm">{stats.top_country.total_votes.toLocaleString()} votes</p>
                    </div>
                  </div>
                </div>
              )}
              {stats?.most_controversial && (
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-white/40 text-xs mb-2">Most Controversial</p>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{stats.most_controversial.flag_emoji}</span>
                    <div>
                      <p className="text-white font-bold">{stats.most_controversial.name}</p>
                      <p className="text-yellow-400/70 text-sm">
                        {stats.most_controversial.total_votes > 0
                          ? `${Math.round((stats.most_controversial.likes_24h / stats.most_controversial.total_votes) * 100)}% positive`
                          : 'No data'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Simulation settings */}
            <div className="bg-[#0d0d1a] border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Simulation Settings</h2>
                <label className="flex items-center gap-3 cursor-pointer">
                  <span className="text-white/50 text-sm">
                    {settings.enabled ? '🟢 Enabled' : '⚪ Disabled'}
                  </span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={settings.enabled}
                      onChange={e => setSettings(s => ({ ...s, enabled: e.target.checked }))}
                    />
                    <div className={`w-10 h-6 rounded-full transition-colors ${settings.enabled ? 'bg-green-600' : 'bg-white/10'}`} />
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${settings.enabled ? 'left-5' : 'left-1'}`} />
                  </div>
                </label>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {[
                  { key: 'cooldown_hours', label: 'Cooldown Hours', min: 1, max: 72, step: 1, suffix: 'h' },
                  { key: 'votes_per_interval', label: 'Votes Per Interval', min: 1, max: 100, step: 1, suffix: '' },
                  { key: 'like_probability', label: 'Like Probability', min: 0.1, max: 0.9, step: 0.05, suffix: '' },
                  { key: 'interval_seconds', label: 'Interval (seconds)', min: 10, max: 300, step: 10, suffix: 's' },
                ].map(({ key, label, min, max, step, suffix }) => (
                  <div key={key}>
                    <div className="flex justify-between mb-2">
                      <label className="text-white/60 text-sm">{label}</label>
                      <span className="text-white font-mono text-sm">
                        {settings[key as keyof typeof settings]}{suffix}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={min} max={max} step={step}
                      value={settings[key as keyof typeof settings] as number}
                      onChange={e => setSettings(s => ({ ...s, [key]: parseFloat(e.target.value) }))}
                      className="w-full accent-violet-500"
                    />
                    <div className="flex justify-between text-xs text-white/20 mt-1">
                      <span>{min}{suffix}</span>
                      <span>{max}{suffix}</span>
                    </div>
                  </div>
                ))}
              </div>

              {lastResult && (
                <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm">
                  {lastResult}
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={saveSettings}
                  disabled={simLoading}
                  className="flex-1 py-2.5 bg-violet-600/30 text-violet-300 hover:bg-violet-600/50 rounded-xl font-medium text-sm transition-colors disabled:opacity-50"
                >
                  {simLoading ? 'Saving…' : 'Save Settings'}
                </button>
                <button
                  onClick={runNow}
                  disabled={simLoading}
                  className="flex-1 py-2.5 bg-orange-600/30 text-orange-300 hover:bg-orange-600/50 rounded-xl font-medium text-sm transition-colors disabled:opacity-50"
                >
                  {simLoading ? 'Running…' : '▶ Run Now'}
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
