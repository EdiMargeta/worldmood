// app/api/daily-question/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

const DAILY_QUESTIONS = [
  "Which country had the best global reputation today?",
  "Which country would you most like to visit right now?",
  "Which country is leading in global goodwill?",
  "Which country do you feel most positive about today?",
  "Which nation deserves more recognition today?",
  "Which country is having its best moment on the world stage?",
]

function getTodaysQuestion(): string {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
    (1000 * 60 * 60 * 24)
  )
  return DAILY_QUESTIONS[dayOfYear % DAILY_QUESTIONS.length]
}

export async function GET(req: NextRequest) {
  const supabase = createServerClient()
  const fingerprint = req.nextUrl.searchParams.get('fp') || ''
  const today = new Date().toISOString().split('T')[0]

  // Get or create today's question
  let { data: question } = await supabase
    .from('daily_questions')
    .select('*')
    .eq('date', today)
    .maybeSingle()

  if (!question) {
    const { data: newQ } = await supabase
      .from('daily_questions')
      .insert({ question: getTodaysQuestion(), date: today })
      .select()
      .single()
    question = newQ
  }

  if (!question) return NextResponse.json({ error: 'Failed to get question' }, { status: 500 })

  // Get results
  const { data: votes } = await supabase
    .from('daily_question_votes')
    .select(`
      country_id,
      countries (name, iso_code, flag_emoji)
    `)
    .eq('question_id', question.id)

  // Tally
  const tally = new Map<string, { country: any; count: number }>()
  let total = 0
  for (const v of votes || []) {
    const entry = tally.get(v.country_id) || { country: (v as any).countries, count: 0 }
    entry.count++
    tally.set(v.country_id, entry)
    total++
  }

  const results = [...tally.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map(({ country, count }) => ({
      country,
      votes: count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }))

  // Check if user voted
  let userVoted = false
  let userVoteCountry = null
  if (fingerprint) {
    const { data: userVote } = await supabase
      .from('daily_question_votes')
      .select('country_id, countries(name)')
      .eq('question_id', question.id)
      .eq('voter_fingerprint', fingerprint)
      .maybeSingle()
    userVoted = !!userVote
    userVoteCountry = (userVote as any)?.countries?.name || null
  }

  return NextResponse.json({
    id: question.id,
    question: question.question,
    date: question.date,
    results,
    total_votes: total,
    user_voted: userVoted,
    user_vote_country: userVoteCountry,
  })
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { question_id, country_id, fingerprint } = await req.json()

  if (!question_id || !country_id || !fingerprint) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Check for existing vote
  const { data: existing } = await supabase
    .from('daily_question_votes')
    .select('id')
    .eq('question_id', question_id)
    .eq('voter_fingerprint', fingerprint)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Already voted today' }, { status: 409 })
  }

  await supabase.from('daily_question_votes').insert({
    question_id,
    country_id,
    voter_fingerprint: fingerprint,
  })

  return NextResponse.json({ success: true })
}
