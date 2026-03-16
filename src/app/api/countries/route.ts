// app/api/countries/route.ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { calculateSentiment } from '@/lib/trending'

export const revalidate = 30 // Cache for 30 seconds

export async function GET() {
  const supabase = createServerClient()

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  // Get all countries
  const { data: countries, error: countriesError } = await supabase
    .from('countries')
    .select('*')
    .order('name')

  if (countriesError) {
    return NextResponse.json({ error: countriesError.message }, { status: 500 })
  }

  // Get vote counts per country in last 24h
  const { data: voteCounts, error: voteError } = await supabase
    .from('votes')
    .select('country_id, vote_type')
    .gte('created_at', cutoff)
    .eq('is_simulated', false) // Use only real votes for public display, simulated adds to it

  // Actually include simulated — they're meant to seed the experience
  const { data: voteCountsAll } = await supabase
    .from('votes')
    .select('country_id, vote_type')
    .gte('created_at', cutoff)

  if (voteError) {
    return NextResponse.json({ error: voteError.message }, { status: 500 })
  }

  // Aggregate
  const statsMap = new Map<string, { likes: number; dislikes: number }>()

  for (const vote of voteCountsAll || []) {
    const s = statsMap.get(vote.country_id) || { likes: 0, dislikes: 0 }
    if (vote.vote_type === 'positive') s.likes++
    else s.dislikes++
    statsMap.set(vote.country_id, s)
  }

  const result = countries!.map((country) => {
    const stats = statsMap.get(country.id) || { likes: 0, dislikes: 0 }
    return {
      ...country,
      likes_24h: stats.likes,
      dislikes_24h: stats.dislikes,
      total_votes: stats.likes + stats.dislikes,
      sentiment: calculateSentiment(stats.likes, stats.dislikes),
    }
  })

  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
    },
  })
}
