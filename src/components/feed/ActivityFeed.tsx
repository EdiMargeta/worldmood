/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useRef, useState } from 'react'
import { FeedItem } from '@/types'
import { getSupabaseClient } from '@/lib/supabase/client'

export default function ActivityFeed() {
  const [items, setItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/feed')
      .then((r) => r.json())
      .then((data) => {
        setItems(Array.isArray(data) ? data.slice(0, 20) : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    const supabase = getSupabaseClient()

    const channel = supabase
      .channel('public:votes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'votes' },
        async (payload: any) => {
          const vote = payload.new as any

          const { data: country } = await (supabase
            .from('countries')
            .select('name, iso_code, flag_emoji')
            .eq('id', vote.country_id)
            .single() as any)

          if (!country) return

          const messages: Record<string, string[]> = {
            positive: [
              `${country.flag_emoji} Someone just 👍 voted on ${country.name}`,
              `Positive vibes for ${country.flag_emoji} ${country.name}`,
            ],
            negative: [
              `${country.flag_emoji} Someone just 👎 voted on ${country.name}`,
              `${country.flag_emoji} ${country.name} gets negative sentiment`,
            ],
          }
          const pool = messages[vote.vote_type as string] || messages.positive
          const message = pool[Math.floor(Math.random() * pool.length)]

          const newItem: FeedItem = {
            id: vote.id,
            type: 'vote',
            message,
            country_iso: country.iso_code,
            country_name: country.name,
            flag_emoji: country.flag_emoji,
            vote_type: vote.vote_type,
            created_at: vote.created_at,
          }

          setItems((prev) => [newItem, ...prev].slice(0, 30))
        }
      )
      .subscribe()

    const poll = setInterval(() => {
      fetch('/api/feed')
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setItems(data.slice(0, 20))
        })
        .catch(() => {})
    }, 15000)

    return () => {
      channel.unsubscribe()
      clearInterval(poll)
    }
  }, [])

  const timeAgo = (dateStr: string) => {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    return `${Math.floor(seconds / 3600)}h ago`
  }

  return (
    <div className="bg-[#0d0d1a] border border-white/10 rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <h3 className="text-white/70 text-sm font-medium">Live Global Activity</h3>
      </div>

      <div ref={listRef} className="overflow-y-auto max-h-[400px] divide-y divide-white/5">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-white/10 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-white/10 rounded w-3/4" />
                  <div className="h-2 bg-white/5 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center text-white/30 text-sm">
            No activity yet. Be the first to vote!
          </div>
        ) : (
          items.map((item, idx) => (
            <div
              key={item.id}
              className={`flex items-start gap-3 px-4 py-3 transition-all ${
                idx === 0 ? 'bg-white/5' : ''
              }`}
            >
              <span className="text-xl flex-shrink-0 mt-0.5">{item.flag_emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-white/70 text-sm leading-snug">{item.message}</p>
                <p className="text-white/25 text-xs mt-1">{timeAgo(item.created_at)}</p>
              </div>
              <span
                className={`text-sm flex-shrink-0 ${
                  item.vote_type === 'positive' ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {item.vote_type === 'positive' ? '👍' : '👎'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
