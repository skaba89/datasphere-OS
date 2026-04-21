'use client'
import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, CheckCircle, Clock, AlertCircle, Download } from 'lucide-react'
import { cn, fmt, formatDate, uid, today } from '@/lib/utils'

type StatutF = 'Brouillon' | 'En attente' | 'Payée' | 'En retard'
interface Facture {
  id: string; client: string; objet: string; montant: number; tjm: number; jours: number
  date: string; statut: StatutF; numero: string; tva: number; emailClient: string
}

function load<T>(k: string, d: T): T { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d } catch { return d } }
function save(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }

const STATUT_STYLES: Record<StatutF, string> = {
  Brouillon:   'bg-ds-text3/10 text-ds-text3 border-ds-text3/20',
  'En attente':'bg-ds-amber/10 text-ds-amber border-ds-amber/20',
  Payée:       'bg-ds-green/10 text-ds-green border-ds-green/20',
  'En retard': 'bg-ds-rose/10 text-ds-rose border-ds-rose/20',
}

export default function FacturationPage() {
  const [factures, setFactures] = useState<Facture[]>([])
  const [filter, setFilter]     = useState<StatutF | 'Tous'>('Tous')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState<Facture | null>(null)

  useEffect(() => {
    const s = load<{ factures?: Facture[] }>('datasphere_os_v1', {})
    setFactures(s.factures || [])
    document.title = 'Facturation — DataSphere OS'
  }, [])

  function persist(f: Facture[]) {
    const s = load<Record<string, unknown>>('datasphere_os_v1', {})
    save('datasphere_os_v1', { ...s, factures: f })
    setFactures(f)
  }

  function saveFacture(f: Facture) {
    persist(editing ? factures.map(x => x.id === f.id ? f : x) : [...factures, f])
    setShowForm(false); setEditing(null)
  }

  function markPaid(id: string) {
    persist(factures.map(f => f.id === id ? { ...f, statut: 'Payée' as StatutF } : f))
  }

  function deleteFacture(id: string) {
    if (!confirm('Supprimer cette facture ?')) return
    persist(factures.filter(f => f.id !== id))
  }

  const year  = new Date().getFullYear()
  const ca    = factures.filter(f => f.statut === 'Payée' && (f.date || '').startsWith(String(year))).reduce((s, f) => s + f.montant, 0)
  const att   = factures.filter(f => f.statut === 'En attente').reduce((s, f) => s + f.montant, 0)
  const retard= factures.filter(f => f.statut === 'En retard').length
  const filtered = filter === 'Tous' ? factures : factures.filter(f => f.statut === filter)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-ds-text tracking-tight">Facturation</h1>
          <p className="text-sm text-ds-text3 mt-0.5">{factures.length} facture{factures.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true) }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-ds-sm text-xs font-semibold text-white bg-gradient-to-r from-ds-blue to-ds-violet hover:opacity-90">
          <Plus size={13} /> Nouvelle facture
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: `CA ${year}`,        value: fmt(ca) + '€',    color: 'text-ds-teal',    icon: <CheckCircle size={14} /> },
          { label: 'En attente',        value: fmt(att) + '€',   color: 'text-ds-amber',   icon: <Clock size={14} /> },
          { label: 'En retard',         value: retard,            color: retard > 0 ? 'text-ds-rose' : 'text-ds-text3', icon: <AlertCircle size={14} /> },
          { label: 'Total factures',    value: factures.length,   color: 'text-ds-blue2',   icon: <Download size={14} /> },
        ].map(k => (
          <div key={k.label} className="card py-3 px-4">
            <div className="flex items-center justify-between mb-1">
              <div className="text-[10px] font-bold uppercase tracking-wide text-ds-text3">{k.label}</div>
              <span className={cn('opacity-30', k.color)}>{k.icon}</span>
            </div>
            <div className={cn('text-xl font-extrabold', k.color)}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {(['Tous', 'En attente', 'Payée', 'En retard', 'Brouillon'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
              filter === s ? 'bg-ds-blue/15 text-ds-blue2 border-ds-blue/40' : 'bg-ds-bg3 text-ds-text3 border-ds-border hover:border-ds-border2')}>
            {s}
          </button>
        ))}
      </div>

      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-ds-text3">
            <div className="text-4xl mb-3">💶</div>
            <p className="text-sm mb-3">Aucune facture.</p>
            <button onClick={() => { setEditing(null); setShowForm(true) }} className="text-xs text-ds-blue2 hover:underline">Créer une facture →</button>
          </div>
        ) : filtered.map(f => {
          const ttc = f.montant * (1 + (f.tva || 20) / 100)
          return (
            <div key={f.id} className="card hover:border-ds-border2">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono text-ds-text3">{f.numero}</span>
                    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', STATUT_STYLES[f.statut])}>{f.statut}</span>
                  </div>
                  <div className="text-sm font-bold text-ds-text truncate">{f.client}</div>
                  <div className="text-[11px] text-ds-text3 mt-0.5">{f.objet}</div>
                  <div className="text-[11px] text-ds-text3 mt-1">{formatDate(f.date)}{f.tjm ? ` · ${f.tjm}€/j × ${f.jours}j` : ''}</div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <div className="text-base font-extrabold text-ds-text">{fmt(f.montant)}€ HT</div>
                    <div className="text-[10px] text-ds-text3">{fmt(ttc)}€ TTC</div>
                  </div>
                  <div className="flex flex-col gap-1">
                    {f.statut !== 'Payée' && (
                      <button onClick={() => markPaid(f.id)} className="text-[10px] font-bold px-2 py-1 rounded bg-ds-green/10 text-ds-green border border-ds-green/20 hover:bg-ds-green/20">✓ Payée</button>
                    )}
                    <div className="flex gap-1">
                      <button onClick={() => { setEditing(f); setShowForm(true) }} className="p-1.5 text-ds-text3 hover:text-ds-blue2"><Edit2 size={12} /></button>
                      <button onClick={() => deleteFacture(f.id)} className="p-1.5 text-ds-text3 hover:text-ds-rose"><Trash2 size={12} /></button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-ds-bg/85 backdrop-blur-md z-[100] flex items-center justify-center p-4" onClick={() => { setShowForm(false); setEditing(null) }}>
          <div className="w-full max-w-lg bg-ds-bg2 border border-ds-border2 rounded-ds-xl p-6 shadow-[0_32px_80px_rgba(0,0,0,.7)] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-base font-bold text-ds-text mb-4">{editing ? '✏️ Modifier la facture' : '💶 Nouvelle facture'}</h2>
            <FactureForm initial={editing} onSave={saveFacture} onClose={() => { setShowForm(false); setEditing(null) }} />
          </div>
        </div>
      )}
    </div>
  )
}

function FactureForm({ initial, onSave, onClose }: { initial: Facture | null; onSave: (f: Facture) => void; onClose: () => void }) {
  const lastNum = parseInt(load<{ factures?: Facture[] }>('datasphere_os_v1', {})?.factures?.slice(-1)[0]?.numero?.replace(/\D/g, '') || '0') + 1
  const [form, setForm] = useState<Facture>(initial || {
    id: uid(), client: '', objet: '', montant: 0, tjm: 800, jours: 20, date: today(),
    statut: 'En attente', numero: `FAC-${new Date().getFullYear()}-${String(lastNum).padStart(3,'0')}`, tva: 20, emailClient: ''
  })
  const f = (k: keyof Facture) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const val = ['montant','tjm','jours','tva'].includes(k) ? Number(e.target.value) : e.target.value
    setForm(v => {
      const upd = { ...v, [k]: val }
      if (k === 'tjm' || k === 'jours') upd.montant = upd.tjm * upd.jours
      return upd
    })
  }
  const ttc = form.montant * (1 + form.tva / 100)
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="form-label">Client *</label><input className="inp" value={form.client} onChange={f('client')} placeholder="Ex: BNP Paribas" /></div>
        <div><label className="form-label">N° Facture</label><input className="inp" value={form.numero} onChange={f('numero')} /></div>
      </div>
      <div><label className="form-label">Objet</label><input className="inp" value={form.objet} onChange={f('objet')} placeholder="Ex: Prestation Data Architect — Janvier 2026" /></div>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="form-label">TJM (€/j)</label><input className="inp" type="number" value={form.tjm} onChange={f('tjm')} /></div>
        <div><label className="form-label">Nb jours</label><input className="inp" type="number" value={form.jours} onChange={f('jours')} /></div>
        <div><label className="form-label">TVA (%)</label><input className="inp" type="number" value={form.tva} onChange={f('tva')} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="form-label">Date</label><input className="inp" type="date" value={form.date} onChange={f('date')} /></div>
        <div><label className="form-label">Statut</label>
          <select className="inp" value={form.statut} onChange={f('statut')}>
            {['Brouillon','En attente','Payée','En retard'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div><label className="form-label">Email client</label><input className="inp" type="email" value={form.emailClient} onChange={f('emailClient')} placeholder="contact@client.com" /></div>
      <div className="bg-ds-bg3 rounded-ds-sm p-3 text-xs space-y-1">
        <div className="flex justify-between"><span className="text-ds-text3">Montant HT</span><span className="text-ds-text font-bold">{fmt(form.montant)}€</span></div>
        <div className="flex justify-between"><span className="text-ds-text3">TVA {form.tva}%</span><span className="text-ds-text">{fmt(form.montant * form.tva / 100)}€</span></div>
        <div className="flex justify-between border-t border-ds-border pt-1"><span className="text-ds-text2 font-bold">TOTAL TTC</span><span className="text-ds-teal font-extrabold">{fmt(ttc)}€</span></div>
      </div>
      <div className="flex gap-3">
        <button onClick={onClose} className="btn-secondary flex-1">Annuler</button>
        <button onClick={() => { if (!form.client.trim()) return; onSave(form) }}
          className="flex-1 py-2.5 rounded-ds-sm text-sm font-semibold text-white bg-gradient-to-r from-ds-blue to-ds-violet hover:opacity-90">
          {initial ? 'Enregistrer' : 'Créer la facture'}
        </button>
      </div>
    </div>
  )
}
