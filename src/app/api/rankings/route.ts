// app/api/rankings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { calculateSentiment } from '@/lib/trending'

export const revalidate = 60

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const continent = searchParams.get('continent') || 'All'
  const sortBy = searchParams.get('sort') || 'sentiment'
  const order = (searchParams.get('order') || 'desc') as 'asc' | 'desc'
  const search = searchParams.get('search') || ''

  const supabase = createServerClient()
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  let query = supabase.from('countries').select('*')
  if (continent !== 'All') query = query.eq('continent', continent)
  if (search) query = query.ilike('name', `%${search}%`)

  const { data: countries, error } = await query.order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const countryIds = countries!.map(c => c.id)
  if (countryIds.length === 0) return NextResponse.json([])

  const { data: votes } = await supabase
    .from('votes')
    .select('country_id, vote_type')
    .in('country_id', countryIds)
    .gte('created_at', cutoff)

  const statsMap = new Map<string, { likes: number; dislikes: number }>()
  for (const v of votes || []) {
    const s = statsMap.get(v.country_id) || { likes: 0, dislikes: 0 }
    if (v.vote_type === 'positive') s.likes++; else s.dislikes++
    statsMap.set(v.country_id, s)
  }

  let result = countries!.map(c => {
    const s = statsMap.get(c.id) || { likes: 0, dislikes: 0 }
    return {
      ...c,
      likes_24h: s.likes,
      dislikes_24h: s.dislikes,
      total_votes: s.likes + s.dislikes,
      sentiment: calculateSentiment(s.likes, s.dislikes),
    }
  })

  // Sort
  result.sort((a, b) => {
    let diff = 0
    switch (sortBy) {
      case 'sentiment': diff = a.sentiment - b.sentiment; break
      case 'votes': diff = a.total_votes - b.total_votes; break
      case 'likes': diff = a.likes_24h - b.likes_24h; break
      case 'dislikes': diff = a.dislikes_24h - b.dislikes_24h; break
      default: diff = a.sentiment - b.sentiment
    }
    return order === 'desc' ? -diff : diff
  })

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
  })
}
