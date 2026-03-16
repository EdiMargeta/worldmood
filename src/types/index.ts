// types/index.ts

export interface Country {
  id: string
  name: string
  iso_code: string
  continent: string
  region: string
  flag_emoji: string
}

export interface CountryWithStats extends Country {
  likes_24h: number
  dislikes_24h: number
  total_votes: number
  sentiment: number // -1 to 1
  trend: 'rising' | 'falling' | 'stable'
}

export interface Vote {
  id: string
  country_id: string
  vote_type: 'positive' | 'negative'
  voter_fingerprint: string
  is_simulated: boolean
  created_at: string
}

export interface FeedItem {
  id: string
  type: 'vote' | 'milestone' | 'trending'
  message: string
  country_iso: string
  country_name: string
  flag_emoji: string
  vote_type?: 'positive' | 'negative'
  created_at: string
}

export interface TrendingCountry extends CountryWithStats {
  trending_score: number
  sentiment_delta: number
  rank: number
}

export interface DailyQuestion {
  id: string
  question: string
  date: string
  results: { country: Country; votes: number; percentage: number }[]
  total_votes: number
  user_voted?: boolean
  user_vote_country?: string
}

export interface SimulationSettings {
  enabled: boolean
  cooldown_hours: number
  votes_per_interval: number
  like_probability: number
  interval_seconds: number
}

export interface AdminStats {
  total_votes_24h: number
  total_votes_all_time: number
  active_countries: number
  simulated_votes_24h: number
  top_country: CountryWithStats | null
  most_controversial: CountryWithStats | null
}

export type SortField = 'sentiment' | 'votes' | 'likes' | 'dislikes' | 'trending'
export type SortOrder = 'asc' | 'desc'
export type Continent = 'All' | 'Africa' | 'Asia' | 'Europe' | 'North America' | 'South America' | 'Oceania'
