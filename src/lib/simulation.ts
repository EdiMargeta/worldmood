/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerClient } from './supabase/server'

const COUNTRY_WEIGHTS: Record<string, number> = {
  US: 3.0, CN: 2.5, RU: 2.5, GB: 2.0, DE: 1.8,
  FR: 1.8, JP: 1.8, BR: 1.5, IN: 2.0, AU: 1.5,
  CA: 1.5, KR: 1.5, IT: 1.5, ES: 1.3, MX: 1.3,
}

const COUNTRY_SENTIMENT_BIAS: Record<string, number> = {
  JP: 0.75, NZ: 0.78, NO: 0.75, CH: 0.72, CA: 0.70,
  AU: 0.70, DE: 0.68, FR: 0.65,
  RU: 0.40, KP: 0.25, CN: 0.45, IR: 0.38, SY: 0.35,
  US: 0.55, GB: 0.62, BR: 0.60, IN: 0.58,
}

export async function runSimulationTick(
  votesPerInterval: number = 10,
  baseLikeProbability: number = 0.65
): Promise<{ votes_inserted: number; countries_affected: string[] }> {
  const supabase = createServerClient()

  const { data: countries, error } = await supabase
    .from('countries')
    .select('id, iso_code')

  if (error || !countries) {
    throw new Error('Failed to fetch countries for simulation')
  }

  const votesInserted: Array<{
    country_id: string
    vote_type: string
    voter_fingerprint: string
    is_simulated: boolean
  }> = []
  const affectedIsos: string[] = []

  const pool: any[] = []
  for (const country of countries) {
    const weight = COUNTRY_WEIGHTS[(country as any).iso_code] || 1.0
    const count = Math.ceil(weight)
    for (let i = 0; i < count; i++) pool.push(country)
  }

  for (let i = 0; i < votesPerInterval; i++) {
    const country = pool[Math.floor(Math.random() * pool.length)] as any
    const likeProbability = COUNTRY_SENTIMENT_BIAS[country.iso_code] || baseLikeProbability
    const isLike = Math.random() < likeProbability
    const fp = 'sim_' + Math.random().toString(36).slice(2, 18)

    votesInserted.push({
      country_id: country.id,
      vote_type: isLike ? 'positive' : 'negative',
      voter_fingerprint: fp,
      is_simulated: true,
    })

    if (!affectedIsos.includes(country.iso_code)) {
      affectedIsos.push(country.iso_code)
    }
  }

  const { error: insertError } = await supabase.from('votes').insert(votesInserted)
  if (insertError) throw new Error(`Failed to insert simulated votes: ${insertError.message}`)

  return { votes_inserted: votesInserted.length, countries_affected: affectedIsos }
}

export async function getSimulationSettings() {
  const supabase = createServerClient()
  const { data } = await supabase
    .from('simulation_settings')
    .select('*')
    .limit(1)
    .single()

  return data || {
    enabled: false,
    cooldown_hours: 24,
    votes_per_interval: 10,
    like_probability: 0.65,
    interval_seconds: 30,
  }
}

export async function updateSimulationSettings(
  settings: Partial<{
    enabled: boolean
    cooldown_hours: number
    votes_per_interval: number
    like_probability: number
    interval_seconds: number
  }>
) {
  const supabase = createServerClient()

  // Get the first row's ID reliably
  const { data: existing } = await supabase
    .from('simulation_settings')
    .select('id')
    .limit(1)
    .single()

  if (!existing) throw new Error('No simulation_settings row found')

  const { data, error } = await supabase
    .from('simulation_settings')
    .update({ ...settings, updated_at: new Date().toISOString() })
    .eq('id', existing.id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}
