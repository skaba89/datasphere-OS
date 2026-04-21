'use client'
import { useEffect, useState } from 'react'
import { Plus, Check, Trash2, Bell, AlertCircle } from 'lucide-react'
import { cn, formatDate, uid, today } from '@/lib/utils'

interface Rappel { id: string; texte: string; date: string; priorite: 'haute' | 'normale' | 'basse'; done: boolean; mission: string }
function load<T>(k: string, d: T): T { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d } catch { return d } }
function save(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }

const PRIO_STYLES = { haute: 'text-ds-rose border-ds-rose/30 bg-ds-rose/8', normale: 'text-ds-amber border-ds-amber/30 bg-ds-amber/8', basse: 'text-ds-text3 border-ds-border bg-ds-bg3' }

export default function RappelsPage() {
  const [rappels,  setRappels]  = useState<Rappel[]>([])
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    const s = load<{ rappels?: Rappel[] }>('datasphere_os_v1', {})
    setRappels(s.rappels || [])
    document.title = 'Rappels — DataSphere OS'
  }, [])

  function persist(r: Rappel[]) {
    const s = load<Record<string, unknown>>('datasphere_os_v1', {})
    save('datasphere_os_v1', { ...s, rappels: r })
    setRappels(r)
  }

  const t = today()
  const urgent  = rappels.filter(r => !r.done && r.date <= t)
  const aVenir  = rappels.filter(r => !r.done && r.date > t)
  const termines= rappels.filter(r => r.done)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-ds-text tracking-tight flex items-center gap-2"><Bell size={18} /> Rappels</h1>
          <p className="text-sm text-ds-text3 mt-0.5">{urgent.length} urgent{urgent.length !== 1 ? 's' : ''} · {aVenir.length} à venir</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-ds-sm text-xs font-semibold text-white bg-gradient-to-r from-ds-blue to-ds-violet hover:opacity-90">
          <Plus size={13} /> Nouveau rappel
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Urgents', value: urgent.length, color: urgent.length > 0 ? 'text-ds-rose' : 'text-ds-text3' },
          { label: 'À venir', value: aVenir.length, color: 'text-ds-amber' },
          { label: 'Terminés', value: termines.length, color: 'text-ds-green' },
        ].map(k => (
          <div key={k.label} className="card py-3 px-4">
            <div className="text-[10px] font-bold uppercase tracking-wide text-ds-text3 mb-1">{k.label}</div>
            <div className={cn('text-xl font-extrabold', k.color)}>{k.value}</div>
          </div>
        ))}
      </div>

      {urgent.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-3 bg-ds-rose/8 border border-ds-rose/25 rounded-ds text-sm text-ds-rose">
          <AlertCircle size={14} /> <strong>{urgent.length}</strong> rappel{urgent.length > 1 ? 's' : ''} en retard ou dû aujourd'hui
        </div>
      )}

      {[{ title: '🔴 Urgents / Aujourd\'hui', items: urgent }, { title: '📅 À venir', items: aVenir }, { title: '✅ Terminés', items: termines }].map(group => (
        group.items.length > 0 && (
          <div key={group.title}>
            <h2 className="text-xs font-bold text-ds-text3 uppercase tracking-wider mb-2">{group.title}</h2>
            <div className="space-y-2">
              {group.items.map(r => (
                <div key={r.id} className={cn('card flex items-center gap-3 hover:border-ds-border2', r.done && 'opacity-50')}>
                  <button onClick={() => persist(rappels.map(x => x.id === r.id ? { ...x, done: !x.done } : x))}
                    className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                      r.done ? 'bg-ds-green border-ds-green text-white' : 'border-ds-border2 hover:border-ds-green')}>
                    {r.done && <Check size={10} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className={cn('text-sm font-medium truncate', r.done ? 'line-through text-ds-text3' : 'text-ds-text')}>{r.texte}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-ds-text3">{formatDate(r.date)}</span>
                      {r.mission && <span className="text-[10px] text-ds-blue2">{r.mission}</span>}
                    </div>
                  </div>
                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', PRIO_STYLES[r.priorite])}>{r.priorite}</span>
                  <button onClick={() => persist(rappels.filter(x => x.id !== r.id))} className="p-1.5 text-ds-text3 hover:text-ds-rose"><Trash2 size={12} /></button>
                </div>
              ))}
            </div>
          </div>
        )
      ))}

      {rappels.length === 0 && (
        <div className="text-center py-16 text-ds-text3">
          <div className="text-4xl mb-3">🔔</div>
          <p className="text-sm mb-3">Aucun rappel configuré.</p>
          <button onClick={() => setShowForm(true)} className="text-xs text-ds-blue2 hover:underline">Créer un rappel →</button>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-ds-bg/85 backdrop-blur-md z-[100] flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md bg-ds-bg2 border border-ds-border2 rounded-ds-xl p-6 shadow-[0_32px_80px_rgba(0,0,0,.7)]" onClick={e => e.stopPropagation()}>
            <h2 className="text-sm font-bold text-ds-text mb-4">🔔 Nouveau rappel</h2>
            <RappelForm onSave={r => { persist([...rappels, r]); setShowForm(false) }} onClose={() => setShowForm(false)} />
          </div>
        </div>
      )}
    </div>
  )
}

function RappelForm({ onSave, onClose }: { onSave: (r: Rappel) => void; onClose: () => void }) {
  const [form, setForm] = useState({ texte: '', date: today(), priorite: 'normale' as Rappel['priorite'], mission: '' })
  return (
    <div className="space-y-3">
      <div><label className="form-label">Rappel *</label><input className="inp" value={form.texte} onChange={e => setForm(v => ({ ...v, texte: e.target.value }))} placeholder="Ex: Relancer BNP Paribas pour retour offre..." /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="form-label">Date</label><input className="inp" type="date" value={form.date} onChange={e => setForm(v => ({ ...v, date: e.target.value }))} /></div>
        <div><label className="form-label">Priorité</label>
          <select className="inp" value={form.priorite} onChange={e => setForm(v => ({ ...v, priorite: e.target.value as Rappel['priorite'] }))}>
            <option value="haute">🔴 Haute</option><option value="normale">🟡 Normale</option><option value="basse">⚪ Basse</option>
          </select>
        </div>
      </div>
      <div><label className="form-label">Mission liée (optionnel)</label><input className="inp" value={form.mission} onChange={e => setForm(v => ({ ...v, mission: e.target.value }))} placeholder="Ex: BNP Paribas - Data Architect" /></div>
      <div className="flex gap-3">
        <button onClick={onClose} className="btn-secondary flex-1">Annuler</button>
        <button onClick={() => { if (!form.texte.trim()) return; onSave({ id: uid(), ...form, done: false }) }}
          className="flex-1 py-2.5 rounded-ds-sm text-sm font-semibold text-white bg-gradient-to-r from-ds-blue to-ds-violet hover:opacity-90">
          Créer le rappel
        </button>
      </div>
    </div>
  )
}
