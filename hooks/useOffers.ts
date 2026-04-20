'use client'
// hooks/useOffers.ts
// ═══════════════════════════════════════════════════
// Hook React pour les offres live multi-sources
// Gère le cache, le chargement et les filtres
// ═══════════════════════════════════════════════════
import { useState, useEffect, useCallback, useRef } from 'react'
import type { LiveOffer } from '@/types'

interface OfferFilters {
  search:      string
  modalite:    string
  tjmMin:      number
  plateforme:  string
  scoreMin:    number
}

interface UseOffersReturn {
  offers:       LiveOffer[]
  filtered:     LiveOffer[]
  loading:      boolean
  error:        string | null
  stats:        Record<string, { ok: boolean; count: number; error?: string }>
  sources:      number
  filters:      OfferFilters
  setFilters:   (f: Partial<OfferFilters>) => void
  refresh:      () => void
  saveOffer:    (id: string) => void
  savedOffers:  string[]
}

const DEFAULT_FILTERS: OfferFilters = {
  search:     '',
  modalite:   '',
  tjmMin:     0,
  plateforme: '',
  scoreMin:   0,
}

// Cache en mémoire partagé entre les instances
let _cache: LiveOffer[]  = []
let _cacheTime = 0
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes

export function useOffers(skills: string[] = []): UseOffersReturn {
  const [offers,      setOffers]  = useState<LiveOffer[]>(_cache)
  const [loading,     setLoading] = useState(!_cache.length)
  const [error,       setError]   = useState<string | null>(null)
  const [stats,       setStats]   = useState<Record<string, {ok:boolean;count:number}>>({})
  const [filters,     setFiltersState] = useState<OfferFilters>(DEFAULT_FILTERS)
  const [savedOffers, setSaved]   = useState<string[]>([])
  const abortRef = useRef<AbortController | null>(null)

  // Charger les offres sauvegardées depuis localStorage
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
    // Utiliser le cache si valide
    if (!force && _cache.length && Date.now() - _cacheTime < CACHE_TTL) {
      setOffers(_cache)
      setLoading(false)
      return
    }

    // Annuler le fetch précédent
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    setLoading(true)
    setError(null)

    try {
      const skillsParam = skills.join(',') || 'data engineer'
      const res = await fetch(
        `/api/offers?skills=${encodeURIComponent(skillsParam)}`,
        { signal: abortRef.current.signal }
      )

      if (!res.ok) throw new Error(`Erreur ${res.status}`)

      const data = await res.json()

      _cache     = data.offers || []
      _cacheTime = Date.now()

      setOffers(_cache)
      setStats(data.stats || {})
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      setError((e as Error).message)
      // Fallback : offres de démo depuis localStorage
      try {
        const raw = localStorage.getItem('datasphere_os_v1')
        if (raw) {
          const state = JSON.parse(raw)
          const mockOffres = state.mockOffres || []
          if (mockOffres.length) setOffers(mockOffres)
        }
      } catch {}
    } finally {
      setLoading(false)
    }
  }, [skills.join(',')])  // eslint-disable-line

  useEffect(() => {
    fetchOffers()
    return () => abortRef.current?.abort()
  }, [fetchOffers])

  // Filtres appliqués localement (très rapide)
  const filtered = offers.filter(o => {
    if (filters.search) {
      const q = filters.search.toLowerCase()
      if (!`${o.titre} ${o.entreprise} ${o.secteur} ${o.description}`.toLowerCase().includes(q))
        return false
    }
    if (filters.modalite && o.modalite !== filters.modalite) return false
    if (filters.tjmMin   && o.tjmMax < filters.tjmMin)      return false
    if (filters.plateforme && o.plateforme !== filters.plateforme) return false
    if (filters.scoreMin && (o.score || 0) < filters.scoreMin)    return false
    return true
  })

  function setFilters(f: Partial<OfferFilters>) {
    setFiltersState(prev => ({ ...prev, ...f }))
  }

  function saveOffer(id: string) {
    setSaved(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      // Persister dans localStorage
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
    offers,
    filtered,
    loading,
    error,
    stats,
    sources: Object.keys(stats).length,
    filters,
    setFilters,
    refresh:      () => fetchOffers(true),
    saveOffer,
    savedOffers,
  }
}
