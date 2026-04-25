'use client'
import { useEffect, useState } from 'react'
import {
  Plus, Edit2, Trash2, Users, TrendingUp, Phone, Mail, Linkedin,
  Sparkles, MessageSquare, Target, RefreshCw, ExternalLink,
  ChevronDown, ChevronUp, Search, Filter, Bell, Zap
} from 'lucide-react'
import { cn, fmt, formatDate, uid, today } from '@/lib/utils'
import { useAI } from '@/hooks/useAI'
import { useRouter } from 'next/navigation'

type DealStatut = 'Prospect' | 'Qualifié' | 'Proposition' | 'Négociation' | 'Gagné' | 'Perdu'
type Priorite = 'haute' | 'normale' | 'basse'

interface Contact {
  id: string; prenom: string; nom: string; role: string; entreprise: string
  secteur: string; email: string; tel: string; linkedin: string; twitter: string
  score: number; notes: string; tags: string[]
  lastContact: string; nextRelance: string; statut: string
  sourceOffre?: string; budgetEstime?: number; besoins?: string
}

interface Deal {
  id: string; titre: string; entreprise: string; contactId: string
  montant: number; tjm: number; statut: DealStatut; dateRelance: string
  notes: string; priorite: Priorite; probabilite: number
  sourceOffre?: string; techRequises?: string[]
}

interface Sequence {
  id: string; contactId: string; step: number; type: 'linkedin'|'email'|'tel'
  contenu: string; date: string; statut: 'planifie'|'envoye'|'repondu'|'ignore'
}

const DEAL_STYLES: Record<DealStatut, string> = {
  Prospect:    'bg-ds-text3/10 text-ds-text3 border-ds-text3/20',
  Qualifié:    'bg-ds-blue/10 text-ds-blue2 border-ds-blue/20',
  Proposition: 'bg-ds-violet/10 text-ds-violet2 border-ds-violet/20',
  Négociation: 'bg-ds-amber/10 text-ds-amber border-ds-amber/20',
  Gagné:       'bg-ds-green/10 text-ds-green border-ds-green/20',
  Perdu:       'bg-ds-rose/10 text-ds-rose border-ds-rose/20',
}

const ROLES_DECIDEURS = [
  'DSI','CDO','CTO','VP Data','Director Data','Head of Data',
  'VP Engineering','Directeur Technique','DAF','DG','CEO',
  'Head of Analytics','Data Manager','CDIO','Chief Data Officer',
]

const SECTEURS_CIBLES = [
  'Finance / Banque','Assurance','Tech / ESN','Energie','Retail',
  'Santé','Telecom','Industrie','Conseil','Immobilier',
]

function load<T>(k: string, d: T): T {
  try { const v = typeof window !== 'undefined' && localStorage.getItem(k); return v ? JSON.parse(v) : d }
  catch { return d }
}
function save(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }

export default function CommercialPage() {
  const router = useRouter()
  const [tab,         setTab]         = useState<'pipeline'|'contacts'|'sequences'|'strategie'>('pipeline')
  const [deals,       setDeals]       = useState<Deal[]>([])
  const [contacts,    setContacts]    = useState<Contact[]>([])
  const [sequences,   setSequences]   = useState<Sequence[]>([])
  const [showForm,    setShowForm]    = useState(false)
  const [editDeal,    setEditDeal]    = useState<Deal | null>(null)
  const [editContact, setEditContact] = useState<Contact | null>(null)
  const [searchQ,     setSearchQ]     = useState('')
  const [filterSect,  setFilterSect]  = useState('')
  const [expandedId,  setExpandedId]  = useState<string|null>(null)
  const [genLoading,  setGenLoading]  = useState<string|null>(null)
  const [strategie,   setStrategie]   = useState('')
  const { generate, loading: aiLoading } = useAI()

  useEffect(() => {
    document.title = 'CRM Commercial — DataSphere OS'
    const s = load<{commercial?:{deals?:Deal[];contacts?:Contact[];sequences?:Sequence[]}}>('datasphere_os_v1', {})
    setDeals(s.commercial?.deals || [])
    setContacts(s.commercial?.contacts || [])
    setSequences(s.commercial?.sequences || [])
  }, [])

  function persistAll(d: Deal[], c: Contact[], seq: Sequence[]) {
    const s = load<Record<string,unknown>>('datasphere_os_v1', {})
    save('datasphere_os_v1', { ...s, commercial: { deals:d, contacts:c, sequences:seq } })
    setDeals(d); setContacts(c); setSequences(seq)
  }
  function pd(d: Deal[]) { persistAll(d, contacts, sequences) }
  function pc(c: Contact[]) { persistAll(deals, c, sequences) }
  function ps(seq: Sequence[]) { persistAll(deals, contacts, seq) }

  // KPIs
  const pipeline    = deals.filter(d => !['Gagné','Perdu'].includes(d.statut)).reduce((s,d)=>s+d.montant,0)
  const gagnes      = deals.filter(d => d.statut==='Gagné').reduce((s,d)=>s+d.montant,0)
  const urgents     = deals.filter(d => d.dateRelance && d.dateRelance<=today() && !['Gagné','Perdu'].includes(d.statut)).length
  const relancesCtc = contacts.filter(c => c.nextRelance && c.nextRelance<=today()).length
  const totalUrgent = urgents + relancesCtc
  const taux        = deals.length ? Math.round(deals.filter(d=>d.statut==='Gagné').length/deals.length*100) : 0

  // Filtres contacts
  const filteredContacts = contacts.filter(c => {
    const q = searchQ.toLowerCase()
    const matchQ = !q || `${c.prenom} ${c.nom} ${c.entreprise} ${c.role}`.toLowerCase().includes(q)
    const matchS = !filterSect || c.secteur === filterSect
    return matchQ && matchS
  })

  // Génération séquence IA pour un contact
  async function genSequence(contactId: string) {
    const c = contacts.find(x => x.id === contactId)
    if (!c) return
    setGenLoading(contactId)
    const cv = load<{cv?:{nom?:string;titre?:string;competences?:string[]}}>('datasphere_os_v1',{}).cv||{}
    const prompt = `Tu es expert prospection B2B freelance data France.
Génère une séquence de prospection en 3 étapes pour ce décideur.

Freelance: ${cv.nom||'Kaba Sekouna'}, ${cv.titre||'Data Engineer Senior'}
Stack: ${(cv.competences||['Snowflake','DBT','Python']).slice(0,4).join(', ')}
Cible: ${c.prenom} ${c.nom}, ${c.role} @ ${c.entreprise} (${c.secteur})
${c.besoins ? 'Besoins identifiés: '+c.besoins : ''}

Génère exactement 3 messages numérotés:
1. [LINKEDIN] Message de connexion (< 300 caractères, accroche personnalisée, PAS commercial)
2. [EMAIL] Premier email post-connexion (150 mots, valeur ROI, question ouverte)
3. [RELANCE EMAIL J+7] Relance courte (80 mots, nouvelle accroche, urgence douce)

Format: numéro + type entre crochets + message complet. Ton naturel, pas robotique.`

    const result = await generate(prompt, 700)
    if (result) {
      // Parser les 3 étapes
      const steps = result.split(/\n(?=\d\.\s*\[)/g).filter(Boolean)
      const newSeqs: Sequence[] = steps.map((step, i) => {
        const typeMatch = step.match(/\[(LINKEDIN|EMAIL|RELANCE|TEL)\]/i)
        const type = typeMatch?.[1]?.toLowerCase().includes('linkedin') ? 'linkedin'
                   : typeMatch?.[1]?.toLowerCase().includes('tel') ? 'tel' : 'email'
        const contenu = step.replace(/^\d+\.\s*\[.*?\]\s*/, '').trim()
        return {
          id: uid(), contactId, step: i+1,
          type: type as Sequence['type'],
          contenu, date: '', statut: 'planifie'
        }
      })
      ps([...sequences.filter(s => s.contactId !== contactId), ...newSeqs])
    }
    setGenLoading(null)
  }

  // Génération stratégie globale IA
  async function genStrategie() {
    const cv = load<{cv?:{nom?:string;titre?:string;competences?:string[];localisation?:string}}>('datasphere_os_v1',{}).cv||{}
    const tjm = load<{tjm?:{current?:number}}>('datasphere_os_v1',{}).tjm||{}
    const prompt = `Tu es expert en développement commercial freelance data/tech France 2026.
    
Profil: ${cv.nom||'Kaba Sekouna'}, ${cv.titre||'Data Engineer Senior'}
Localisation: ${cv.localisation||'Paris, Île-de-France'}
TJM actuel: ${(tjm as {current?:number}).current||800}€/j
Stack: ${(cv.competences||['Snowflake','DBT','Python','Airflow']).slice(0,6).join(', ')}
Pipeline actuel: ${deals.length} deals, ${contacts.length} contacts
Deals gagnés: ${taux}% de taux de conversion

Génère une stratégie de prospection complète et actionnée:

## 1. POSITIONNEMENT (2 lignes)
Votre proposition de valeur unique vs le marché

## 2. CIBLES PRIORITAIRES
Top 5 types d'entreprises à cibler (secteur, taille, budget typique)
Pour chaque cible: profil décisionnaire à approcher + message clé

## 3. CANAUX DE PROSPECTION (priorité décroissante)
LinkedIn / Email direct / Plateformes / Networking / Referrals
Avec fréquence et volume recommandés

## 4. PLAN 30 JOURS
Semaine 1 à 4: actions concrètes avec objectifs chiffrés

## 5. MESSAGES CLÉS
3 accroches email/LinkedIn testées pour votre profil

## 6. SIGNAUX D'ACHAT À SURVEILLER
Trigger events qui déclenchent un besoin de freelance data

Sois très concret, basé sur le marché data France 2026, avec des chiffres réels.`
    const result = await generate(prompt, 1200)
    if (result) setStrategie(result)
  }

  // Ajouter contact depuis une offre
  function addContactFromOffre(offre: {titre:string; entreprise:string; contactHint?:string}) {
    const roles = (offre.contactHint||'').split(',').map(r=>r.trim()).filter(Boolean)
    const role = roles[0] || 'CDO'
    const contact: Contact = {
      id: uid(), prenom: '', nom: '', role,
      entreprise: offre.entreprise, secteur: '',
      email: '', tel: '', linkedin: '', twitter: '',
      score: 70, notes: `Via offre: ${offre.titre}`,
      tags: ['offre'], lastContact: '', nextRelance: '',
      statut: 'Nouveau', sourceOffre: offre.titre,
      besoins: offre.titre
    }
    setEditContact(contact)
    setShowForm(true)
    setTab('contacts')
  }

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-ds-text tracking-tight">💼 CRM Commercial</h1>
          <p className="text-sm text-ds-text3 mt-0.5">{deals.length} deals · {contacts.length} contacts · {taux}% conversion</p>
        </div>
        <div className="flex gap-2">
          {tab === 'pipeline' && (
            <button onClick={() => { setEditDeal(null); setShowForm(true) }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] text-xs font-semibold text-white bg-gradient-to-r from-ds-blue to-ds-violet hover:opacity-90">
              <Plus size={13} /> Nouveau deal
            </button>
          )}
          {tab === 'contacts' && (
            <button onClick={() => { setEditContact(null); setShowForm(true) }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] text-xs font-semibold text-white bg-gradient-to-r from-ds-blue to-ds-violet hover:opacity-90">
              <Plus size={13} /> Nouveau contact
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Pipeline', value: fmt(pipeline)+'€', color: 'text-ds-blue2' },
          { label: 'Gagné', value: fmt(gagnes)+'€', color: 'text-ds-green' },
          { label: 'Conversion', value: taux+'%', color: taux>30?'text-ds-green':'text-ds-amber' },
          { label: 'Contacts', value: contacts.length, color: 'text-ds-violet2' },
          { label: 'Urgents', value: totalUrgent, color: totalUrgent>0?'text-ds-rose':'text-ds-text3' },
        ].map(k => (
          <div key={k.label} className="card py-3 px-4">
            <div className="text-[10px] font-bold uppercase tracking-wide text-ds-text3 mb-1">{k.label}</div>
            <div className={cn('text-xl font-extrabold', k.color)}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Alerte relances */}
      {totalUrgent > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-ds-rose/8 border border-ds-rose/25 rounded-[12px]">
          <Bell size={14} className="text-ds-rose flex-shrink-0" />
          <span className="text-sm text-ds-rose">
            <strong>{totalUrgent}</strong> relance{totalUrgent>1?'s':''} due{totalUrgent>1?'s':''} aujourd'hui
            {urgents>0 && ` (${urgents} deal${urgents>1?'s':''})`}
            {relancesCtc>0 && ` (${relancesCtc} contact${relancesCtc>1?'s':''})`}
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0 border-b border-ds-border overflow-x-auto">
        {[
          { id:'pipeline',  label:'🎯 Pipeline' },
          { id:'contacts',  label:'👥 Contacts décisionnaires' },
          { id:'sequences', label:'📨 Séquences' },
          { id:'strategie', label:'🧠 Stratégie IA' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
            className={cn('px-4 py-2.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap -mb-px',
              tab === t.id ? 'border-ds-blue text-ds-blue2' : 'border-transparent text-ds-text3 hover:text-ds-text2')}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── PIPELINE ── */}
      {tab === 'pipeline' && (
        <div className="space-y-2.5">
          {deals.length === 0 ? (
            <div className="text-center py-14 text-ds-text3">
              <Target size={32} className="mx-auto mb-3 opacity-25" />
              <p className="text-sm mb-3">Aucun deal dans le pipeline</p>
              <button onClick={() => { setEditDeal(null); setShowForm(true) }} className="text-xs text-ds-blue2 hover:underline">Ajouter un deal →</button>
            </div>
          ) : deals.map(d => {
            const contact = contacts.find(c => c.id === d.contactId)
            return (
              <div key={d.id} className="card hover:border-ds-border2 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', DEAL_STYLES[d.statut])}>{d.statut}</span>
                      {d.priorite==='haute' && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-ds-rose/10 text-ds-rose">🔥 Priorité haute</span>}
                      {d.probabilite>0 && <span className="text-[10px] text-ds-teal font-semibold">{d.probabilite}% probabilité</span>}
                      {d.dateRelance && d.dateRelance<=today() && !['Gagné','Perdu'].includes(d.statut) && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-ds-rose/10 text-ds-rose border border-ds-rose/20">⏰ Relance due</span>
                      )}
                    </div>
                    <div className="text-sm font-bold text-ds-text">{d.titre}</div>
                    <div className="text-[11px] text-ds-text3 mt-0.5">{d.entreprise}{contact ? ` · ${contact.prenom} ${contact.nom} (${contact.role})` : ''}</div>
                    {d.techRequises && d.techRequises.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {d.techRequises.slice(0,4).map(t => (
                          <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-ds-blue/8 text-ds-blue2">{t}</span>
                        ))}
                      </div>
                    )}
                    {d.dateRelance && <div className="text-[10px] text-ds-text3 mt-1">Relance : {formatDate(d.dateRelance)}</div>}
                    {d.notes && expandedId===d.id && <p className="text-[11px] text-ds-text3 mt-2 pt-2 border-t border-ds-border">{d.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-ds-text">{fmt(d.montant)}€</div>
                      {d.tjm>0 && <div className="text-[10px] text-ds-text3">{d.tjm}€/j</div>}
                    </div>
                    <select value={d.statut}
                      onChange={e => pd(deals.map(x => x.id===d.id ? {...x, statut:e.target.value as DealStatut}:x))}
                      className={cn('text-[10px] font-bold px-2 py-1 rounded-full border bg-transparent cursor-pointer', DEAL_STYLES[d.statut])}>
                      {(['Prospect','Qualifié','Proposition','Négociation','Gagné','Perdu'] as DealStatut[]).map(s => <option key={s}>{s}</option>)}
                    </select>
                    <button onClick={() => setExpandedId(expandedId===d.id?null:d.id)} className="p-1.5 text-ds-text3 hover:text-ds-blue2">
                      {expandedId===d.id ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                    </button>
                    <button onClick={() => { setEditDeal(d); setShowForm(true) }} className="p-1.5 text-ds-text3 hover:text-ds-blue2"><Edit2 size={12}/></button>
                    <button onClick={() => { if(confirm('Supprimer ?')) pd(deals.filter(x=>x.id!==d.id)) }} className="p-1.5 text-ds-text3 hover:text-ds-rose"><Trash2 size={12}/></button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── CONTACTS DÉCISIONNAIRES ── */}
      {tab === 'contacts' && (
        <div className="space-y-3">
          {/* Filtres */}
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[160px]">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-ds-text3"/>
              <input className="inp pl-8 text-xs py-1.5" placeholder="Nom, entreprise, rôle…"
                value={searchQ} onChange={e => setSearchQ(e.target.value)} />
            </div>
            <select className="inp w-36 text-xs py-1.5" value={filterSect} onChange={e => setFilterSect(e.target.value)}>
              <option value="">Tous secteurs</option>
              {SECTEURS_CIBLES.map(s => <option key={s}>{s}</option>)}
            </select>
            <div className="text-[10px] text-ds-text3 flex items-center">{filteredContacts.length} contact{filteredContacts.length!==1?'s':''}</div>
          </div>

          {/* Guide décideurs */}
          <div className="card bg-ds-violet/5 border-ds-violet/15 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target size={14} className="text-ds-violet2"/>
              <span className="text-xs font-bold text-ds-text">Décideurs à cibler pour missions data</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ROLES_DECIDEURS.map(r => (
                <span key={r} className="text-[10px] px-2 py-0.5 rounded-full bg-ds-violet/8 border border-ds-violet/20 text-ds-violet2 font-medium">{r}</span>
              ))}
            </div>
            <p className="text-[10px] text-ds-text3 mt-2">Priorité : CDO &gt; VP Data &gt; DSI pour les grandes entreprises. Head of Data pour les scale-ups.</p>
          </div>

          {filteredContacts.length === 0 ? (
            <div className="text-center py-12 text-ds-text3">
              <Users size={28} className="mx-auto mb-3 opacity-25"/>
              <p className="text-sm mb-1">Aucun contact décisionnaire</p>
              <p className="text-xs text-ds-text3 mb-3">Ajoutez des DSI, CDO, VP Data que vous prospectez</p>
              <button onClick={() => { setEditContact(null); setShowForm(true) }} className="text-xs text-ds-blue2 hover:underline">+ Ajouter un contact</button>
            </div>
          ) : filteredContacts.map(c => {
            const cSeqs = sequences.filter(s => s.contactId===c.id)
            const nextSeq = cSeqs.find(s => s.statut==='planifie')
            const isLoading = genLoading===c.id
            return (
              <div key={c.id} className="card hover:border-ds-border2 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-ds-blue to-ds-violet flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {c.prenom?.[0]?.toUpperCase()||'?'}{c.nom?.[0]?.toUpperCase()||''}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-ds-text">{c.prenom||'—'} {c.nom}</span>
                        {c.score > 0 && (
                          <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded',
                            c.score>=80?'bg-ds-green/10 text-ds-green':c.score>=60?'bg-ds-amber/10 text-ds-amber':'bg-ds-bg3 text-ds-text3')}>
                            Score {c.score}
                          </span>
                        )}
                        {c.statut && <span className="text-[10px] px-2 py-0.5 rounded-full bg-ds-bg3 border border-ds-border text-ds-text3">{c.statut}</span>}
                      </div>
                      <div className="text-[11px] text-ds-text3 mt-0.5">
                        <span className="text-ds-blue2 font-medium">{c.role}</span>
                        {c.entreprise && <> @ <span className="text-ds-text2">{c.entreprise}</span></>}
                        {c.secteur && <span className="opacity-60"> · {c.secteur}</span>}
                      </div>

                      {/* Contacts */}
                      <div className="flex gap-2 mt-1.5 flex-wrap">
                        {c.email && (
                          <a href={`mailto:${c.email}`}
                            className="flex items-center gap-1 text-[10px] text-ds-blue2 hover:underline">
                            <Mail size={9}/>{c.email}
                          </a>
                        )}
                        {c.linkedin && (
                          <a href={c.linkedin} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[10px] text-ds-blue2 hover:underline">
                            <Linkedin size={9}/>LinkedIn
                          </a>
                        )}
                        {c.tel && (
                          <a href={`tel:${c.tel}`} className="flex items-center gap-1 text-[10px] text-ds-teal hover:underline">
                            <Phone size={9}/>{c.tel}
                          </a>
                        )}
                      </div>

                      {/* Séquence en cours */}
                      {nextSeq && (
                        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-ds-amber">
                          <MessageSquare size={10}/>
                          Étape {nextSeq.step} — {nextSeq.type==='linkedin'?'Message LinkedIn':nextSeq.type==='email'?'Email':'Appel'} à envoyer
                        </div>
                      )}
                      {c.nextRelance && c.nextRelance<=today() && (
                        <div className="mt-1 text-[10px] text-ds-rose flex items-center gap-1">
                          <Bell size={9}/> Relance due aujourd'hui
                        </div>
                      )}
                      {c.besoins && expandedId===c.id && (
                        <div className="mt-2 pt-2 border-t border-ds-border">
                          <div className="text-[10px] text-ds-text3 font-semibold uppercase tracking-wide mb-1">Besoins identifiés</div>
                          <p className="text-[11px] text-ds-text2">{c.besoins}</p>
                          {c.notes && <p className="text-[11px] text-ds-text3 mt-1">{c.notes}</p>}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <div className="flex gap-1">
                      <button onClick={() => setExpandedId(expandedId===c.id?null:c.id)}
                        className="p-1.5 text-ds-text3 hover:text-ds-text2">
                        {expandedId===c.id?<ChevronUp size={12}/>:<ChevronDown size={12}/>}
                      </button>
                      <button onClick={() => { setEditContact(c); setShowForm(true) }} className="p-1.5 text-ds-text3 hover:text-ds-blue2"><Edit2 size={12}/></button>
                      <button onClick={() => { if(confirm('Supprimer ?')) pc(contacts.filter(x=>x.id!==c.id)) }} className="p-1.5 text-ds-text3 hover:text-ds-rose"><Trash2 size={12}/></button>
                    </div>
                    <button onClick={() => genSequence(c.id)} disabled={isLoading}
                      className={cn('flex items-center gap-1 px-2 py-1.5 rounded-[7px] text-[10px] font-semibold transition-all whitespace-nowrap',
                        isLoading ? 'bg-ds-bg3 text-ds-text3 cursor-wait' : 'bg-ds-violet/10 border border-ds-violet/25 text-ds-violet2 hover:bg-ds-violet/15')}>
                      {isLoading ? <RefreshCw size={9} className="animate-spin"/> : <Sparkles size={9}/>}
                      {cSeqs.length>0 ? 'Régénérer' : 'Séquence IA'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── SÉQUENCES ── */}
      {tab === 'sequences' && (
        <div className="space-y-4">
          <div className="card bg-ds-blue/5 border-ds-blue/15 p-4">
            <div className="text-xs font-bold text-ds-text mb-2">💡 Comment fonctionne une séquence de prospection</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] text-ds-text3">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-ds-blue/20 text-ds-blue2 text-[10px] font-bold flex items-center justify-center flex-shrink-0">1</span>
                <span><strong className="text-ds-text">LinkedIn</strong> — Connexion avec message court personnalisé (J0)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-ds-violet/20 text-ds-violet2 text-[10px] font-bold flex items-center justify-center flex-shrink-0">2</span>
                <span><strong className="text-ds-text">Email direct</strong> — Message valeur + question ouverte (J+3)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-ds-amber/20 text-ds-amber text-[10px] font-bold flex items-center justify-center flex-shrink-0">3</span>
                <span><strong className="text-ds-text">Relance</strong> — Nouvel angle, urgence douce (J+10)</span>
              </div>
            </div>
          </div>

          {contacts.filter(c => sequences.some(s => s.contactId===c.id)).length === 0 ? (
            <div className="text-center py-12 text-ds-text3">
              <MessageSquare size={28} className="mx-auto mb-3 opacity-25"/>
              <p className="text-sm mb-2">Aucune séquence générée</p>
              <p className="text-xs mb-3">Allez dans Contacts et cliquez "Séquence IA" sur un décideur</p>
              <button onClick={() => setTab('contacts')} className="text-xs text-ds-blue2 hover:underline">Aller aux contacts →</button>
            </div>
          ) : contacts.filter(c => sequences.some(s => s.contactId===c.id)).map(c => {
            const cSeqs = sequences.filter(s => s.contactId===c.id).sort((a,b)=>a.step-b.step)
            return (
              <div key={c.id} className="card">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-sm font-bold text-ds-text">{c.prenom} {c.nom}</div>
                    <div className="text-[11px] text-ds-text3">{c.role} @ {c.entreprise}</div>
                  </div>
                  <button onClick={() => genSequence(c.id)} disabled={genLoading===c.id}
                    className="btn-secondary flex items-center gap-1.5 text-xs">
                    {genLoading===c.id ? <RefreshCw size={11} className="animate-spin"/> : <RefreshCw size={11}/>}
                    Régénérer
                  </button>
                </div>
                <div className="space-y-3">
                  {cSeqs.map(seq => (
                    <div key={seq.id} className={cn('rounded-[10px] border p-3',
                      seq.statut==='envoye' ? 'bg-ds-green/5 border-ds-green/15' :
                      seq.statut==='repondu' ? 'bg-ds-teal/5 border-ds-teal/15' :
                      seq.statut==='ignore' ? 'bg-ds-bg3 border-ds-border opacity-50' :
                      'bg-ds-bg3 border-ds-border')}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold',
                            seq.type==='linkedin'?'bg-[#0A66C2]/20 text-[#5DA8EC]':seq.type==='email'?'bg-ds-blue/20 text-ds-blue2':'bg-ds-teal/20 text-ds-teal')}>
                            {seq.step}
                          </span>
                          <span className={cn('text-[10px] font-bold',
                            seq.type==='linkedin'?'text-[#5DA8EC]':seq.type==='email'?'text-ds-blue2':'text-ds-teal')}>
                            {seq.type==='linkedin'?'💼 LinkedIn':seq.type==='email'?'📧 Email':'📞 Appel'} — Étape {seq.step}
                          </span>
                        </div>
                        <select value={seq.statut}
                          onChange={e => ps(sequences.map(s => s.id===seq.id ? {...s, statut:e.target.value as Sequence['statut']}:s))}
                          className="text-[9px] bg-transparent text-ds-text3 border border-ds-border rounded px-1.5 py-0.5 cursor-pointer">
                          {['planifie','envoye','repondu','ignore'].map(s => <option key={s}>{s}</option>)}
                        </select>
                      </div>
                      <p className="text-[11px] text-ds-text2 whitespace-pre-wrap leading-relaxed">{seq.contenu}</p>
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => {
                          navigator.clipboard.writeText(seq.contenu).catch(()=>{})
                        }} className="flex items-center gap-1 text-[10px] text-ds-text3 hover:text-ds-blue2 transition-colors">
                          📋 Copier
                        </button>
                        {seq.type==='email' && c.email && (
                          <a href={`mailto:${c.email}?body=${encodeURIComponent(seq.contenu)}`}
                            className="flex items-center gap-1 text-[10px] text-ds-blue2 hover:underline">
                            <Mail size={9}/> Ouvrir email
                          </a>
                        )}
                        {seq.type==='linkedin' && c.linkedin && (
                          <a href={c.linkedin} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[10px] text-[#5DA8EC] hover:underline">
                            <Linkedin size={9}/> Ouvrir profil
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── STRATÉGIE IA ── */}
      {tab === 'strategie' && (
        <div className="space-y-4">
          {strategie ? (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-ds-text flex items-center gap-2"><Zap size={14} className="text-ds-violet2"/> Votre stratégie de prospection</h2>
                <div className="flex gap-2">
                  <button onClick={() => {
                    navigator.clipboard.writeText(strategie).catch(()=>{})
                  }} className="btn-secondary text-xs">📋 Copier</button>
                  <button onClick={genStrategie} disabled={aiLoading} className="btn-secondary flex items-center gap-1.5 text-xs">
                    <RefreshCw size={11} className={cn(aiLoading&&'animate-spin')}/> Régénérer
                  </button>
                </div>
              </div>
              <div className="bg-ds-bg border border-ds-border rounded-[10px] p-4">
                <pre className="text-sm text-ds-text2 whitespace-pre-wrap leading-relaxed font-sans">{strategie}</pre>
              </div>
            </div>
          ) : (
            <div className="card text-center py-12">
              <Zap size={32} className="mx-auto mb-4 text-ds-violet opacity-50"/>
              <h2 className="text-base font-bold text-ds-text mb-2">Stratégie de prospection personnalisée</h2>
              <p className="text-sm text-ds-text3 mb-6 max-w-md mx-auto">
                L'IA analyse votre profil, votre stack et votre pipeline actuel pour générer une stratégie de prospection complète sur 30 jours avec les cibles prioritaires, les messages clés et les signaux d'achat à surveiller.
              </p>
              <button onClick={genStrategie} disabled={aiLoading}
                className={cn('inline-flex items-center gap-2 px-6 py-3 rounded-[10px] text-sm font-bold transition-all',
                  aiLoading ? 'bg-ds-bg3 text-ds-text3 border border-ds-border cursor-wait'
                            : 'text-white bg-gradient-to-r from-ds-violet to-ds-blue shadow-[0_4px_16px_rgba(139,92,246,.35)] hover:opacity-90')}>
                {aiLoading ? <><RefreshCw size={14} className="animate-spin"/> Génération (30-60s)…</> : <><Sparkles size={14}/> Générer ma stratégie</>}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── MODALS ── */}
      {showForm && tab === 'pipeline' && (
        <Modal title={editDeal?'Modifier le deal':'Nouveau deal'} onClose={() => { setShowForm(false); setEditDeal(null) }}>
          <DealForm
            initial={editDeal}
            contacts={contacts}
            onSave={d => { pd(editDeal ? deals.map(x=>x.id===d.id?d:x) : [...deals, d]); setShowForm(false); setEditDeal(null) }}
            onClose={() => { setShowForm(false); setEditDeal(null) }}
          />
        </Modal>
      )}
      {showForm && tab === 'contacts' && (
        <Modal title={editContact?'Modifier le contact':'Nouveau contact décisionnaire'} onClose={() => { setShowForm(false); setEditContact(null) }}>
          <ContactForm
            initial={editContact}
            onSave={c => { pc(editContact && contacts.some(x=>x.id===c.id) ? contacts.map(x=>x.id===c.id?c:x) : [...contacts, c]); setShowForm(false); setEditContact(null) }}
            onClose={() => { setShowForm(false); setEditContact(null) }}
          />
        </Modal>
      )}
    </div>
  )
}

// ── Modal wrapper ──
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-ds-bg/85 backdrop-blur-md z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-ds-bg2 border border-ds-border2 rounded-[20px] p-6 shadow-[0_32px_80px_rgba(0,0,0,.7)] max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
        <h2 className="text-base font-bold text-ds-text mb-4">{title}</h2>
        {children}
      </div>
    </div>
  )
}

// ── Deal Form ──
function DealForm({ initial, contacts, onSave, onClose }: {
  initial: Deal|null; contacts: Contact[]
  onSave: (d: Deal) => void; onClose: () => void
}) {
  const [form, setForm] = useState<Deal>(initial || {
    id:uid(), titre:'', entreprise:'', contactId:'', montant:0, tjm:800,
    statut:'Prospect', dateRelance:'', notes:'', priorite:'normale',
    probabilite:25, sourceOffre:'', techRequises:[]
  })
  const f = (k: keyof Deal) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) => {
    const v = ['montant','tjm','probabilite'].includes(k) ? +e.target.value : e.target.value
    setForm(p => ({...p, [k]:v}))
  }
  return (
    <div className="space-y-3">
      <div><label className="form-label">Titre de la mission *</label>
        <input className="inp" value={form.titre} onChange={f('titre')} placeholder="Ex: Data Architect Senior — BNP Paribas"/></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="form-label">Entreprise</label><input className="inp" value={form.entreprise} onChange={f('entreprise')}/></div>
        <div><label className="form-label">Contact associé</label>
          <select className="inp" value={form.contactId} onChange={f('contactId')}>
            <option value="">— Aucun —</option>
            {contacts.map(c => <option key={c.id} value={c.id}>{c.prenom} {c.nom} ({c.role})</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="form-label">Montant (€)</label><input className="inp" type="number" value={form.montant} onChange={f('montant')}/></div>
        <div><label className="form-label">TJM (€/j)</label><input className="inp" type="number" value={form.tjm} onChange={f('tjm')}/></div>
        <div><label className="form-label">Probabilité %</label><input className="inp" type="number" min={0} max={100} value={form.probabilite} onChange={f('probabilite')}/></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="form-label">Statut</label>
          <select className="inp" value={form.statut} onChange={f('statut')}>
            {['Prospect','Qualifié','Proposition','Négociation','Gagné','Perdu'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div><label className="form-label">Priorité</label>
          <select className="inp" value={form.priorite} onChange={f('priorite')}>
            {['haute','normale','basse'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div><label className="form-label">Date de relance</label><input className="inp" type="date" value={form.dateRelance} onChange={f('dateRelance')}/></div>
      <div><label className="form-label">Technologies requises (séparées par virgule)</label>
        <input className="inp" value={(form.techRequises||[]).join(', ')}
          onChange={e => setForm(p => ({...p, techRequises:e.target.value.split(',').map(t=>t.trim()).filter(Boolean)}))}
          placeholder="Snowflake, DBT, Python, Airflow"/></div>
      <div><label className="form-label">Notes</label><textarea className="inp" rows={2} value={form.notes} onChange={f('notes')}/></div>
      <div className="flex gap-3">
        <button onClick={onClose} className="btn-secondary flex-1">Annuler</button>
        <button onClick={() => { if(!form.titre.trim()) return; onSave(form) }}
          className="flex-1 py-2.5 rounded-[9px] text-sm font-semibold text-white bg-gradient-to-r from-ds-blue to-ds-violet hover:opacity-90">
          {initial?'Enregistrer':'Créer'}
        </button>
      </div>
    </div>
  )
}

// ── Contact Form ──
function ContactForm({ initial, onSave, onClose }: { initial: Contact|null; onSave: (c: Contact) => void; onClose: () => void }) {
  const [form, setForm] = useState<Contact>(initial || {
    id:uid(), prenom:'', nom:'', role:'CDO', entreprise:'', secteur:'',
    email:'', tel:'', linkedin:'', twitter:'', score:60, notes:'',
    tags:[], lastContact:'', nextRelance:'', statut:'Nouveau',
    sourceOffre:'', budgetEstime:0, besoins:''
  })
  const f = (k: keyof Contact) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) =>
    setForm(p => ({...p, [k]: k==='score'||k==='budgetEstime' ? +e.target.value : e.target.value}))
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="form-label">Prénom</label><input className="inp" value={form.prenom} onChange={f('prenom')} placeholder="Marie"/></div>
        <div><label className="form-label">Nom *</label><input className="inp" value={form.nom} onChange={f('nom')} placeholder="Dupont"/></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="form-label">Rôle décisionnaire</label>
          <select className="inp" value={form.role} onChange={f('role')}>
            {ROLES_DECIDEURS.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div><label className="form-label">Entreprise *</label><input className="inp" value={form.entreprise} onChange={f('entreprise')} placeholder="BNP Paribas"/></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="form-label">Secteur</label>
          <select className="inp" value={form.secteur} onChange={f('secteur')}>
            <option value="">—</option>
            {SECTEURS_CIBLES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div><label className="form-label">Score priorité (0-100)</label>
          <input className="inp" type="number" min={0} max={100} value={form.score} onChange={f('score')}/></div>
      </div>
      <div><label className="form-label">Email</label>
        <input className="inp" type="email" value={form.email} onChange={f('email')} placeholder="marie.dupont@bnpparibas.fr"/></div>
      <div><label className="form-label">URL LinkedIn</label>
        <input className="inp" value={form.linkedin} onChange={f('linkedin')} placeholder="https://linkedin.com/in/marie-dupont"/></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="form-label">Téléphone</label><input className="inp" type="tel" value={form.tel} onChange={f('tel')}/></div>
        <div><label className="form-label">Prochaine relance</label><input className="inp" type="date" value={form.nextRelance} onChange={f('nextRelance')}/></div>
      </div>
      <div><label className="form-label">Besoins identifiés / contexte</label>
        <textarea className="inp" rows={2} value={form.besoins} onChange={f('besoins')}
          placeholder="Ex: Migration Snowflake Q3 2026, budget 200k€, cherche profil Data Architect 9 mois"/></div>
      <div><label className="form-label">Notes internes</label>
        <textarea className="inp" rows={2} value={form.notes} onChange={f('notes')}
          placeholder="Rencontré au Data Saturday Paris, passionné par les architectures lakehouse"/></div>
      <div className="flex gap-3">
        <button onClick={onClose} className="btn-secondary flex-1">Annuler</button>
        <button onClick={() => { if(!form.nom.trim()) return; onSave(form) }}
          className="flex-1 py-2.5 rounded-[9px] text-sm font-semibold text-white bg-gradient-to-r from-ds-blue to-ds-violet hover:opacity-90">
          {initial&&initial.nom?'Enregistrer':'Créer le contact'}
        </button>
      </div>
    </div>
  )
}
