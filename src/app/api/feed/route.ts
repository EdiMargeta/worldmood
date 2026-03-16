// app/api/feed/route.ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const revalidate = 0 // No cache for live feed

const FEED_MESSAGES = {
  positive: [
    (flag: string, name: string) => `${flag} Someone just 👍 voted on ${name}`,
    (flag: string, name: string) => `Positive vibes for ${flag} ${name}`,
    (flag: string, name: string) => `${flag} ${name} gets a thumbs up`,
  ],
  negative: [
    (flag: string, name: string) => `${flag} Someone just 👎 voted on ${name}`,
    (flag: string, name: string) => `${flag} ${name} receives negative sentiment`,
    (flag: string, name: string) => `Not a great day for ${flag} ${name}`,
  ],
}

export async function GET() {
  const supabase = createServerClient()

  const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

  const { data: recentVotes, error } = await supabase
    .from('votes')
    .select(`
      id,
      vote_type,
      created_at,
      countries (
        name,
        iso_code,
        flag_emoji
      )
    `)
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const feed = (recentVotes || []).map((vote: any) => {
    const country = vote.countries
    const msgFns = FEED_MESSAGES[vote.vote_type as 'positive' | 'negative'] ||
      FEED_MESSAGES.positive
    const msgFn = msgFns[Math.floor(Math.random() * msgFns.length)]

    return {
      id: vote.id,
      message: msgFn(country?.flag_emoji || '🌍', country?.name || 'a country'),
      country_iso: country?.iso_code || '',
      country_name: country?.name || '',
      flag_emoji: country?.flag_emoji || '🌍',
      vote_type: vote.vote_type,
      created_at: vote.created_at,
    }
  })

  return NextResponse.json(feed)
}
