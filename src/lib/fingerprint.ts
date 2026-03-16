// lib/fingerprint.ts
'use client'

/**
 * Lightweight browser fingerprint for vote deduplication.
 * Not cryptographically secure — just a spam deterrent.
 * Falls back to a random ID stored in localStorage.
 */
export async function getFingerprint(): Promise<string> {
  // Try localStorage first for returning users
  const stored = localStorage.getItem('wsm_fp')
  if (stored) return stored

  // Build fingerprint from stable browser properties
  const components = [
    navigator.userAgent,
    navigator.language,
    navigator.platform,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 0,
  ].join('|')

  // Hash it
  const encoder = new TextEncoder()
  const data = encoder.encode(components)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const fp = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32)

  localStorage.setItem('wsm_fp', fp)
  return fp
}

/**
 * Check if user has voted on a country in the last 24h (client-side cache)
 */
export function getLocalVoteCooldowns(): Record<string, number> {
  try {
    const raw = localStorage.getItem('wsm_cooldowns')
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

export function setLocalVoteCooldown(countryId: string): void {
  const cooldowns = getLocalVoteCooldowns()
  cooldowns[countryId] = Date.now()
  localStorage.setItem('wsm_cooldowns', JSON.stringify(cooldowns))
}

export function isOnCooldown(countryId: string, hours = 24): boolean {
  const cooldowns = getLocalVoteCooldowns()
  const lastVote = cooldowns[countryId]
  if (!lastVote) return false
  const hourMs = hours * 60 * 60 * 1000
  return Date.now() - lastVote < hourMs
}
