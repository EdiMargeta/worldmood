// app/api/admin/simulation/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { updateSimulationSettings, runSimulationTick, getSimulationSettings } from '@/lib/simulation'

export async function GET() {
  const settings = await getSimulationSettings()
  return NextResponse.json(settings)
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  // Handle "run now" action
  if (body.action === 'run_now') {
    const settings = await getSimulationSettings()
    const result = await runSimulationTick(
      settings.votes_per_interval,
      settings.like_probability
    )
    return NextResponse.json({ success: true, ...result })
  }

  // Update settings
  const { action, ...settings } = body
  const updated = await updateSimulationSettings(settings)
  return NextResponse.json(updated)
}
