'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import type { LiveOffer } from '@/types'

interface OfferFilters {
  search:     string
  modalite:   string
  tjmMin:     number
  plateforme: string
  scoreMin:   number
}

const DEFAULT_FILTERS: OfferFilters = {
  search: '', modalite: '', tjmMin: 0, plateforme: '', scoreMin: 0,
}

let _cache: LiveOffer[] = []
let _cacheTime = 0
const CACHE_TTL = 10 * 60 * 1000

export function useOffers(skills: string[] = []) {
  const [offers,      setOffers]  = useState<LiveOffer[]>(_cache)
  const [loading,     setLoading] = useState(!_cache.length)
  const [error,       setError]   = useState<string | null>(null)
  const [stats,       setStats]   = useState<Record<string, { ok: boolean; count: number }>>({})
  const [filters,     setFiltersState] = useState<OfferFilters>(DEFAULT_FILTERS)
  const [savedOffers, setSaved]   = useState<string[]>([])
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('datasphere_os_v1')
      if (raw) {
        const state = JSON.parse(raw)
        setSaved(state.savedOffres || [])
      }
    } catch {}
  }, [])

  const fetchOffers = useCallback(async (force = false) => {
    if (!force && _cache.length && Date.now() - _cacheTime < CACHE_TTL) {
      setOffers(_cache); setLoading(false); return
    }
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setLoading(true); setError(null)

    try {
      const skillsParam = skills.join(',') || 'data engineer'
      const res = await fetch(`/api/offers?skills=${encodeURIComponent(skillsParam)}`,
        { signal: abortRef.current.signal })
      if (!res.ok) throw new Error(`Erreur ${res.status}`)
      const data = await res.json()
      _cache = data.offers || []; _cacheTime = Date.now()
      setOffers(_cache); setStats(data.stats || {})
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'AbortError') return
      setError(e instanceof Error ? e.message : 'Erreur réseau')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skills.join(',')])

  useEffect(() => {
    fetchOffers()
    return () => abortRef.current?.abort()
  }, [fetchOffers])

  const filtered = offers.filter(o => {
    if (filters.search) {
      const q = filters.search.toLowerCase()
      if (!`${o.titre} ${o.entreprise} ${o.secteur} ${o.description || ''}`.toLowerCase().includes(q)) return false
    }
    if (filters.modalite   && o.modalite   !== filters.modalite)   return false
    if (filters.tjmMin     && o.tjmMax      < filters.tjmMin)      return false
    if (filters.plateforme && o.plateforme  !== filters.plateforme) return false
    if (filters.scoreMin   && (o.score || 0) < filters.scoreMin)   return false
    return true
  })

  function setFilters(f: Partial<OfferFilters>) {
    setFiltersState(prev => ({ ...prev, ...f }))
  }

  function saveOffer(id: string) {
    setSaved(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      try {
        const raw = localStorage.getItem('datasphere_os_v1')
        if (raw) {
          const state = JSON.parse(raw)
          state.savedOffres = next
          localStorage.setItem('datasphere_os_v1', JSON.stringify(state))
        }
      } catch {}
      return next
    })
  }

  return {
    offers, filtered, loading, error, stats,
    sources: Object.keys(stats).length,
    filters, setFilters,
    refresh: () => fetchOffers(true),
    saveOffer, savedOffers,
  }
}
