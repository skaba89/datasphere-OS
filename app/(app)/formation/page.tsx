'use client'
import { useEffect, useState } from 'react'
import { Plus, ExternalLink, CheckCircle, Clock, BookOpen, Star } from 'lucide-react'
import { cn, uid } from '@/lib/utils'
import { useAI } from '@/hooks/useAI'

interface Cert { id: string; nom: string; organisme: string; statut: 'Planifie'|'En cours'|'Obtenu'; lien: string; impact: string }

function load<T>(k: string, d: T): T {
  try { const v = typeof window !== 'undefined' && localStorage.getItem(k); return v ? JSON.parse(v) : d }
  catch { return d }
}
function save(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }

const CERTS_RECOMMANDEES = [
  { nom: 'SnowPro Core', organisme: 'Snowflake', lien: 'https://www.snowflake.com/certifications', impact: '+50-80EUR/j', hot: true, duree: '2-3 mois' },
  { nom: 'dbt Analytics Engineer', organisme: 'dbt Labs', lien: 'https://www.getdbt.com/certifications', impact: '+30-60EUR/j', hot: true, duree: '1-2 mois' },
  { nom: 'AWS Data Engineer Associate', organisme: 'Amazon', lien: 'https://aws.amazon.com/certification', impact: '+60-100EUR/j', hot: true, duree: '3-4 mois' },
  { nom: 'Databricks Data Engineer', organisme: 'Databricks', lien: 'https://www.databricks.com/learn/certification', impact: '+40-80EUR/j', hot: true, duree: '2-3 mois' },
  { nom: 'Google Professional Data Engineer', organisme: 'Google Cloud', lien: 'https://cloud.google.com/certification', impact: '+50-90EUR/j', hot: false, duree: '3-4 mois' },
  { nom: 'Azure Data Engineer (DP-203)', organisme: 'Microsoft', lien: 'https://learn.microsoft.com/certifications', impact: '+40-70EUR/j', hot: false, duree: '2-3 mois' },
  { nom: 'Astronomer Apache Airflow', organisme: 'Astronomer', lien: 'https://www.astronomer.io/certification', impact: '+20-40EUR/j', hot: false, duree: '1 mois' },
]

const TENDANCES = [
  { cat: 'En forte hausse', items: ['Apache Iceberg','DuckDB','Polars','LLM Ops','Data Mesh','Streaming Analytics'], color: 'text-ds-green bg-ds-green/8 border-ds-green/20' },
  { cat: 'En hausse', items: ['Snowflake','dbt Core','Airflow','Databricks','Terraform','GitLab CI/CD'], color: 'text-ds-teal bg-ds-teal/8 border-ds-teal/20' },
  { cat: 'Stable', items: ['PySpark','Power BI','Python','SQL','Docker','Kafka'], color: 'text-ds-text2 bg-ds-bg3 border-ds-border' },
  { cat: 'En declin', items: ['Hadoop','SSAS','SAP BO','Talend OnPrem','OBIEE'], color: 'text-ds-text3 bg-ds-bg3 border-ds-border line-through' },
]

const STATUT_STYLES = {
  'Planifie': 'bg-ds-blue/10 text-ds-blue2 border-ds-blue/20',
  'En cours': 'bg-ds-amber/10 text-ds-amber border-ds-amber/20',
  'Obtenu':   'bg-ds-green/10 text-ds-green border-ds-green/20',
}

export default function FormationPage() {
  const [certs,    setCerts]    = useState<Cert[]>([])
  const [showForm, setShowForm] = useState(false)
  const [plan,     setPlan]     = useState('')
  const { generate, loading }  = useAI()

  useEffect(() => {
    document.title = 'Formation — DataSphere OS'
    const s = load<{ certifications?: Cert[] }>('datasphere_os_v1', {})
    setCerts(s.certifications || [])
  }, [])

  function persist(c: Cert[]) {
    const s = load<Record<string, unknown>>('datasphere_os_v1', {})
    save('datasphere_os_v1', { ...s, certifications: c })
    setCerts(c)
  }

  function addCert(nom: string, organisme: string, lien: string, impact: string) {
    const existing = certs.find(c => c.nom === nom)
    if (existing) return
    persist([...certs, { id: uid(), nom, organisme, lien, statut: 'Planifie', impact }])
  }

  function updateStatut(id: string, statut: Cert['statut']) {
    persist(certs.map(c => c.id === id ? { ...c, statut } : c))
  }

  async function genPlan() {
    const s = load<{ cv?: { competences?: string[]; titre?: string } }>('datasphere_os_v1', {})
    const cv = s.cv || {}
    const existing = certs.map(c => `${c.nom} (${c.statut})`).join(', ') || 'aucune'
    const result = await generate(
      `Expert carriere data freelance France 2026. Cree un plan de certification personnalise sur 12 mois.\nProfil: ${cv.titre || 'Data Engineer Senior'}\nStack: ${(cv.competences || ['Python','SQL','Snowflake']).slice(0,6).join(', ')}\nCertifications en cours: ${existing}\n\nGenere un plan mois par mois avec pour chaque certification:\n- Nom exact + organisme\n- Duree de preparation\n- Cout estimé\n- Impact TJM (+X EUR/j)\n- Top 3 ressources gratuites\nFormat clair, concis, oriente ROI.`,
      700
    )
    if (result) setPlan(result)
  }

  const obtained = certs.filter(c => c.statut === 'Obtenu').length
  const inProgress = certs.filter(c => c.statut === 'En cours').length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-ds-text tracking-tight flex items-center gap-2">
            <BookOpen size={20} className="text-ds-blue2" /> Formation & Veille
          </h1>
          <p className="text-sm text-ds-text3 mt-0.5">{obtained} certif obtenue{obtained !== 1 ? 's' : ''} · {inProgress} en cours</p>
        </div>
        <div className="flex gap-2">
          <button onClick={genPlan} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] text-xs font-semibold bg-ds-violet/10 border border-ds-violet/30 text-ds-violet2 hover:bg-ds-violet/15 transition-colors">
            {loading ? '...' : '✨ Plan IA'}
          </button>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] text-xs font-semibold text-white bg-gradient-to-r from-ds-blue to-ds-violet hover:opacity-90">
            <Plus size={13} /> Ajouter
          </button>
        </div>
      </div>

      {/* Plan IA */}
      {plan && (
        <div className="card bg-ds-violet/5 border-ds-violet/15">
          <div className="flex items-center gap-2 mb-3">
            <Star size={14} className="text-ds-violet2" />
            <h3 className="text-sm font-bold text-ds-text">Plan de certification IA - 12 mois</h3>
          </div>
          <pre className="text-xs text-ds-text2 whitespace-pre-wrap leading-relaxed font-sans">{plan}</pre>
        </div>
      )}

      {/* Mes certifications */}
      {certs.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-bold text-ds-text mb-3">Mes certifications suivies</h2>
          <div className="space-y-2">
            {certs.map(c => (
              <div key={c.id} className="flex items-center gap-3 p-3 bg-ds-bg3 rounded-[10px] border border-ds-border hover:border-ds-border2 transition-colors">
                <div className={cn('w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0',
                  c.statut === 'Obtenu' ? 'bg-ds-green/20' : c.statut === 'En cours' ? 'bg-ds-amber/20' : 'bg-ds-bg4')}>
                  {c.statut === 'Obtenu' && <CheckCircle size={12} className="text-ds-green" />}
                  {c.statut === 'En cours' && <Clock size={11} className="text-ds-amber" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-ds-text truncate">{c.nom}</div>
                  <div className="text-[10px] text-ds-text3">{c.organisme} · <span className="text-ds-teal">{c.impact}</span></div>
                </div>
                <select value={c.statut} onChange={e => updateStatut(c.id, e.target.value as Cert['statut'])}
                  className={cn('text-[10px] font-bold px-2 py-1 rounded-full border bg-transparent cursor-pointer', STATUT_STYLES[c.statut])}>
                  {['Planifie','En cours','Obtenu'].map(s => <option key={s}>{s}</option>)}
                </select>
                {c.lien && (
                  <a href={c.lien} target="_blank" rel="noopener noreferrer" className="text-ds-text3 hover:text-ds-blue2 transition-colors">
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certifications recommandees */}
      <div className="card">
        <h2 className="text-sm font-bold text-ds-text mb-4">Certifications recommandees pour votre profil</h2>
        <div className="space-y-2">
          {CERTS_RECOMMANDEES.map(c => {
            const added = certs.some(x => x.nom === c.nom)
            return (
              <div key={c.nom} className={cn('flex items-center gap-3 p-3 rounded-[10px] border transition-all', c.hot ? 'bg-ds-amber/3 border-ds-amber/15' : 'bg-ds-bg3 border-ds-border')}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {c.hot && <span className="text-[9px] font-bold text-ds-amber bg-ds-amber/15 px-1.5 py-0.5 rounded">HOT 2026</span>}
                    <span className="text-xs font-bold text-ds-text truncate">{c.nom}</span>
                  </div>
                  <div className="text-[10px] text-ds-text3">{c.organisme} · {c.duree} · <span className="text-ds-green font-semibold">{c.impact}</span></div>
                </div>
                <a href={c.lien} target="_blank" rel="noopener noreferrer" className="p-1.5 text-ds-text3 hover:text-ds-blue2"><ExternalLink size={11} /></a>
                {added ? (
                  <span className="text-[10px] text-ds-green flex items-center gap-1"><CheckCircle size={11} /> Suivi</span>
                ) : (
                  <button onClick={() => addCert(c.nom, c.organisme, c.lien, c.impact)}
                    className="text-[10px] px-2.5 py-1.5 rounded-[7px] bg-ds-blue/10 border border-ds-blue/30 text-ds-blue2 hover:bg-ds-blue/15 font-semibold whitespace-nowrap">
                    + Suivre
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Veille tech */}
      <div className="card">
        <h2 className="text-sm font-bold text-ds-text mb-4">Veille tech data 2026</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TENDANCES.map(t => (
            <div key={t.cat}>
              <div className="text-[10px] font-bold text-ds-text3 uppercase tracking-wider mb-2">{t.cat}</div>
              <div className="flex flex-wrap gap-1.5">
                {t.items.map(item => {
                  const cv = load<{cv?:{competences?:string[]}}>('datasphere_os_v1', {}).cv
                  const inStack = (cv?.competences || []).some(c => c.toLowerCase() === item.toLowerCase())
                  return (
                    <span key={item} className={cn('text-[10px] px-2 py-0.5 rounded border', t.color, inStack && 'ring-1 ring-ds-teal')}>
                      {item}{inStack && ' ✓'}
                    </span>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
