/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getSimulationSettings } from '@/lib/simulation'
import crypto from 'crypto'

const ipVoteCount = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ipHash: string): boolean {
  const now = Date.now()
  const window = 60 * 60 * 1000
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

  if (!country_id || !vote_type || !fingerprint) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!['positive', 'negative'].includes(vote_type)) {
    return NextResponse.json({ error: 'Invalid vote type' }, { status: 400 })
  }
  if (fingerprint.length < 8 || fingerprint.length > 64) {
    return NextResponse.json({ error: 'Invalid fingerprint' }, { status: 400 })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  const ipHash = crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16)

  if (!checkRateLimit(ipHash)) {
    return NextResponse.json({ error: 'Too many votes. Try again later.' }, { status: 429 })
  }

  // Read cooldown_hours from admin settings
  const settings = await getSimulationSettings()
  const cooldownHours = settings.cooldown_hours || 24
  const cutoff = new Date(Date.now() - cooldownHours * 60 * 60 * 1000).toISOString()

  const { data: country, error: countryError } = await supabase
    .from('countries')
    .select('id, name, flag_emoji')
    .eq('id', country_id)
    .single()

  if (countryError || !country) {
    return NextResponse.json({ error: 'Country not found' }, { status: 404 })
  }

  // Check cooldown using the configured hours
  const { data: existingVote } = await supabase
    .from('votes')
    .select('id, created_at')
    .eq('country_id', country_id)
    .eq('voter_fingerprint', fingerprint)
    .gte('created_at', cutoff)
    .maybeSingle()

  if (existingVote) {
    // Calculate when cooldown expires so client can show a timer
    const votedAt = new Date((existingVote as any).created_at).getTime()
    const expiresAt = votedAt + cooldownHours * 60 * 60 * 1000
    return NextResponse.json(
      {
        error: 'Already voted on this country',
        cooldown_hours: cooldownHours,
        expires_at: new Date(expiresAt).toISOString(),
      },
      { status: 409 }
    )
  }

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

  return NextResponse.json({ success: true, vote_id: (vote as any).id })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const country_id = searchParams.get('country_id')
  const fingerprint = searchParams.get('fingerprint')

  if (!country_id || !fingerprint) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const supabase = createServerClient()
  const settings = await getSimulationSettings()
  const cooldownHours = settings.cooldown_hours || 24
  const cutoff = new Date(Date.now() - cooldownHours * 60 * 60 * 1000).toISOString()

  const { data } = await supabase
    .from('votes')
    .select('vote_type, created_at')
    .eq('country_id', country_id)
    .eq('voter_fingerprint', fingerprint)
    .gte('created_at', cutoff)
    .maybeSingle()

  let expires_at = null
  if (data) {
    const votedAt = new Date((data as any).created_at).getTime()
    expires_at = new Date(votedAt + cooldownHours * 60 * 60 * 1000).toISOString()
  }

  return NextResponse.json({
    has_voted: !!data,
    vote_type: (data as any)?.vote_type || null,
    expires_at,
    cooldown_hours: cooldownHours,
  })
}
