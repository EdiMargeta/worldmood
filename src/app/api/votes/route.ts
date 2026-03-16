// app/api/votes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import crypto from 'crypto'

// Simple in-memory IP rate limiter (in production use Redis/Upstash)
const ipVoteCount = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ipHash: string): boolean {
  const now = Date.now()
  const window = 60 * 60 * 1000 // 1 hour
  const limit = 50

  const entry = ipVoteCount.get(ipHash)
  if (!entry || now > entry.resetAt) {
    ipVoteCount.set(ipHash, { count: 1, resetAt: now + window })
    return true
  }
  if (entry.count >= limit) return false
  entry.count++
  return true
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient()

  let body: { country_id: string; vote_type: string; fingerprint: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { country_id, vote_type, fingerprint } = body

  // Validate inputs
  if (!country_id || !vote_type || !fingerprint) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!['positive', 'negative'].includes(vote_type)) {
    return NextResponse.json({ error: 'Invalid vote type' }, { status: 400 })
  }
  if (fingerprint.length < 8 || fingerprint.length > 64) {
    return NextResponse.json({ error: 'Invalid fingerprint' }, { status: 400 })
  }

  // IP rate limiting
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  const ipHash = crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16)

  if (!checkRateLimit(ipHash)) {
    return NextResponse.json(
      { error: 'Too many votes. Try again later.' },
      { status: 429 }
    )
  }

  // Verify country exists
  const { data: country, error: countryError } = await supabase
    .from('countries')
    .select('id, name, flag_emoji')
    .eq('id', country_id)
    .single()

  if (countryError || !country) {
    return NextResponse.json({ error: 'Country not found' }, { status: 404 })
  }

  // Check cooldown: one vote per fingerprint per country per 24h
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: existingVote } = await supabase
    .from('votes')
    .select('id')
    .eq('country_id', country_id)
    .eq('voter_fingerprint', fingerprint)
    .gte('created_at', cutoff)
    .maybeSingle()

  if (existingVote) {
    return NextResponse.json(
      { error: 'Already voted on this country in the last 24 hours' },
      { status: 409 }
    )
  }

  // Insert vote
  const { data: vote, error: insertError } = await supabase
    .from('votes')
    .insert({
      country_id,
      vote_type,
      voter_fingerprint: fingerprint,
      voter_ip_hash: ipHash,
      vote_source: 'web',
      is_simulated: false,
    })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ error: 'Failed to record vote' }, { status: 500 })
  }

  // Broadcast to realtime channel for live feed
  await supabase.channel('votes').send({
    type: 'broadcast',
    event: 'new_vote',
    payload: {
      country_name: country.name,
      flag_emoji: country.flag_emoji,
      vote_type,
      country_id,
    },
  })

  return NextResponse.json({ success: true, vote_id: vote.id })
}

export async function GET(req: NextRequest) {
  // Check if user has voted on a country
  const { searchParams } = new URL(req.url)
  const country_id = searchParams.get('country_id')
  const fingerprint = searchParams.get('fingerprint')

  if (!country_id || !fingerprint) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const supabase = createServerClient()
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data } = await supabase
    .from('votes')
    .select('vote_type')
    .eq('country_id', country_id)
    .eq('voter_fingerprint', fingerprint)
    .gte('created_at', cutoff)
    .maybeSingle()

  return NextResponse.json({
    has_voted: !!data,
    vote_type: data?.vote_type || null,
  })
}
