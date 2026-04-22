'use client'
import { useEffect, useState } from 'react'
import { Plus, Trash2, Target, TrendingUp, Edit2, Check } from 'lucide-react'
import { cn, fmt, uid } from '@/lib/utils'

interface KR { id: string; titre: string; cible: number; actuel: number; unite: string }
interface OKR { id: string; titre: string; periode: string; krs: KR[] }

function load<T>(k: string, d: T): T {
  try { const v = typeof window !== 'undefined' && localStorage.getItem(k); return v ? JSON.parse(v) : d }
  catch { return d }
}
function save(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }

const PERIODES = ['Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026', 'Annuel 2026']

export default function OKRsPage() {
  const [okrs,     setOkrs]     = useState<OKR[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editOkr,  setEditOkr]  = useState<OKR | null>(null)
  const [editingKR, setEditingKR] = useState<{okrId:string;krId:string;val:string} | null>(null)

  useEffect(() => {
    document.title = 'OKRs — DataSphere OS'
    const s = load<{ okrs?: OKR[] }>('datasphere_os_v1', {})
    if ((s.okrs || []).length === 0) {
      // Exemples par défaut
      setOkrs([{
        id: uid(), titre: 'Atteindre un CA de 120k EUR en 2026', periode: 'Annuel 2026',
        krs: [
          { id: uid(), titre: 'CA factured', cible: 120000, actuel: 0, unite: 'EUR' },
          { id: uid(), titre: 'Nb missions signees', cible: 6, actuel: 0, unite: 'missions' },
          { id: uid(), titre: 'TJM moyen', cible: 900, actuel: 800, unite: 'EUR/j' },
        ]
      }, {
        id: uid(), titre: 'Developper le pipeline commercial', periode: 'Q2 2026',
        krs: [
          { id: uid(), titre: 'Candidatures envoyees', cible: 40, actuel: 0, unite: '' },
          { id: uid(), titre: 'Entretiens obtenus', cible: 8, actuel: 0, unite: '' },
          { id: uid(), titre: 'Contacts LinkedIn ajoutes', cible: 50, actuel: 0, unite: '' },
        ]
      }])
    } else {
      setOkrs(s.okrs || [])
    }
  }, [])

  function persist(o: OKR[]) {
    const s = load<Record<string, unknown>>('datasphere_os_v1', {})
    save('datasphere_os_v1', { ...s, okrs: o })
    setOkrs(o)
  }

  function deleteOkr(id: string) {
    if (!confirm('Supprimer cet OKR ?')) return
    persist(okrs.filter(o => o.id !== id))
  }

  function updateKRValue(okrId: string, krId: string, val: number) {
    persist(okrs.map(o => o.id !== okrId ? o : {
      ...o, krs: o.krs.map(kr => kr.id !== krId ? kr : { ...kr, actuel: val })
    }))
    setEditingKR(null)
  }

  function saveOkr(okr: OKR) {
    persist(editOkr ? okrs.map(o => o.id === okr.id ? okr : o) : [...okrs, okr])
    setShowForm(false); setEditOkr(null)
  }

  const globalProgress = okrs.length === 0 ? 0 : Math.round(
    okrs.reduce((sum, o) => {
      const pct = o.krs.length === 0 ? 0 : o.krs.reduce((s, kr) =>
        s + Math.min(100, kr.cible > 0 ? Math.round(kr.actuel / kr.cible * 100) : 0), 0) / o.krs.length
      return sum + pct
    }, 0) / okrs.length
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-ds-text tracking-tight flex items-center gap-2">
            <Target size={20} className="text-ds-blue2" /> OKRs
          </h1>
          <p className="text-sm text-ds-text3 mt-0.5">Objectifs et resultats cles — {okrs.length} OKR{okrs.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { setEditOkr(null); setShowForm(true) }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] text-xs font-semibold text-white bg-gradient-to-r from-ds-blue to-ds-violet hover:opacity-90">
          <Plus size={13} /> Nouvel OKR
        </button>
      </div>

      {/* Progress global */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold text-ds-text flex items-center gap-2"><TrendingUp size={14} className="text-ds-teal" /> Progression globale</span>
          <span className={cn('text-xl font-extrabold', globalProgress >= 75 ? 'text-ds-green' : globalProgress >= 50 ? 'text-ds-teal' : globalProgress >= 25 ? 'text-ds-amber' : 'text-ds-text3')}>
            {globalProgress}%
          </span>
        </div>
        <div className="h-3 bg-ds-bg4 rounded-full overflow-hidden">
          <div className={cn('h-full rounded-full transition-all duration-700',
            globalProgress >= 75 ? 'bg-gradient-to-r from-ds-green to-ds-teal' :
            globalProgress >= 50 ? 'bg-gradient-to-r from-ds-teal to-ds-blue' :
            'bg-gradient-to-r from-ds-blue to-ds-violet')}
            style={{ width: `${globalProgress}%` }} />
        </div>
      </div>

      {/* Liste OKRs */}
      <div className="space-y-4">
        {okrs.map(okr => {
          const okrPct = okr.krs.length === 0 ? 0 : Math.round(okr.krs.reduce((s, kr) =>
            s + Math.min(100, kr.cible > 0 ? Math.round(kr.actuel / kr.cible * 100) : 0), 0) / okr.krs.length)
          return (
            <div key={okr.id} className="card">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-ds-text">{okr.titre}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-ds-blue/10 text-ds-blue2 border border-ds-blue/20">{okr.periode}</span>
                    <span className={cn('text-[10px] font-bold', okrPct >= 75 ? 'text-ds-green' : okrPct >= 50 ? 'text-ds-teal' : 'text-ds-amber')}>{okrPct}%</span>
                  </div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button onClick={() => { setEditOkr(okr); setShowForm(true) }} className="p-1.5 text-ds-text3 hover:text-ds-blue2 transition-colors"><Edit2 size={13} /></button>
                  <button onClick={() => deleteOkr(okr.id)} className="p-1.5 text-ds-text3 hover:text-ds-rose transition-colors"><Trash2 size={13} /></button>
                </div>
              </div>

              {/* Barre OKR */}
              <div className="h-1.5 bg-ds-bg4 rounded-full overflow-hidden mb-4">
                <div className={cn('h-full rounded-full transition-all', okrPct >= 75 ? 'bg-ds-green' : okrPct >= 50 ? 'bg-ds-teal' : 'bg-ds-blue')}
                  style={{ width: `${okrPct}%` }} />
              </div>

              {/* Key Results */}
              <div className="space-y-3">
                {okr.krs.map(kr => {
                  const pct = kr.cible > 0 ? Math.min(100, Math.round(kr.actuel / kr.cible * 100)) : 0
                  const isEditing = editingKR?.okrId === okr.id && editingKR?.krId === kr.id
                  return (
                    <div key={kr.id} className="flex items-center gap-3">
                      <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                        pct >= 100 ? 'bg-ds-green border-ds-green' : 'border-ds-border2')}>
                        {pct >= 100 && <Check size={10} className="text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-ds-text2 truncate">{kr.titre}</span>
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <input type="number" className="w-20 bg-ds-bg border border-ds-blue rounded px-2 py-0.5 text-xs text-ds-text"
                                value={editingKR.val}
                                onChange={e => setEditingKR(prev => prev ? { ...prev, val: e.target.value } : null)}
                                onKeyDown={e => { if (e.key === 'Enter') updateKRValue(okr.id, kr.id, parseFloat(editingKR.val)||0) }}
                                autoFocus />
                              <button onClick={() => updateKRValue(okr.id, kr.id, parseFloat(editingKR.val)||0)}
                                className="text-[10px] px-2 py-0.5 bg-ds-blue text-white rounded">OK</button>
                            </div>
                          ) : (
                            <button onClick={() => setEditingKR({ okrId: okr.id, krId: kr.id, val: String(kr.actuel) })}
                              className="text-[10px] text-ds-text3 hover:text-ds-blue2 transition-colors whitespace-nowrap">
                              {kr.actuel}{kr.unite && ' '+kr.unite} / {kr.cible}{kr.unite && ' '+kr.unite} · <span className={cn('font-bold', pct >= 100 ? 'text-ds-green' : pct >= 60 ? 'text-ds-teal' : 'text-ds-amber')}>{pct}%</span>
                            </button>
                          )}
                        </div>
                        <div className="h-1.5 bg-ds-bg4 rounded-full overflow-hidden">
                          <div className={cn('h-full rounded-full transition-all duration-500',
                            pct >= 100 ? 'bg-ds-green' : pct >= 60 ? 'bg-ds-teal' : 'bg-gradient-to-r from-ds-blue to-ds-violet')}
                            style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal formulaire */}
      {showForm && (
        <OKRForm initial={editOkr} onSave={saveOkr} onClose={() => { setShowForm(false); setEditOkr(null) }} />
      )}
    </div>
  )
}

function OKRForm({ initial, onSave, onClose }: { initial: OKR | null; onSave: (o: OKR) => void; onClose: () => void }) {
  const [titre,   setTitre]   = useState(initial?.titre || '')
  const [periode, setPeriode] = useState(initial?.periode || 'Q2 2026')
  const [krs,     setKrs]     = useState<KR[]>(initial?.krs || [{ id: uid(), titre: '', cible: 0, actuel: 0, unite: '' }])

  function addKR() { setKrs(prev => [...prev, { id: uid(), titre: '', cible: 0, actuel: 0, unite: '' }]) }
  function removeKR(id: string) { setKrs(prev => prev.filter(k => k.id !== id)) }
  function updateKR(id: string, field: keyof KR, value: string | number) {
    setKrs(prev => prev.map(k => k.id === id ? { ...k, [field]: value } : k))
  }

  function handleSave() {
    if (!titre.trim()) return
    onSave({ id: initial?.id || uid(), titre: titre.trim(), periode, krs: krs.filter(k => k.titre.trim()) })
  }

  return (
    <div className="fixed inset-0 bg-ds-bg/85 backdrop-blur-md z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-ds-bg2 border border-ds-border2 rounded-[20px] p-6 shadow-[0_32px_80px_rgba(0,0,0,.7)] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="text-base font-bold text-ds-text mb-4">{initial ? 'Modifier l OKR' : 'Nouvel OKR'}</h2>
        <div className="space-y-3">
          <div>
            <label className="form-label">Objectif principal</label>
            <input className="inp" value={titre} onChange={e => setTitre(e.target.value)} placeholder="Ex: Atteindre 120k EUR de CA" />
          </div>
          <div>
            <label className="form-label">Periode</label>
            <select className="inp" value={periode} onChange={e => setPeriode(e.target.value)}>
              {PERIODES.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="form-label mb-0">Key Results</label>
              <button onClick={addKR} className="text-[10px] text-ds-blue2 hover:underline">+ Ajouter</button>
            </div>
            <div className="space-y-2">
              {krs.map((kr, i) => (
                <div key={kr.id} className="flex gap-2 items-center">
                  <span className="text-[10px] text-ds-text3 w-4 flex-shrink-0">{i+1}.</span>
                  <input className="inp flex-1 text-xs" placeholder="Titre du KR" value={kr.titre} onChange={e => updateKR(kr.id, 'titre', e.target.value)} />
                  <input className="inp w-20 text-xs" type="number" placeholder="Cible" value={kr.cible || ''} onChange={e => updateKR(kr.id, 'cible', parseFloat(e.target.value)||0)} />
                  <input className="inp w-16 text-xs" placeholder="Unite" value={kr.unite} onChange={e => updateKR(kr.id, 'unite', e.target.value)} />
                  <button onClick={() => removeKR(kr.id)} className="text-ds-text3 hover:text-ds-rose"><Trash2 size={12} /></button>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-3 mt-2">
            <button onClick={onClose} className="btn-secondary flex-1">Annuler</button>
            <button onClick={handleSave} className="flex-1 py-2.5 rounded-[9px] text-sm font-semibold text-white bg-gradient-to-r from-ds-blue to-ds-violet hover:opacity-90">
              {initial ? 'Enregistrer' : 'Creer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
