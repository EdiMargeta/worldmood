'use client'
// components/map/WorldMap.tsx

import React, { useState, useCallback, memo } from 'react'
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from 'react-simple-maps'
import { CountryWithStats } from '@/types'

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

// ISO numeric to alpha-2 mapping (partial — expand as needed)
const ISO_NUMERIC_TO_ALPHA2: Record<string, string> = {
  '840': 'US', '156': 'CN', '643': 'RU', '826': 'GB', '276': 'DE',
  '250': 'FR', '392': 'JP', '076': 'BR', '356': 'IN', '036': 'AU',
  '124': 'CA', '410': 'KR', '380': 'IT', '724': 'ES', '484': 'MX',
  '528': 'NL', '756': 'CH', '752': 'SE', '578': 'NO', '208': 'DK',
  '246': 'FI', '040': 'AT', '620': 'PT', '300': 'GR', '616': 'PL',
  '203': 'CZ', '348': 'HU', '642': 'RO', '804': 'UA', '792': 'TR',
  '682': 'SA', '784': 'AE', '376': 'IL', '364': 'IR', '368': 'IQ',
  '818': 'EG', '566': 'NG', '012': 'DZ', '504': 'MA', '788': 'TN',
  '764': 'TH', '360': 'ID', '458': 'MY', '608': 'PH', '704': 'VN',
  '050': 'BD', '586': 'PK', '144': 'LK', '032': 'AR', '152': 'CL',
  '170': 'CO', '604': 'PE', '858': 'UY', '862': 'VE', '554': 'NZ',
  '710': 'ZA', '404': 'KE', '288': 'GH', '408': 'KP', '702': 'SG',
  '158': 'TW', '218': 'EC', '591': 'PA',
}

function sentimentToColor(sentiment: number, totalVotes: number): string {
  if (totalVotes === 0) return '#2a2a35' // No data — dark neutral

  // Interpolate from red → neutral → green
  const intensity = Math.min(Math.abs(sentiment), 1)
  const alpha = 0.3 + intensity * 0.7

  if (sentiment > 0.05) {
    // Green range
    const r = Math.round(20 + (1 - intensity) * 80)
    const g = Math.round(160 + intensity * 55)
    const b = Math.round(60 + (1 - intensity) * 40)
    return `rgba(${r},${g},${b},${alpha})`
  } else if (sentiment < -0.05) {
    // Red range
    const r = Math.round(200 + intensity * 55)
    const g = Math.round(50 - intensity * 30)
    const b = Math.round(50 - intensity * 30)
    return `rgba(${r},${g},${b},${alpha})`
  } else {
    return `rgba(120,120,140,0.4)` // Neutral
  }
}

interface TooltipData {
  x: number
  y: number
  country: CountryWithStats
}

interface WorldMapProps {
  countries: CountryWithStats[]
  onCountryClick: (country: CountryWithStats) => void
}

const WorldMap = memo(({ countries, onCountryClick }: WorldMapProps) => {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)
  const [position, setPosition] = useState({ coordinates: [0, 20] as [number, number], zoom: 1 })

  const countryMap = new Map(countries.map(c => [c.iso_code, c]))

  const handleMouseMove = useCallback((evt: React.MouseEvent) => {
    setTooltip(prev =>
      prev ? { ...prev, x: evt.clientX, y: evt.clientY } : null
    )
  }, [])

  const handleZoomEnd = (pos: { coordinates: [number, number]; zoom: number }) => {
    setPosition(pos)
  }

  return (
    <div className="relative w-full h-full" onMouseMove={handleMouseMove}>
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 130, center: [10, 20] }}
        style={{ width: '100%', height: '100%' }}
      >
        <ZoomableGroup
          zoom={position.zoom}
          center={position.coordinates}
          onMoveEnd={handleZoomEnd}
          minZoom={0.8}
          maxZoom={6}
        >
          <Geographies geography={GEO_URL}>
	{({ geographies }: { geographies: any[] }) =>
              geographies.map((geo) => {
                const numericId = geo.id?.toString().padStart(3, '0')
                const isoCode = ISO_NUMERIC_TO_ALPHA2[numericId || ''] || ''
                const country = countryMap.get(isoCode)
                const fillColor = country
                  ? sentimentToColor(country.sentiment, country.total_votes)
                  : '#2a2a35'

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fillColor}
                    stroke="#1a1a2e"
                    strokeWidth={0.3}
                    style={{
                      default: { outline: 'none', cursor: country ? 'pointer' : 'default' },
                      hover: {
                        fill: country ? fillColor.replace(/[\d.]+\)$/, '1)') : '#3a3a4a',
                        outline: 'none',
                        filter: 'brightness(1.2)',
                      },
                      pressed: { outline: 'none' },
                    }}
                    onMouseEnter={(evt) => {
                      if (country) {
                        setTooltip({
                          x: (evt as unknown as MouseEvent).clientX,
                          y: (evt as unknown as MouseEvent).clientY,
                          country,
                        })
                      }
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    onClick={() => {
                      if (country) onCountryClick(country)
                    }}
                  />
                )
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
        >
          <div className="bg-[#0d0d1a]/95 backdrop-blur border border-white/10 rounded-xl p-3 shadow-2xl min-w-[180px]">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{tooltip.country.flag_emoji}</span>
              <span className="font-semibold text-white text-sm">{tooltip.country.name}</span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-white/50">Votes (24h)</span>
                <span className="text-white">{tooltip.country.total_votes.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">👍 Positive</span>
                <span className="text-green-400">{tooltip.country.likes_24h.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">👎 Negative</span>
                <span className="text-red-400">{tooltip.country.dislikes_24h.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center mt-1 pt-1 border-t border-white/10">
                <span className="text-white/50">Sentiment</span>
                <span
                  className={`font-bold ${
                    tooltip.country.sentiment > 0.05
                      ? 'text-green-400'
                      : tooltip.country.sentiment < -0.05
                      ? 'text-red-400'
                      : 'text-white/70'
                  }`}
                >
                  {tooltip.country.total_votes > 0
                    ? `${Math.round(
                        (tooltip.country.likes_24h / tooltip.country.total_votes) * 100
                      )}% positive`
                    : 'No data'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

WorldMap.displayName = 'WorldMap'

export default WorldMap
