// lib/trending.ts
import { CountryWithStats, TrendingCountry } from '@/types'

interface VoteBucket {
  country_id: string
  hour: number
  likes: number
  dislikes: number
}

/**
 * Calculate trending score for a country.
 *
 * Formula:
 *   trendingScore = recentVoteWeight * recentVotes + Math.abs(sentimentDelta) * 2
 *
 * Recency weight buckets (hours since vote):
 *   0–2h   → 1.0
 *   2–6h   → 0.7
 *   6–12h  → 0.4
 *   12–24h → 0.2
 */
export function calculateTrendingScore(
  votes_last_2h: number,
  votes_2_6h: number,
  votes_6_12h: number,
  votes_12_24h: number,
  sentiment_delta: number
): number {
  const weightedVotes =
    votes_last_2h * 1.0 +
    votes_2_6h * 0.7 +
    votes_6_12h * 0.4 +
    votes_12_24h * 0.2

  const controversyBonus = Math.abs(sentiment_delta) * 2

  return weightedVotes + controversyBonus
}

/**
 * Sentiment score: positive = trending up, negative = trending down.
 * Range: -1.0 (all negative) to +1.0 (all positive)
 */
export function calculateSentiment(likes: number, dislikes: number): number {
  const total = likes + dislikes
  if (total === 0) return 0
  return (likes - dislikes) / total
}

/**
 * Generate trending stats from country data + hourly buckets
 */
export function rankByTrending(
  countries: CountryWithStats[],
  hourlyBuckets: VoteBucket[]
): TrendingCountry[] {
  const bucketMap = new Map<string, VoteBucket[]>()

  for (const bucket of hourlyBuckets) {
    const arr = bucketMap.get(bucket.country_id) || []
    arr.push(bucket)
    bucketMap.set(bucket.country_id, arr)
  }

  const now = Date.now()

  return countries
    .map((country) => {
      const buckets = bucketMap.get(country.id) || []

      const v2h = sumBuckets(buckets, now, 0, 2)
      const v6h = sumBuckets(buckets, now, 2, 6)
      const v12h = sumBuckets(buckets, now, 6, 12)
      const v24h = sumBuckets(buckets, now, 12, 24)

      const prevSentiment = calculateSentiment(
        country.likes_24h - v2h.likes,
        country.dislikes_24h - v2h.dislikes
      )
      const currSentiment = country.sentiment
      const sentimentDelta = currSentiment - prevSentiment

      const trendingScore = calculateTrendingScore(
        v2h.likes + v2h.dislikes,
        v6h.likes + v6h.dislikes,
        v12h.likes + v12h.dislikes,
        v24h.likes + v24h.dislikes,
        sentimentDelta
      )

      return {
        ...country,
        trending_score: trendingScore,
        sentiment_delta: sentimentDelta,
        rank: 0,
      }
    })
    .sort((a, b) => b.trending_score - a.trending_score)
    .map((c, i) => ({ ...c, rank: i + 1 }))
}

function sumBuckets(
  buckets: VoteBucket[],
  now: number,
  fromHours: number,
  toHours: number
): { likes: number; dislikes: number } {
  // In practice, buckets are identified by hour offset from now
  // This is a simplified version; in production use actual timestamps
  const relevant = buckets.filter(
    (b) => b.hour >= fromHours && b.hour < toHours
  )
  return relevant.reduce(
    (acc, b) => ({
      likes: acc.likes + b.likes,
      dislikes: acc.dislikes + b.dislikes,
    }),
    { likes: 0, dislikes: 0 }
  )
}

export function getTrendDirection(
  sentimentDelta: number
): 'rising' | 'falling' | 'stable' {
  if (sentimentDelta > 0.05) return 'rising'
  if (sentimentDelta < -0.05) return 'falling'
  return 'stable'
}
