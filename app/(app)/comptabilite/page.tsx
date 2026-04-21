'use client'
import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { cn, fmt, today, uid } from '@/lib/utils'
import { useAI } from '@/hooks/useAI'

interface Charge { id: string; libelle: string; categorie: string; montant: number; date: string; tvaDeductible: number }
function load<T>(k: string, d: T): T { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d } catch { return d } }
function save(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }

export default function ComptabilitePage() {
  const [charges, setCharges] = useState<Charge[]>([])
  const [view, setView]       = useState<'dashboard' | 'charges' | 'bilan'>('dashboard')
  const [showForm, setShowForm] = useState(false)
  const [aiTips, setAiTips]   = useState('')
  const { generate, loading }  = useAI()

  const year = new Date().getFullYear()

  useEffect(() => {
    const s = load<{ comptabilite?: { charges?: Charge[] } }>('datasphere_os_v1', {})
    setCharges(s.comptabilite?.charges || [])
    document.title = 'Comptabilité — DataSphere OS'
  }, [])

  function persistCharges(c: Charge[]) {
    const s = load<Record<string, unknown>>('datasphere_os_v1', {})
    const compta = (s.comptabilite as Record<string, unknown>) || {}
    save('datasphere_os_v1', { ...s, comptabilite: { ...compta, charges: c } })
    setCharges(c)
  }

  function addCharge(c: Charge) { persistCharges([...charges, c]); setShowForm(false) }
  function deleteCharge(id: string) { persistCharges(charges.filter(c => c.id !== id)) }

  const factures = load<{ factures?: { statut: string; montant: number; date: string; tva?: number; tvaExonere?: boolean }[] }>('datasphere_os_v1', {}).factures || []
  const payees   = factures.filter(f => f.statut === 'Payée' && (f.date || '').startsWith(String(year)))
  const ca       = payees.reduce((s, f) => s + (Number(f.montant) || 0), 0)
  const tvaC     = payees.filter(f => !f.tvaExonere).reduce((s, f) => s + Math.round(Number(f.montant) * 0.2 / 1.2), 0)
  const tvaD     = charges.reduce((s, c) => s + (c.tvaDeductible || 0), 0)
  const totalCharges = charges.filter(c => (c.date || '').startsWith(String(year))).reduce((s, c) => s + c.montant, 0)
  const urssaf   = Math.round(ca * 0.212)
  const cfe      = 500
  const retraite = Math.round(ca * 0.06)
  const net      = ca - totalCharges - urssaf - cfe - retraite - (tvaC - tvaD)
  const seuil    = 77700
  const pctSeuil = Math.min(120, Math.round(ca / seuil * 100))
  const seuilCol = pctSeuil >= 90 ? 'text-ds-rose' : pctSeuil >= 70 ? 'text-ds-amber' : 'text-ds-green'

  async function getAnalyseIA() {
    const cv = load<{ cv?: { nom?: string; titre?: string } }>('datasphere_os_v1', {}).cv || {}
    const result = await generate(`Expert-comptable freelance France. Analyse concise (200 mots) :\nCA ${year}: ${fmt(ca)}€ | Charges: ${fmt(totalCharges)}€ | URSSAF: ${fmt(urssaf)}€ | Net estimé: ${fmt(net)}€ | Seuil micro: ${pctSeuil}%\nProfil: ${cv.nom}, ${cv.titre}\nDonne: 1 situation (2 lignes) 2. Top 3 optimisations fiscales 3. Risques`, 400)
    setAiTips(result || '')
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-ds-text tracking-tight">Comptabilité</h1>
          <p className="text-sm text-ds-text3 mt-0.5">Année {year} · Estimation fiscale</p>
        </div>
      </div>

      {/* Alerte seuil */}
      {pctSeuil >= 70 && (
        <div className={cn('flex items-center gap-3 px-4 py-3 rounded-ds border text-sm',
          pctSeuil >= 90 ? 'bg-ds-rose/8 border-ds-rose/25 text-ds-rose' : 'bg-ds-amber/8 border-ds-amber/25 text-ds-amber')}>
          {pctSeuil >= 90 ? '🚨' : '⚠️'} Seuil micro-BIC : <strong>{pctSeuil}%</strong> atteint ({fmt(ca)}€ / {fmt(seuil)}€)
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {(['dashboard','charges','bilan'] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
            className={cn('px-4 py-2 rounded-ds-sm text-sm font-semibold border transition-all capitalize',
              view === v ? 'bg-ds-blue/15 text-ds-blue2 border-ds-blue/40' : 'bg-ds-bg3 text-ds-text3 border-ds-border')}>
            {v === 'dashboard' ? '📊 Tableau de bord' : v === 'charges' ? '💸 Charges' : '📋 Bilan'}
          </button>
        ))}
      </div>

      {view === 'dashboard' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { label: 'CA ' + year,           value: fmt(ca) + '€',      color: 'text-ds-teal' },
              { label: 'URSSAF estimé (21.2%)', value: fmt(urssaf) + '€', color: 'text-ds-rose' },
              { label: 'Charges déductibles',  value: fmt(totalCharges) + '€', color: 'text-ds-amber' },
              { label: 'TVA nette à reverser', value: fmt(tvaC - tvaD) + '€', color: 'text-ds-blue2' },
              { label: 'CFE + Retraite',       value: fmt(cfe + retraite) + '€', color: 'text-ds-violet2' },
              { label: 'Résultat net estimé',  value: fmt(net) + '€',     color: net >= 0 ? 'text-ds-green' : 'text-ds-rose' },
            ].map(k => (
              <div key={k.label} className="card py-3 px-4">
                <div className="text-[10px] font-bold uppercase tracking-wide text-ds-text3 mb-1">{k.label}</div>
                <div className={cn('text-xl font-extrabold', k.color)}>{k.value}</div>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-ds-text">Seuil micro-BIC {year}</span>
              <span className={cn('text-xs font-bold', seuilCol)}>{pctSeuil}% ({fmt(ca)}€ / {fmt(seuil)}€)</span>
            </div>
            <div className="h-2 bg-ds-bg4 rounded-full overflow-hidden">
              <div className={cn('h-full rounded-full transition-all', pctSeuil >= 90 ? 'bg-ds-rose' : pctSeuil >= 70 ? 'bg-ds-amber' : 'bg-ds-green')} style={{ width: `${Math.min(100, pctSeuil)}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-ds-text3 mt-1"><span>0€</span><span className="text-ds-amber">⚠️ {fmt(seuil * 0.7)}€</span><span className="text-ds-rose">🚨 {fmt(seuil)}€</span></div>
          </div>
          {aiTips ? (
            <div className="card bg-ds-violet/5 border-ds-violet/20">
              <h3 className="text-xs font-bold text-ds-violet2 mb-2">🧠 Analyse fiscale IA</h3>
              <pre className="text-xs text-ds-text2 whitespace-pre-wrap font-sans leading-relaxed">{aiTips}</pre>
            </div>
          ) : (
            <button onClick={getAnalyseIA} disabled={loading}
              className="w-full py-2.5 rounded-ds-sm text-sm font-semibold border border-ds-violet/30 text-ds-violet2 bg-ds-violet/5 hover:bg-ds-violet/10 transition-all flex items-center justify-center gap-2">
              {loading ? <><span className="animate-spin">⟳</span> Analyse…</> : '🧠 Analyse fiscale IA'}
            </button>
          )}
        </>
      )}

      {view === 'charges' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-ds-text3">{charges.filter(c => (c.date||'').startsWith(String(year))).length} charge(s) · Total : <strong className="text-ds-rose">{fmt(totalCharges)}€</strong></span>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-ds-sm text-xs font-semibold text-white bg-gradient-to-r from-ds-blue to-ds-violet hover:opacity-90">
              <Plus size={12} /> Ajouter
            </button>
          </div>
          {charges.filter(c => (c.date||'').startsWith(String(year))).length === 0 ? (
            <div className="text-center py-12 text-ds-text3"><div className="text-3xl mb-2">💸</div><p className="text-sm">Aucune charge enregistrée pour {year}</p></div>
          ) : charges.filter(c => (c.date||'').startsWith(String(year))).map(c => (
            <div key={c.id} className="card flex items-center justify-between gap-4 hover:border-ds-border2">
              <div className="min-w-0"><div className="text-sm font-bold text-ds-text truncate">{c.libelle}</div><div className="text-[11px] text-ds-text3">{c.categorie}</div></div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right"><div className="text-sm font-extrabold text-ds-rose">-{fmt(c.montant)}€</div>{c.tvaDeductible > 0 && <div className="text-[10px] text-ds-green">TVA déd. {fmt(c.tvaDeductible)}€</div>}</div>
                <button onClick={() => deleteCharge(c.id)} className="p-1.5 text-ds-text3 hover:text-ds-rose"><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
          {showForm && (
            <div className="fixed inset-0 bg-ds-bg/85 backdrop-blur-md z-[100] flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
              <div className="w-full max-w-md bg-ds-bg2 border border-ds-border2 rounded-ds-xl p-6" onClick={e => e.stopPropagation()}>
                <h3 className="text-sm font-bold text-ds-text mb-4">💸 Nouvelle charge</h3>
                <ChargeForm onSave={addCharge} onClose={() => setShowForm(false)} />
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'bilan' && (
        <div className="card space-y-2">
          <h3 className="text-sm font-bold text-ds-text mb-3">📋 Bilan estimé {year}</h3>
          {[
            { label: 'CA facturé (payé)', val: '+' + fmt(ca) + '€', col: 'text-ds-teal' },
            { label: 'Charges déductibles', val: '-' + fmt(totalCharges) + '€', col: 'text-ds-rose' },
            { label: `URSSAF (21.2%)`, val: '-' + fmt(urssaf) + '€', col: 'text-ds-rose' },
            { label: 'CFE (estimation)', val: '-' + fmt(cfe) + '€', col: 'text-ds-rose' },
            { label: 'Retraite compl. (6%)', val: '-' + fmt(retraite) + '€', col: 'text-ds-rose' },
            { label: 'TVA nette reversée', val: '-' + fmt(tvaC - tvaD) + '€', col: 'text-ds-amber' },
          ].map(r => (
            <div key={r.label} className="flex justify-between items-center py-2 px-3 bg-ds-bg3 rounded-ds-sm">
              <span className="text-xs text-ds-text2">{r.label}</span>
              <span className={cn('text-xs font-bold', r.col)}>{r.val}</span>
            </div>
          ))}
          <div className={cn('flex justify-between items-center py-3 px-3 rounded-ds-sm border', net >= 0 ? 'bg-ds-green/8 border-ds-green/20' : 'bg-ds-rose/8 border-ds-rose/20')}>
            <span className="text-sm font-bold text-ds-text">Résultat net estimé</span>
            <span className={cn('text-xl font-extrabold', net >= 0 ? 'text-ds-green' : 'text-ds-rose')}>{fmt(net)}€</span>
          </div>
          <p className="text-[10px] text-ds-text3 text-center pt-1">⚠️ Estimation indicative — Consultez un expert-comptable</p>
        </div>
      )}
    </div>
  )
}

function ChargeForm({ onSave, onClose }: { onSave: (c: Charge) => void; onClose: () => void }) {
  const [form, setForm] = useState({ libelle: '', categorie: 'Logiciels/Abonnements', montant: '', tvaDeductible: '', date: today() })
  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(v => ({ ...v, [k]: e.target.value }))
  return (
    <div className="space-y-3">
      <div><label className="form-label">Libellé</label><input className="inp" value={form.libelle} onChange={f('libelle')} placeholder="Ex: Adobe CC, Billet SNCF..." /></div>
      <div><label className="form-label">Catégorie</label>
        <select className="inp" value={form.categorie} onChange={f('categorie')}>
          {['Matériel informatique','Logiciels/Abonnements','Télécom','Transport/Déplacements','Formation','Loyer bureau','Honoraires','Repas client','Autres'].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="form-label">Montant TTC (€)</label><input className="inp" type="number" value={form.montant} onChange={f('montant')} /></div>
        <div><label className="form-label">TVA déductible (€)</label><input className="inp" type="number" value={form.tvaDeductible} onChange={f('tvaDeductible')} /></div>
      </div>
      <div><label className="form-label">Date</label><input className="inp" type="date" value={form.date} onChange={f('date')} /></div>
      <div className="flex gap-3">
        <button onClick={onClose} className="btn-secondary flex-1">Annuler</button>
        <button onClick={() => { if (!form.libelle || !form.montant) return; onSave({ id: uid(), libelle: form.libelle, categorie: form.categorie, montant: parseFloat(form.montant), tvaDeductible: parseFloat(form.tvaDeductible) || 0, date: form.date }) }}
          className="flex-1 py-2.5 rounded-ds-sm text-sm font-semibold text-white bg-gradient-to-r from-ds-blue to-ds-violet hover:opacity-90">
          Enregistrer
        </button>
      </div>
    </div>
  )
}
