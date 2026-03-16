/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { calculateSentiment } from '@/lib/trending'

export async function GET() {
  const supabase = createServerClient()
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: total24h },
    { count: totalAll },
    { count: simulated24h },
    { data: topVotes },
    { data: settings },
  ] = await Promise.all([
    supabase.from('votes').select('*', { count: 'exact', head: true }).gte('created_at', cutoff),
    supabase.from('votes').select('*', { count: 'exact', head: true }),
    supabase.from('votes').select('*', { count: 'exact', head: true }).gte('created_at', cutoff).eq('is_simulated', true),
    supabase.from('votes').select('country_id, vote_type').gte('created_at', cutoff),
    supabase.from('simulation_settings').select('*').single(),
  ])

  const statsMap = new Map<string, { likes: number; dislikes: number }>()
  for (const v of (topVotes || []) as any[]) {
    const s = statsMap.get(v.country_id) || { likes: 0, dislikes: 0 }
    if (v.vote_type === 'positive') s.likes++; else s.dislikes++
    statsMap.set(v.country_id, s)
  }

  const entries = Array.from(statsMap.entries())

  const topCountryId = entries
    .sort((a, b) => (b[1].likes + b[1].dislikes) - (a[1].likes + a[1].dislikes))[0]?.[0]

  let topCountry = null
  if (topCountryId) {
    const { data: c } = await supabase.from('countries').select('*').eq('id', topCountryId).single()
    if (c) {
      const s = statsMap.get(topCountryId)!
      topCountry = { ...c, likes_24h: s.likes, dislikes_24h: s.dislikes, total_votes: s.likes + s.dislikes, sentiment: calculateSentiment(s.likes, s.dislikes) }
    }
  }

  const mostControversialId = Array.from(statsMap.entries())
    .filter(([, s]) => s.likes + s.dislikes > 5)
    .sort((a, b) => {
      const scoreA = 1 - Math.abs(calculateSentiment(a[1].likes, a[1].dislikes))
      const scoreB = 1 - Math.abs(calculateSentiment(b[1].likes, b[1].dislikes))
      return scoreB - scoreA
    })[0]?.[0]

  let mostControversial = null
  if (mostControversialId && mostControversialId !== topCountryId) {
    const { data: c } = await supabase.from('countries').select('*').eq('id', mostControversialId).single()
    if (c) {
      const s = statsMap.get(mostControversialId)!
      mostControversial = { ...c, likes_24h: s.likes, dislikes_24h: s.dislikes, total_votes: s.likes + s.dislikes, sentiment: calculateSentiment(s.likes, s.dislikes) }
    }
  }

  return NextResponse.json({
    total_votes_24h: total24h || 0,
    total_votes_all_time: totalAll || 0,
    active_countries: statsMap.size,
    simulated_votes_24h: simulated24h || 0,
    top_country: topCountry,
    most_controversial: mostControversial,
    simulation_settings: settings,
  })
}
