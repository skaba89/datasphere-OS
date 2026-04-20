'use client'
import { useEffect, useState } from 'react'
import { Plus, Play, Square, Clock, Edit2, Trash2, CheckCircle2, Calendar } from 'lucide-react'
import { cn, fmt, formatDate, uid, today } from '@/lib/utils'

type Statut = 'En cours' | 'Terminée' | 'À venir' | 'En pause'
interface Mission {
  id: string; titre: string; client: string; tjm: number; jours: number
  debut: string; fin: string; statut: Statut; secteur: string; notes: string
}
interface TimeEntry { id: string; missionId: string; date: string; dureeMin: number; desc: string }

const STATUT_STYLES: Record<Statut, string> = {
  'En cours':  'bg-ds-green/10 text-ds-green border-ds-green/20',
  'Terminée':  'bg-ds-text3/10 text-ds-text3 border-ds-text3/20',
  'À venir':   'bg-ds-blue/10 text-ds-blue2 border-ds-blue/20',
  'En pause':  'bg-ds-amber/10 text-ds-amber border-ds-amber/20',
}

function load<T>(key: string, def: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def } catch { return def }
}
function save(key: string, val: unknown) { try { localStorage.setItem(key, JSON.stringify(val)) } catch {} }

export default function MissionsPage() {
  const [missions,     setMissions]     = useState<Mission[]>([])
  const [entries,      setEntries]      = useState<TimeEntry[]>([])
  const [view,         setView]         = useState<'list' | 'kanban'>('list')
  const [filter,       setFilter]       = useState<Statut | 'Tous'>('Tous')
  const [showForm,     setShowForm]     = useState(false)
  const [editing,      setEditing]      = useState<Mission | null>(null)
  const [timerActive,  setTimerActive]  = useState(false)
  const [timerStart,   setTimerStart]   = useState<number | null>(null)
  const [timerMission, setTimerMission] = useState('')
  const [timerDisplay, setTimerDisplay] = useState('00:00:00')

  useEffect(() => {
    const s = load<{ missions?: Mission[]; timeEntries?: TimeEntry[] }>('datasphere_os_v1', {})
    setMissions(s.missions || [])
    setEntries(s.timeEntries || [])
    document.title = 'Missions — DataSphere OS'
  }, [])

  useEffect(() => {
    if (!timerActive || !timerStart) return
    const iv = setInterval(() => {
      const s = Math.floor((Date.now() - timerStart) / 1000)
      const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
      setTimerDisplay([h, m, sec].map(x => String(x).padStart(2, '0')).join(':'))
    }, 1000)
    return () => clearInterval(iv)
  }, [timerActive, timerStart])

  function persist(m: Mission[], e: TimeEntry[]) {
    const s = load<Record<string, unknown>>('datasphere_os_v1', {})
    save('datasphere_os_v1', { ...s, missions: m, timeEntries: e })
    setMissions(m); setEntries(e)
  }

  function saveMission(m: Mission) {
    const next = editing ? missions.map(x => x.id === m.id ? m : x) : [...missions, m]
    persist(next, entries)
    setShowForm(false); setEditing(null)
  }

  function deleteMission(id: string) {
    if (!confirm('Supprimer cette mission ?')) return
    persist(missions.filter(m => m.id !== id), entries.filter(e => e.missionId !== id))
  }

  function toggleTimer() {
    if (!timerActive) {
      if (!timerMission) return
      setTimerStart(Date.now()); setTimerActive(true)
    } else {
      const mins = Math.max(1, Math.round((Date.now() - (timerStart || Date.now())) / 60000))
      const e: TimeEntry = { id: uid(), missionId: timerMission, date: today(), dureeMin: mins, desc: '' }
      persist(missions, [...entries, e])
      setTimerActive(false); setTimerStart(null); setTimerDisplay('00:00:00')
    }
  }

  const filtered = filter === 'Tous' ? missions : missions.filter(m => m.statut === filter)
  const totalCA  = missions.filter(m => m.statut === 'Terminée').reduce((s, m) => s + m.tjm * m.jours, 0)
  const enCours  = missions.filter(m => m.statut === 'En cours').length
  const totalMin = entries.reduce((s, e) => s + e.dureeMin, 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-ds-text tracking-tight">Missions</h1>
          <p className="text-sm text-ds-text3 mt-0.5">{missions.length} mission{missions.length !== 1 ? 's' : ''} · {enCours} en cours</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView(v => v === 'list' ? 'kanban' : 'list')} className="btn-secondary">
            {view === 'list' ? '🗂️ Kanban' : '☰ Liste'}
          </button>
          <button onClick={() => { setEditing(null); setShowForm(true) }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-ds-sm text-xs font-semibold text-white bg-gradient-to-r from-ds-blue to-ds-violet hover:opacity-90">
            <Plus size={13} /> Nouvelle mission
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Actives',         value: enCours,                         color: 'text-ds-teal' },
          { label: 'CA terminées',    value: fmt(totalCA) + '€',              color: 'text-ds-green' },
          { label: 'Heures trackées', value: (totalMin / 60).toFixed(1) + 'h',color: 'text-ds-blue2' },
          { label: 'Total',           value: missions.length,                 color: 'text-ds-violet2' },
        ].map(k => (
          <div key={k.label} className="card py-3 px-4">
            <div className="text-[10px] font-bold uppercase tracking-wide text-ds-text3 mb-1">{k.label}</div>
            <div className={cn('text-xl font-extrabold', k.color)}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Timer */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-ds-text flex items-center gap-2"><Clock size={14} /> Time Tracker</h2>
          <span className={cn('text-2xl font-mono font-bold tabular-nums', timerActive ? 'text-ds-teal' : 'text-ds-text3')}>
            {timerDisplay}
          </span>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <select value={timerMission} onChange={e => setTimerMission(e.target.value)} className="inp flex-1 min-w-[160px] text-xs">
            <option value="">— Sélectionner une mission —</option>
            {missions.filter(m => m.statut === 'En cours').map(m => (
              <option key={m.id} value={m.id}>{m.titre || m.client}</option>
            ))}
          </select>
          <button onClick={toggleTimer} disabled={!timerMission && !timerActive}
            className={cn('flex items-center gap-1.5 px-4 py-2 rounded-ds-sm text-xs font-bold transition-all',
              timerActive ? 'bg-ds-rose/10 border border-ds-rose/30 text-ds-rose' : 'bg-ds-green/10 border border-ds-green/30 text-ds-green',
              (!timerMission && !timerActive) && 'opacity-40 cursor-not-allowed')}>
            {timerActive ? <><Square size={12} /> Arrêter</> : <><Play size={12} /> Démarrer</>}
          </button>
        </div>
        {entries.length > 0 && (
          <div className="mt-3 pt-3 border-t border-ds-border space-y-1">
            {entries.slice(-3).reverse().map(e => {
              const m = missions.find(x => x.id === e.missionId)
              return (
                <div key={e.id} className="flex items-center justify-between text-xs text-ds-text3">
                  <span>{m?.titre || m?.client || '—'} · {formatDate(e.date)}</span>
                  <span className="font-semibold text-ds-amber">{(e.dureeMin / 60).toFixed(1)}h</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        {(['Tous', 'En cours', 'À venir', 'En pause', 'Terminée'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
              filter === s ? 'bg-ds-blue/15 text-ds-blue2 border-ds-blue/40' : 'bg-ds-bg3 text-ds-text3 border-ds-border hover:border-ds-border2')}>
            {s}{s !== 'Tous' && <span className="ml-1 opacity-60">({missions.filter(m => m.statut === s).length})</span>}
          </button>
        ))}
      </div>

      {view === 'list' && (
        <div className="space-y-2.5">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-ds-text3">
              <div className="text-4xl mb-3">🚀</div>
              <p className="text-sm mb-3">Aucune mission.</p>
              <button onClick={() => { setEditing(null); setShowForm(true) }} className="text-xs text-ds-blue2 hover:underline">Créer une mission →</button>
            </div>
          ) : filtered.map(m => (
            <div key={m.id} className="card hover:border-ds-border2">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-ds-sm bg-ds-blue/10 flex items-center justify-center flex-shrink-0 text-ds-blue2">
                    <CheckCircle2 size={15} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-ds-text truncate">{m.titre || '(Sans titre)'}</div>
                    <div className="text-[11px] text-ds-text3 mt-0.5">{m.client}{m.secteur ? ' · ' + m.secteur : ''}</div>
                    <div className="flex gap-3 mt-1 text-[11px] text-ds-text3">
                      {m.debut && <span className="flex items-center gap-1"><Calendar size={10} />{formatDate(m.debut)}</span>}
                      {m.fin   && <span>→ {formatDate(m.fin)}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-right">
                    <div className="text-sm font-extrabold text-ds-text">{fmt(m.tjm * m.jours)}€</div>
                    <div className="text-[10px] text-ds-text3">{m.tjm}€/j · {m.jours}j</div>
                  </div>
                  <select value={m.statut}
                    onChange={e => {
                      const next = missions.map(x => x.id === m.id ? { ...x, statut: e.target.value as Statut } : x)
                      persist(next, entries)
                    }}
                    className={cn('text-[10px] font-bold px-2 py-1 rounded-full border bg-transparent cursor-pointer', STATUT_STYLES[m.statut])}>
                    {(['En cours', 'À venir', 'En pause', 'Terminée'] as Statut[]).map(s => <option key={s}>{s}</option>)}
                  </select>
                  <button onClick={() => { setEditing(m); setShowForm(true) }} className="p-1.5 text-ds-text3 hover:text-ds-blue2"><Edit2 size={13} /></button>
                  <button onClick={() => deleteMission(m.id)} className="p-1.5 text-ds-text3 hover:text-ds-rose"><Trash2 size={13} /></button>
                </div>
              </div>
              {m.notes && <p className="text-[11px] text-ds-text3 mt-2 pt-2 border-t border-ds-border line-clamp-2">{m.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {view === 'kanban' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {(['En cours', 'À venir', 'En pause', 'Terminée'] as Statut[]).map(statut => (
            <div key={statut}>
              <div className={cn('flex items-center justify-between px-3 py-2 rounded-ds-sm mb-2 border text-xs font-bold', STATUT_STYLES[statut])}>
                <span>{statut}</span><span>{missions.filter(m => m.statut === statut).length}</span>
              </div>
              <div className="space-y-2">
                {missions.filter(m => m.statut === statut).map(m => (
                  <div key={m.id} className="card p-3 cursor-pointer hover:border-ds-border2" onClick={() => { setEditing(m); setShowForm(true) }}>
                    <div className="text-xs font-bold text-ds-text mb-1 truncate">{m.titre || m.client}</div>
                    <div className="text-[10px] text-ds-text3 mb-2">{m.client}</div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-ds-teal font-semibold">{fmt(m.tjm * m.jours)}€</span>
                      <span className="text-ds-text3">{m.tjm}€/j</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-ds-bg/85 backdrop-blur-md z-[100] flex items-center justify-center p-4" onClick={() => { setShowForm(false); setEditing(null) }}>
          <div className="w-full max-w-lg bg-ds-bg2 border border-ds-border2 rounded-ds-xl p-6 shadow-[0_32px_80px_rgba(0,0,0,.7)] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-base font-bold text-ds-text mb-4">{editing ? '✏️ Modifier la mission' : '🚀 Nouvelle mission'}</h2>
            <MissionForm initial={editing} onSave={saveMission} onClose={() => { setShowForm(false); setEditing(null) }} />
          </div>
        </div>
      )}
    </div>
  )
}

function MissionForm({ initial, onSave, onClose }: { initial: Mission | null; onSave: (m: Mission) => void; onClose: () => void }) {
  const [form, setForm] = useState<Mission>(initial || {
    id: uid(), titre: '', client: '', tjm: 800, jours: 20, debut: today(), fin: '', statut: 'À venir', secteur: '', notes: ''
  })
  const f = (k: keyof Mission) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(v => ({ ...v, [k]: e.target.value }))
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="form-label">Titre</label><input className="inp" value={form.titre} onChange={f('titre')} placeholder="Ex: Data Architect Senior" /></div>
        <div><label className="form-label">Client *</label><input className="inp" value={form.client} onChange={f('client')} placeholder="Ex: BNP Paribas" /></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="form-label">TJM (€/j)</label><input className="inp" type="number" value={form.tjm} onChange={f('tjm')} /></div>
        <div><label className="form-label">Nb jours</label><input className="inp" type="number" value={form.jours} onChange={f('jours')} /></div>
        <div><label className="form-label">Statut</label>
          <select className="inp" value={form.statut} onChange={f('statut')}>
            {['En cours', 'À venir', 'En pause', 'Terminée'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="form-label">Début</label><input className="inp" type="date" value={form.debut} onChange={f('debut')} /></div>
        <div><label className="form-label">Fin</label><input className="inp" type="date" value={form.fin} onChange={f('fin')} /></div>
      </div>
      <div><label className="form-label">Secteur</label>
        <select className="inp" value={form.secteur} onChange={f('secteur')}>
          <option value="">—</option>
          {['Finance / Banque', 'Assurance', 'Tech / ESN', 'Energie', 'Retail', 'Santé', 'Telecom', 'Autre'].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div><label className="form-label">Notes</label><textarea className="inp" rows={3} value={form.notes} onChange={f('notes')} placeholder="Description, livrables..." /></div>
      <div className="flex gap-3 mt-2">
        <button onClick={onClose} className="btn-secondary flex-1">Annuler</button>
        <button onClick={() => { if (!form.client.trim()) return; onSave(form) }}
          className="flex-1 py-2.5 rounded-ds-sm text-sm font-semibold text-white bg-gradient-to-r from-ds-blue to-ds-violet hover:opacity-90">
          {initial ? 'Enregistrer' : 'Créer'}
        </button>
      </div>
      <p className="text-right text-xs text-ds-text3">CA estimé : <strong className="text-ds-teal">{fmt(form.tjm * form.jours)}€</strong></p>
    </div>
  )
}
