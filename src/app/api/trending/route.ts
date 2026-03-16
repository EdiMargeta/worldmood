/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { calculateSentiment, getTrendDirection } from '@/lib/trending'

export const revalidate = 60

export async function GET() {
  const supabase = createServerClient()
  const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const cutoff2h = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

  const [{ data: votes24h }, { data: votes2h }] = await Promise.all([
    supabase.from('votes').select('country_id, vote_type').gte('created_at', cutoff24h),
    supabase.from('votes').select('country_id, vote_type').gte('created_at', cutoff2h),
  ])

  type Stats = { likes: number; dislikes: number }
  const map24 = new Map<string, Stats>()
  const map2 = new Map<string, Stats>()

  for (const v of (votes24h || []) as any[]) {
    const s = map24.get(v.country_id) || { likes: 0, dislikes: 0 }
    if (v.vote_type === 'positive') s.likes++; else s.dislikes++
    map24.set(v.country_id, s)
  }
  for (const v of (votes2h || []) as any[]) {
    const s = map2.get(v.country_id) || { likes: 0, dislikes: 0 }
    if (v.vote_type === 'positive') s.likes++; else s.dislikes++
    map2.set(v.country_id, s)
  }

  const topCountryIds = Array.from(map24.entries())
    .sort((a, b) => (b[1].likes + b[1].dislikes) - (a[1].likes + a[1].dislikes))
    .slice(0, 20)
    .map(([id]) => id)

  if (topCountryIds.length === 0) {
    return NextResponse.json({ trending: [], rising: [], falling: [] })
  }

  const { data: countries } = await supabase
    .from('countries')
    .select('id, name, iso_code, flag_emoji, continent, region')
    .in('id', topCountryIds)

  const countryMap = new Map((countries || []).map((c: any) => [c.id, c]))

  const trending = topCountryIds
    .map((id) => {
      const country = countryMap.get(id) as any
      if (!country) return null

      const stats24 = map24.get(id) || { likes: 0, dislikes: 0 }
      const stats2 = map2.get(id) || { likes: 0, dislikes: 0 }

      const sentiment24 = calculateSentiment(stats24.likes, stats24.dislikes)
      const sentimentRecent = calculateSentiment(stats2.likes, stats2.dislikes)
      const delta = sentimentRecent - sentiment24
      const totalVotes = stats24.likes + stats24.dislikes
      const recentVotes = stats2.likes + stats2.dislikes
      const olderVotes = totalVotes - recentVotes
      const score = recentVotes * 1.0 + olderVotes * 0.3 + Math.abs(delta) * 100

      return {
        ...country,
        likes_24h: stats24.likes,
        dislikes_24h: stats24.dislikes,
        total_votes: totalVotes,
        sentiment: sentiment24,
        sentiment_delta: delta,
        trend: getTrendDirection(delta),
        trending_score: score,
      }
    })
    .filter(Boolean)
    .sort((a: any, b: any) => b.trending_score - a.trending_score)
    .slice(0, 10)

  const rising = [...trending]
    .sort((a: any, b: any) => b.sentiment_delta - a.sentiment_delta)
    .slice(0, 5)

  const falling = [...trending]
    .sort((a: any, b: any) => a.sentiment_delta - b.sentiment_delta)
    .slice(0, 5)

  return NextResponse.json({ trending, rising, falling }, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
  })
}
