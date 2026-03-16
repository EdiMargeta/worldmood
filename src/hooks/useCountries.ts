// hooks/useCountries.ts
import useSWR from 'swr'
import { CountryWithStats } from '@/types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useCountries() {
  const { data, error, isLoading, mutate } = useSWR<CountryWithStats[]>(
    '/api/countries',
    fetcher,
    { refreshInterval: 30000 }  // Re-fetch every 30s
  )
  return {
    countries: data || [],
    error,
    isLoading,
    mutate,
  }
}

export function useCountry(iso: string) {
  const { countries } = useCountries()
  return countries.find(c => c.iso_code === iso) || null
}
