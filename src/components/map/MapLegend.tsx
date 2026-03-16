'use client'
// components/map/MapLegend.tsx

export default function MapLegend() {
  return (
    <div className="absolute bottom-6 left-4 bg-[#0d0d1a]/90 backdrop-blur border border-white/10 rounded-xl p-3 text-xs">
      <p className="text-white/40 mb-2 font-medium uppercase tracking-widest text-[10px]">Sentiment</p>
      <div className="flex items-center gap-2">
        <div className="w-20 h-3 rounded-full" style={{
          background: 'linear-gradient(to right, #e03030, #888890, #20a03c)'
        }} />
      </div>
      <div className="flex justify-between mt-1 text-white/40">
        <span>Negative</span>
        <span>Neutral</span>
        <span>Positive</span>
      </div>
      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/10">
        <div className="w-3 h-3 rounded-sm bg-[#2a2a35]" />
        <span className="text-white/40">No votes yet</span>
      </div>
    </div>
  )
}
