'use client'
import { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, Users, TrendingUp, Phone, Mail, Linkedin } from 'lucide-react'
import { cn, fmt, formatDate, uid, today } from '@/lib/utils'

type DealStatut = 'Prospect' | 'Qualifié' | 'Proposition' | 'Négociation' | 'Gagné' | 'Perdu'
interface Deal { id: string; titre: string; entreprise: string; contact: string; montant: number; tjm: number; statut: DealStatut; dateRelance: string; notes: string }
interface Contact { id: string; prenom: string; nom: string; role: string; entreprise: string; secteur: string; email: string; tel: string; linkedin: string; score: number; notes: string }

const DEAL_STYLES: Record<DealStatut, string> = {
  Prospect:    'bg-ds-text3/10 text-ds-text3 border-ds-text3/20',
  Qualifié:    'bg-ds-blue/10 text-ds-blue2 border-ds-blue/20',
  Proposition: 'bg-ds-violet/10 text-ds-violet2 border-ds-violet/20',
  Négociation: 'bg-ds-amber/10 text-ds-amber border-ds-amber/20',
  Gagné:       'bg-ds-green/10 text-ds-green border-ds-green/20',
  Perdu:       'bg-ds-rose/10 text-ds-rose border-ds-rose/20',
}

function load<T>(k: string, d: T): T { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d } catch { return d } }
function save(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }

export default function CommercialPage() {
  const [tab,      setTab]      = useState<'deals' | 'contacts'>('deals')
  const [deals,    setDeals]    = useState<Deal[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editDeal, setEditDeal] = useState<Deal | null>(null)
  const [editCt,   setEditCt]   = useState<Contact | null>(null)

  useEffect(() => {
    const s = load<{ commercial?: { deals?: Deal[]; contacts?: Contact[] } }>('datasphere_os_v1', {})
    setDeals(s.commercial?.deals || [])
    setContacts(s.commercial?.contacts || [])
    document.title = 'CRM Commercial — DataSphere OS'
  }, [])

  function persistDeals(d: Deal[]) {
    const s = load<Record<string, unknown>>('datasphere_os_v1', {})
    const comm = (s.commercial as Record<string, unknown>) || {}
    save('datasphere_os_v1', { ...s, commercial: { ...comm, deals: d } })
    setDeals(d)
  }
  function persistContacts(c: Contact[]) {
    const s = load<Record<string, unknown>>('datasphere_os_v1', {})
    const comm = (s.commercial as Record<string, unknown>) || {}
    save('datasphere_os_v1', { ...s, commercial: { ...comm, contacts: c } })
    setContacts(c)
  }

  const totalPipeline = deals.filter(d => !['Gagné','Perdu'].includes(d.statut)).reduce((s, d) => s + d.montant, 0)
  const gagnes = deals.filter(d => d.statut === 'Gagné').reduce((s, d) => s + d.montant, 0)
  const urgents = deals.filter(d => d.dateRelance && d.dateRelance <= today() && !['Gagné','Perdu'].includes(d.statut)).length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-ds-text tracking-tight">CRM Commercial</h1>
          <p className="text-sm text-ds-text3 mt-0.5">{deals.length} deals · {contacts.length} contacts</p>
        </div>
        <button onClick={() => { tab === 'deals' ? setEditDeal(null) : setEditCt(null); setShowForm(true) }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-ds-sm text-xs font-semibold text-white bg-gradient-to-r from-ds-blue to-ds-violet hover:opacity-90">
          <Plus size={13} /> {tab === 'deals' ? 'Nouveau deal' : 'Nouveau contact'}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Pipeline actif', value: fmt(totalPipeline) + '€', color: 'text-ds-blue2' },
          { label: 'Gagné',          value: fmt(gagnes) + '€',        color: 'text-ds-green' },
          { label: 'Relances dues',  value: urgents,                  color: urgents > 0 ? 'text-ds-rose' : 'text-ds-text3' },
          { label: 'Contacts',       value: contacts.length,          color: 'text-ds-violet2' },
        ].map(k => (
          <div key={k.label} className="card py-3 px-4">
            <div className="text-[10px] font-bold uppercase tracking-wide text-ds-text3 mb-1">{k.label}</div>
            <div className={cn('text-xl font-extrabold', k.color)}>{k.value}</div>
          </div>
        ))}
      </div>

      {urgents > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-ds-rose/8 border border-ds-rose/25 rounded-ds text-sm text-ds-rose">
          🔔 <strong>{urgents}</strong> deal{urgents > 1 ? 's' : ''} à relancer aujourd'hui
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={() => setTab('deals')} className={cn('px-4 py-2 rounded-ds-sm text-sm font-semibold border transition-all',
          tab === 'deals' ? 'bg-ds-blue/15 text-ds-blue2 border-ds-blue/40' : 'bg-ds-bg3 text-ds-text3 border-ds-border')}>
          🎯 Pipeline deals
        </button>
        <button onClick={() => setTab('contacts')} className={cn('px-4 py-2 rounded-ds-sm text-sm font-semibold border transition-all',
          tab === 'contacts' ? 'bg-ds-blue/15 text-ds-blue2 border-ds-blue/40' : 'bg-ds-bg3 text-ds-text3 border-ds-border')}>
          👥 Contacts
        </button>
      </div>

      {tab === 'deals' && (
        <div className="space-y-2.5">
          {deals.length === 0 ? (
            <div className="text-center py-16 text-ds-text3">
              <div className="text-4xl mb-3">💼</div>
              <p className="text-sm mb-3">Aucun deal dans le pipeline.</p>
              <button onClick={() => { setEditDeal(null); setShowForm(true) }} className="text-xs text-ds-blue2 hover:underline">Ajouter un deal →</button>
            </div>
          ) : deals.map(d => (
            <div key={d.id} className="card hover:border-ds-border2">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', DEAL_STYLES[d.statut])}>{d.statut}</span>
                    {d.dateRelance && d.dateRelance <= today() && !['Gagné','Perdu'].includes(d.statut) && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-ds-rose/10 text-ds-rose border border-ds-rose/20">⏰ Relance due</span>
                    )}
                  </div>
                  <div className="text-sm font-bold text-ds-text truncate">{d.titre}</div>
                  <div className="text-[11px] text-ds-text3">{d.entreprise}{d.contact ? ' · ' + d.contact : ''}</div>
                  {d.dateRelance && <div className="text-[11px] text-ds-text3 mt-1">Relance : {formatDate(d.dateRelance)}</div>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-right">
                    <div className="text-sm font-extrabold text-ds-text">{fmt(d.montant)}€</div>
                    {d.tjm > 0 && <div className="text-[10px] text-ds-text3">{d.tjm}€/j</div>}
                  </div>
                  <select value={d.statut} onChange={e => {
                    persistDeals(deals.map(x => x.id === d.id ? { ...x, statut: e.target.value as DealStatut } : x))
                  }} className={cn('text-[10px] font-bold px-2 py-1 rounded-full border bg-transparent cursor-pointer', DEAL_STYLES[d.statut])}>
                    {(['Prospect','Qualifié','Proposition','Négociation','Gagné','Perdu'] as DealStatut[]).map(s => <option key={s}>{s}</option>)}
                  </select>
                  <button onClick={() => { setEditDeal(d); setShowForm(true) }} className="p-1.5 text-ds-text3 hover:text-ds-blue2"><Edit2 size={12} /></button>
                  <button onClick={() => { if(confirm('Supprimer ?')) persistDeals(deals.filter(x => x.id !== d.id)) }} className="p-1.5 text-ds-text3 hover:text-ds-rose"><Trash2 size={12} /></button>
                </div>
              </div>
              {d.notes && <p className="text-[11px] text-ds-text3 mt-2 pt-2 border-t border-ds-border line-clamp-2">{d.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {tab === 'contacts' && (
        <div className="space-y-2.5">
          {contacts.length === 0 ? (
            <div className="text-center py-16 text-ds-text3">
              <div className="text-4xl mb-3">👥</div>
              <p className="text-sm mb-3">Aucun contact.</p>
              <button onClick={() => { setEditCt(null); setShowForm(true) }} className="text-xs text-ds-blue2 hover:underline">Ajouter un contact →</button>
            </div>
          ) : contacts.map(c => (
            <div key={c.id} className="card hover:border-ds-border2">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-ds-blue to-ds-violet flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {c.prenom?.[0]?.toUpperCase()}{c.nom?.[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-ds-text">{c.prenom} {c.nom}</div>
                    <div className="text-[11px] text-ds-text3">{c.role}{c.entreprise ? ' @ ' + c.entreprise : ''}</div>
                    <div className="flex gap-3 mt-1.5">
                      {c.email && <a href={`mailto:${c.email}`} className="flex items-center gap-1 text-[10px] text-ds-blue2 hover:underline"><Mail size={10} />{c.email}</a>}
                      {c.linkedin && <a href={c.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] text-ds-blue2 hover:underline"><Linkedin size={10} />LinkedIn</a>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {c.score > 0 && <div className="text-right"><div className="text-sm font-extrabold text-ds-violet2">{c.score}</div><div className="text-[9px] text-ds-text3">score</div></div>}
                  <button onClick={() => { setEditCt(c); setShowForm(true) }} className="p-1.5 text-ds-text3 hover:text-ds-blue2"><Edit2 size={12} /></button>
                  <button onClick={() => { if(confirm('Supprimer ?')) persistContacts(contacts.filter(x => x.id !== c.id)) }} className="p-1.5 text-ds-text3 hover:text-ds-rose"><Trash2 size={12} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && tab === 'deals' && (
        <Modal title={editDeal ? '✏️ Modifier le deal' : '🎯 Nouveau deal'} onClose={() => { setShowForm(false); setEditDeal(null) }}>
          <DealForm initial={editDeal} onSave={d => { persistDeals(editDeal ? deals.map(x => x.id === d.id ? d : x) : [...deals, d]); setShowForm(false); setEditDeal(null) }} onClose={() => { setShowForm(false); setEditDeal(null) }} />
        </Modal>
      )}
      {showForm && tab === 'contacts' && (
        <Modal title={editCt ? '✏️ Modifier le contact' : '👥 Nouveau contact'} onClose={() => { setShowForm(false); setEditCt(null) }}>
          <ContactForm initial={editCt} onSave={c => { persistContacts(editCt ? contacts.map(x => x.id === c.id ? c : x) : [...contacts, c]); setShowForm(false); setEditCt(null) }} onClose={() => { setShowForm(false); setEditCt(null) }} />
        </Modal>
      )}
    </div>
  )
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-ds-bg/85 backdrop-blur-md z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-ds-bg2 border border-ds-border2 rounded-ds-xl p-6 shadow-[0_32px_80px_rgba(0,0,0,.7)] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="text-base font-bold text-ds-text mb-4">{title}</h2>
        {children}
      </div>
    </div>
  )
}

function DealForm({ initial, onSave, onClose }: { initial: Deal | null; onSave: (d: Deal) => void; onClose: () => void }) {
  const [form, setForm] = useState<Deal>(initial || { id: uid(), titre: '', entreprise: '', contact: '', montant: 0, tjm: 800, statut: 'Prospect', dateRelance: '', notes: '' })
  const f = (k: keyof Deal) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const v = ['montant','tjm'].includes(k) ? Number(e.target.value) : e.target.value
    setForm(prev => ({ ...prev, [k]: v }))
  }
  return (
    <div className="space-y-3">
      <div><label className="form-label">Titre *</label><input className="inp" value={form.titre} onChange={f('titre')} placeholder="Ex: Data Architect — BNP" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="form-label">Entreprise</label><input className="inp" value={form.entreprise} onChange={f('entreprise')} /></div>
        <div><label className="form-label">Contact</label><input className="inp" value={form.contact} onChange={f('contact')} /></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="form-label">Montant (€)</label><input className="inp" type="number" value={form.montant} onChange={f('montant')} /></div>
        <div><label className="form-label">TJM (€/j)</label><input className="inp" type="number" value={form.tjm} onChange={f('tjm')} /></div>
        <div><label className="form-label">Statut</label>
          <select className="inp" value={form.statut} onChange={f('statut')}>
            {['Prospect','Qualifié','Proposition','Négociation','Gagné','Perdu'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div><label className="form-label">Date de relance</label><input className="inp" type="date" value={form.dateRelance} onChange={f('dateRelance')} /></div>
      <div><label className="form-label">Notes</label><textarea className="inp" rows={3} value={form.notes} onChange={f('notes')} /></div>
      <div className="flex gap-3"><button onClick={onClose} className="btn-secondary flex-1">Annuler</button>
        <button onClick={() => { if(!form.titre.trim()) return; onSave(form) }} className="flex-1 py-2.5 rounded-ds-sm text-sm font-semibold text-white bg-gradient-to-r from-ds-blue to-ds-violet hover:opacity-90">{initial ? 'Enregistrer' : 'Créer'}</button>
      </div>
    </div>
  )
}

function ContactForm({ initial, onSave, onClose }: { initial: Contact | null; onSave: (c: Contact) => void; onClose: () => void }) {
  const [form, setForm] = useState<Contact>(initial || { id: uid(), prenom: '', nom: '', role: '', entreprise: '', secteur: '', email: '', tel: '', linkedin: '', score: 0, notes: '' })
  const f = (k: keyof Contact) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(v => ({ ...v, [k]: k === 'score' ? Number(e.target.value) : e.target.value }))
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="form-label">Prénom *</label><input className="inp" value={form.prenom} onChange={f('prenom')} /></div>
        <div><label className="form-label">Nom *</label><input className="inp" value={form.nom} onChange={f('nom')} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="form-label">Rôle</label>
          <select className="inp" value={form.role} onChange={f('role')}>
            <option value="">—</option>
            {['DSI','CDO','CTO','VP Data','Director Data','Head of Data','VP Engineering','Chef de projet','Autre'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div><label className="form-label">Entreprise</label><input className="inp" value={form.entreprise} onChange={f('entreprise')} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="form-label">Email</label><input className="inp" type="email" value={form.email} onChange={f('email')} /></div>
        <div><label className="form-label">Téléphone</label><input className="inp" type="tel" value={form.tel} onChange={f('tel')} /></div>
      </div>
      <div><label className="form-label">LinkedIn URL</label><input className="inp" value={form.linkedin} onChange={f('linkedin')} placeholder="https://linkedin.com/in/..." /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="form-label">Secteur</label>
          <select className="inp" value={form.secteur} onChange={f('secteur')}>
            <option value="">—</option>
            {['Finance / Banque','Assurance','Tech / ESN','Energie','Retail','Santé','Telecom'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div><label className="form-label">Score potentiel (0-100)</label><input className="inp" type="number" min={0} max={100} value={form.score} onChange={f('score')} /></div>
      </div>
      <div><label className="form-label">Notes</label><textarea className="inp" rows={2} value={form.notes} onChange={f('notes')} /></div>
      <div className="flex gap-3"><button onClick={onClose} className="btn-secondary flex-1">Annuler</button>
        <button onClick={() => { if(!form.prenom.trim() || !form.nom.trim()) return; onSave(form) }} className="flex-1 py-2.5 rounded-ds-sm text-sm font-semibold text-white bg-gradient-to-r from-ds-blue to-ds-violet hover:opacity-90">{initial ? 'Enregistrer' : 'Créer'}</button>
      </div>
    </div>
  )
}
