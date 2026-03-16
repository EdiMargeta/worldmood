// app/api/simulation/run/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { runSimulationTick, getSimulationSettings } from '@/lib/simulation'

// Called by Vercel Cron or external scheduler
export async function GET(req: NextRequest) {
  // Optional secret header check
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const settings = await getSimulationSettings()

  if (!settings.enabled) {
    return NextResponse.json({ skipped: true, reason: 'simulation disabled' })
  }

  const result = await runSimulationTick(
    settings.votes_per_interval,
    settings.like_probability
  )

  return NextResponse.json({ success: true, ...result })
}
