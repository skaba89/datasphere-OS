'use client'
// app/offres/page.tsx
import { useOffers } from '@/hooks/useOffers'
import { useState, useEffect } from 'react'
import { RefreshCw, Settings, Heart, ExternalLink, Bot, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LiveOffer } from '@/types'

export default function OffresPage() {
  const [skills, setSkills] = useState<string[]>([])

  useEffect(() => {
    try {
      const raw   = localStorage.getItem('datasphere_os_v1')
      const state = raw ? JSON.parse(raw) : {}
      setSkills((state.cv?.competences || ['data','engineer','python']).slice(0, 5))
    } catch {}
  }, [])

  const { filtered, loading, error, stats, sources, filters, setFilters, refresh, saveOffer, savedOffers } = useOffers(skills)

  const liveCount = filtered.filter(o => o._live).length
  const plateformes = [...new Set(filtered.map(o => o.plateforme))]
  const avgTJM = filtered.length
    ? Math.round(filtered.reduce((s, o) => s + (o.tjmMin + o.tjmMax) / 2, 0) / filtered.length)
    : 0

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-ds-text tracking-tight">
            Offres de mission
          </h1>
          <p className="text-sm text-ds-text3 mt-0.5">
            {loading
              ? 'Chargement depuis ' + Object.keys(stats).length + ' sources…'
              : `${liveCount} offres réelles · ${sources} sources · TJM moyen ${avgTJM}€/j`
            }
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={refresh}
            disabled={loading}
            className="btn-secondary flex items-center gap-1.5"
          >
            <RefreshCw size={13} className={cn(loading && 'animate-spin')} />
            Actualiser
          </button>
          <a href="/offres/sources" className="btn-secondary flex items-center gap-1.5">
            <Settings size={13} />
            Sources
          </a>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label:'Offres trouvées',  value: filtered.length,     color:'text-ds-blue2' },
          { label:'Sources actives',  value: sources,             color:'text-ds-teal' },
          { label:'TJM moyen',        value: avgTJM+'€/j',        color:'text-ds-green' },
          { label:'Match ≥ 70%',      value: filtered.filter(o=>(o.score||0)>=70).length, color:'text-ds-violet2' },
        ].map(k => (
          <div key={k.label} className="card py-3 px-4">
            <div className="text-[10px] font-bold uppercase tracking-wide text-ds-text3 mb-1">
              {k.label}
            </div>
            <div className={cn('text-xl font-extrabold', k.color)}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <input
            className="inp pl-8"
            placeholder="Rechercher par titre, tech, client…"
            value={filters.search}
            onChange={e => setFilters({ search: e.target.value })}
          />
          <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ds-text3" />
        </div>

        <select
          className="inp w-40"
          value={filters.modalite}
          onChange={e => setFilters({ modalite: e.target.value })}
        >
          <option value="">Modalité</option>
          {['Remote 100%', 'Hybride', 'On-site'].map(m =>
            <option key={m} value={m}>{m}</option>
          )}
        </select>

        <select
          className="inp w-36"
          value={filters.tjmMin}
          onChange={e => setFilters({ tjmMin: Number(e.target.value) })}
        >
          <option value={0}>TJM min</option>
          {[400,500,600,700,800,900,1000].map(v =>
            <option key={v} value={v}>{v}€+/j</option>
          )}
        </select>

        <select
          className="inp w-36"
          value={filters.plateforme}
          onChange={e => setFilters({ plateforme: e.target.value })}
        >
          <option value="">Source</option>
          {plateformes.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        <select
          className="inp w-36"
          value={filters.scoreMin}
          onChange={e => setFilters({ scoreMin: Number(e.target.value) })}
        >
          <option value={0}>Score min</option>
          {[50,60,70,80,90].map(v =>
            <option key={v} value={v}>≥ {v}%</option>
          )}
        </select>
      </div>

      {/* Erreur */}
      {error && (
        <div className="px-4 py-3 bg-ds-amber/8 border border-ds-amber/25
          rounded-ds text-sm text-ds-amber">
          ⚠️ Certaines sources n'ont pas répondu. Les offres disponibles sont affichées.
        </div>
      )}

      {/* Liste des offres */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-40 rounded-ds skeleton" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-ds-text3">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-sm">Aucune offre ne correspond à vos filtres.</p>
          <button
            onClick={() => setFilters({ search:'', modalite:'', tjmMin:0, plateforme:'', scoreMin:0 })}
            className="mt-3 text-xs text-ds-blue2 hover:underline"
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.slice(0, 30).map(offer => (
            <OfferCard
              key={offer.id}
              offer={offer}
              saved={savedOffers.includes(offer.id)}
              onSave={() => saveOffer(offer.id)}
            />
          ))}
          {filtered.length > 30 && (
            <p className="text-center text-xs text-ds-text3 py-4">
              {filtered.length - 30} offres supplémentaires — affinez vos filtres
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Carte d'offre ────────────────────────────────────
function OfferCard({ offer, saved, onSave }: {
  offer:  LiveOffer
  saved:  boolean
  onSave: () => void
}) {
  const score      = offer.score || 0
  const scoreColor = score >= 80 ? 'text-ds-green' : score >= 60 ? 'text-ds-teal' : score >= 40 ? 'text-ds-amber' : 'text-ds-text3'
  const isUrgent   = offer.urgence === 'Urgent'

  return (
    <div className={cn(
      'card transition-all hover:-translate-y-px hover:shadow-md',
      isUrgent && 'border-ds-rose/30 bg-ds-rose/3'
    )}>
      <div className="flex items-start gap-4">

        {/* Score ATS */}
        <div className="text-center flex-shrink-0 pt-1">
          <div className={cn('text-2xl font-extrabold leading-none', scoreColor)}>
            {score}
          </div>
          <div className="text-[9px] text-ds-text3 mt-0.5">match</div>
        </div>

        {/* Contenu */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-ds-text truncate max-w-md">
                  {offer.titre}
                </h3>
                {offer._live && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full
                    bg-ds-green/10 text-ds-green border border-ds-green/20 flex-shrink-0">
                    LIVE
                  </span>
                )}
                {isUrgent && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full
                    bg-ds-rose/10 text-ds-rose border border-ds-rose/20 flex-shrink-0">
                    URGENT
                  </span>
                )}
              </div>
              <p className="text-xs text-ds-text3 mt-0.5">
                {offer.entreprise} · {offer.ville}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-base font-extrabold text-ds-text">
                {offer.tjmMin}–{offer.tjmMax}€
                <span className="text-xs font-normal text-ds-text3">/j</span>
              </div>
              <div className="text-[10px] text-ds-text3">{offer.publiee}</div>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {[offer.modalite, offer.duree, offer.plateforme].map(tag => (
              <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full
                bg-ds-bg3 border border-ds-border text-ds-text3">
                {tag}
              </span>
            ))}
          </div>

          {/* Tech tags */}
          {offer.tech && offer.tech.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {offer.tech.slice(0, 6).map(t => (
                <span key={t} className="text-[10px] px-2 py-0.5 rounded-[4px]
                  bg-ds-blue/8 text-ds-blue2">
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          {offer.description && (
            <p className="text-xs text-ds-text3 line-clamp-2 mb-3">
              {offer.description}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-ds-sm text-xs
                font-semibold text-white bg-gradient-to-r from-ds-blue to-ds-violet
                hover:opacity-90 transition-opacity"
              onClick={() => {
                // Déclenche l'agent IA v21 si disponible
                if (typeof window !== 'undefined' && (window as unknown as {genCandidatureIA?:(id:string)=>void}).genCandidatureIA) {
                  (window as unknown as {genCandidatureIA:(id:string)=>void}).genCandidatureIA(offer.id)
                }
              }}
            >
              <Bot size={12} />
              Candidater IA
            </button>

            {offer.url && (
              <a
                href={offer.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-ds-sm text-xs
                  font-semibold text-ds-text2 bg-ds-bg3 border border-ds-border
                  hover:bg-ds-bg4 hover:text-ds-text transition-colors"
              >
                <ExternalLink size={12} />
                Voir l'offre
              </a>
            )}

            <button
              onClick={onSave}
              className="ml-auto p-1.5 rounded-ds-sm text-ds-text3
                hover:text-ds-rose transition-colors"
              aria-label={saved ? 'Retirer des favoris' : 'Sauvegarder'}
            >
              <Heart size={14} className={cn(saved && 'fill-ds-rose text-ds-rose')} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
