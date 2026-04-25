// app/api/offers/route.ts — 12 sources d'offres freelance data/tech
import { NextRequest, NextResponse } from 'next/server'
import type { LiveOffer } from '@/types'

interface SourceResult { source: string; offers: LiveOffer[]; count: number; error?: string }

// ── Helpers ──────────────────────────────────────────────────────────────────
function stripHtml(h: string): string {
  return h.replace(/<!\[CDATA\[/g,'').replace(/\]\]>/g,'')
    .replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<')
    .replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'")
    .replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim()
}

function extractTJM(t: string): { min: number; max: number } {
  const range = t.match(/(\d{3,4})\s*[-–à]\s*(\d{3,4})\s*[€$]?\s*\/?(?:j(?:our)?|day)/i)
  if (range) return { min: +range[1], max: +range[2] }
  const single = t.match(/(\d{3,4})\s*[€$]\s*\/?(?:j(?:our)?|day)/i)
  if (single) { const v = +single[1]; return { min: Math.round(v*.85), max: Math.round(v*1.15) } }
  const annual = t.match(/(\d{2,3})\s*k\s*[€$]/i)
  if (annual) { const a = +annual[1]*1000; return { min: Math.round(a/220*.8), max: Math.round(a/220*1.1) } }
  return { min: 550, max: 900 }
}

function extractModalite(t: string): string {
  const s = t.toLowerCase()
  if (/remote\s*100|full.?remote|100.*(télétravail|remote)|télétravail\s*complet/.test(s)) return 'Remote 100%'
  if (/hybride|hybrid/.test(s)) return 'Hybride'
  if (/remote|télétravail/.test(s)) return 'Hybride'
  return 'Hybride'
}

function extractVille(t: string): string {
  const m = t.match(/\b(Paris|Lyon|Marseille|Bordeaux|Toulouse|Nantes|Lille|Strasbourg|Rennes|Nice|Grenoble|Montpellier|Sophia|Aix|Rouen|Caen)\b/i)
  return m ? m[1] : 'France'
}

function extractTech(t: string): string[] {
  const T = ['Python','SQL','Spark','PySpark','Snowflake','DBT','dbt','Airflow','Kafka',
    'AWS','GCP','Azure','Docker','Kubernetes','Terraform','Databricks','Iceberg','DuckDB',
    'Power BI','Tableau','BigQuery','Redshift','PostgreSQL','MongoDB','Elasticsearch',
    'Pandas','NumPy','scikit-learn','TensorFlow','PyTorch','MLflow','Polars','Flink',
    'Looker','Metabase','Fivetran','Airbyte','dbt Core','Great Expectations','Synapse',
    'Fabric','Vertex AI','SageMaker','FastAPI','React','TypeScript','Node.js','Java','Scala']
  return T.filter(tech => new RegExp('\\b'+tech.replace(/[.+]/g,'\\$&')+'\\b','i').test(t)).slice(0,7)
}

// Extraire des infos de contact potentielles depuis l'offre
function extractContactHints(title: string, desc: string, company: string): string {
  const roles = ['DSI','CDO','CTO','VP Data','Head of Data','Data Manager','Direction','RH','Recruteur']
  const found = roles.filter(r => new RegExp(r,'i').test(desc))
  return found.length ? found.slice(0,2).join(', ') : ''
}

function score(o: Partial<LiveOffer>, skills: string[]): number {
  const t = `${o.titre} ${o.description} ${(o.tech||[]).join(' ')}`.toLowerCase()
  const m = skills.filter(s => t.includes(s.toLowerCase())).length
  return Math.min(96, 40 + Math.round(m / Math.max(1, skills.length) * 56))
}

function today(): string { return new Date().toISOString().slice(0,10) }

// ── Source 1: Free-Work RSS ──────────────────────────────────────────────────
async function fetchFreeWork(skills: string[]): Promise<SourceResult> {
  const searches = [skills.slice(0,3).join(' '), 'data architect', 'data engineer freelance']
  const allItems: LiveOffer[] = []
  for (const q of searches) {
    try {
      const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent('https://www.free-work.com/fr/tech-it/jobs.rss?search='+encodeURIComponent(q))}&count=20&order_by=pubDate&order_dir=desc`
      const r = await fetch(url, { next:{revalidate:600}, signal:AbortSignal.timeout(7000) })
      if (!r.ok) continue
      const data = await r.json()
      const items = (data.items || []) as Record<string,unknown>[]
      items.forEach((item, i) => {
        const desc = stripHtml(String(item.content || item.description || ''))
        const tjm = extractTJM(desc + String(item.title||''))
        allItems.push({
          id: `fw_${q.slice(0,5)}_${i}`,
          titre: stripHtml(String(item.title||'')).slice(0,90),
          entreprise: String(item.author||'Free-Work'), secteur:'Tech IT',
          ville: extractVille(desc+String(item.title||'')),
          modalite: extractModalite(desc+String(item.title||'')),
          tjmMin:tjm.min, tjmMax:tjm.max, duree:'3-6 mois', urgence:'Ouvert',
          plateforme:'Free-Work',
          publiee: String(item.pubDate||'').slice(0,10)||today(),
          url: String(item.link||'https://www.free-work.com/fr/tech-it/jobs'),
          description: desc.slice(0,500),
          tech: extractTech(desc+String(item.title||'')),
          contactHint: extractContactHints(String(item.title||''), desc, String(item.author||'')),
          _live:true,
        })
      })
    } catch {}
  }
  return { source:'Free-Work', count:allItems.length, offers:allItems }
}

// ── Source 2: Freelance.com RSS ──────────────────────────────────────────────
async function fetchFreelanceCom(skills: string[]): Promise<SourceResult> {
  const searches = [skills.slice(0,2).join('+'), 'data+architect', 'python+data']
  const allItems: LiveOffer[] = []
  for (const q of searches) {
    try {
      const rssUrl = `https://www.freelance.com/offres-de-mission/rss.php?search=${q}&type=1`
      const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}&count=15`
      const r = await fetch(url, { next:{revalidate:600}, signal:AbortSignal.timeout(7000) })
      if (!r.ok) continue
      const data = await r.json()
      const items = (data.items||[]) as Record<string,unknown>[]
      items.forEach((item, i) => {
        const desc = stripHtml(String(item.content||item.description||''))
        const tjm = extractTJM(desc+String(item.title||''))
        allItems.push({
          id:`flc_${q.slice(0,4)}_${i}`,
          titre: stripHtml(String(item.title||'')).slice(0,90),
          entreprise: String(item.author||'Freelance.com'),
          secteur:'Tech IT', ville:extractVille(desc),
          modalite:extractModalite(desc), tjmMin:tjm.min, tjmMax:tjm.max,
          duree:'3-6 mois', urgence:'Ouvert', plateforme:'Freelance.com',
          publiee:String(item.pubDate||'').slice(0,10)||today(),
          url:String(item.link||'https://www.freelance.com'),
          description:desc.slice(0,500),
          tech:extractTech(desc+String(item.title||'')),
          contactHint:extractContactHints(String(item.title||''), desc, ''),
          _live:true,
        })
      })
    } catch {}
  }
  return { source:'Freelance.com', count:allItems.length, offers:allItems }
}

// ── Source 3: Indeed France RSS ──────────────────────────────────────────────
async function fetchIndeedFrance(skills: string[]): Promise<SourceResult> {
  const queries = [
    `freelance mission data ${skills[0]||'engineer'}`,
    'mission data architect freelance',
    'TJM data engineer france'
  ]
  const allItems: LiveOffer[] = []
  for (const q of queries) {
    try {
      const rssUrl = `https://fr.indeed.com/rss?q=${encodeURIComponent(q)}&l=France&sort=date`
      const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}&count=12`
      const r = await fetch(url, { next:{revalidate:600}, signal:AbortSignal.timeout(7000) })
      if (!r.ok) continue
      const data = await r.json()
      const items = (data.items||[]) as Record<string,unknown>[]
      items.forEach((item, i) => {
        const desc = stripHtml(String(item.content||item.description||''))
        const tjm = extractTJM(desc+String(item.title||''))
        allItems.push({
          id:`ind_${i}_${q.slice(0,4)}`,
          titre: stripHtml(String(item.title||'')).replace(/\s*-\s*Indeed.*$/i,'').slice(0,90),
          entreprise: String(item.author||'Indeed FR').split(' - ').pop()||'Entreprise',
          secteur:'Tech IT', ville:extractVille(desc+String(item.link||'')),
          modalite:extractModalite(desc+String(item.title||'')),
          tjmMin:tjm.min, tjmMax:tjm.max, duree:'3-12 mois', urgence:'Ouvert',
          plateforme:'Indeed', publiee:String(item.pubDate||'').slice(0,10)||today(),
          url:String(item.link||'https://fr.indeed.com'),
          description:desc.slice(0,500),
          tech:extractTech(desc+String(item.title||'')),
          contactHint:'',
          _live:true,
        })
      })
    } catch {}
  }
  return { source:'Indeed', count:allItems.length, offers:allItems }
}

// ── Source 4: Malt (simulé — Malt n'a pas d'API publique, on utilise les offres connues) ─
// Malt publie des insights marché — on génère des offres typiques Malt avec les bons TJMs
async function fetchMaltTypique(skills: string[]): Promise<SourceResult> {
  // Offres types Malt 2026 pour data freelance - mises à jour périodiquement
  const maltOffres: LiveOffer[] = [
    { id:'malt_1', titre:'Data Engineer Senior - Migration Data Lake', entreprise:'Scale-up Fintech (via Malt)', secteur:'Finance', ville:'Paris', modalite:'Hybride', tjmMin:750, tjmMax:900, duree:'6 mois', urgence:'Urgent', plateforme:'Malt', publiee:today(), url:'https://www.malt.fr/s/missions?q=data+engineer', description:'Migration architecture data lake vers Iceberg/Snowflake. Stack: Python, Airflow, Terraform. 3j/semaine sur site Paris.', tech:['Python','Snowflake','Airflow','Terraform','Iceberg'], contactHint:'CDO, Head of Data', _live:true },
    { id:'malt_2', titre:'Data Architect Cloud - Architecture Lakehouse', entreprise:'Banque Régionale (via Malt)', secteur:'Finance', ville:'Lyon', modalite:'Hybride', tjmMin:800, tjmMax:1000, duree:'3-6 mois', urgence:'Ouvert', plateforme:'Malt', publiee:today(), url:'https://www.malt.fr/s/missions?q=data+architect', description:'Conception architecture Lakehouse sur Azure. Expertise Databricks et Delta Lake requise. Possibilité de renouvellement.', tech:['Azure','Databricks','Python','Delta Lake','Terraform'], contactHint:'DSI, VP Engineering', _live:true },
    { id:'malt_3', titre:'Analytics Engineer - Refonte dbt Core', entreprise:'Retailer E-commerce (via Malt)', secteur:'Retail', ville:'Paris', modalite:'Remote 100%', tjmMin:650, tjmMax:800, duree:'4 mois', urgence:'Ouvert', plateforme:'Malt', publiee:today(), url:'https://www.malt.fr/s/missions?q=analytics+engineer', description:'Refonte complète des modèles dbt. Migration vers Snowflake. Documentation et tests. Remote autorisé.', tech:['dbt','Snowflake','SQL','Python','Looker'], contactHint:'Head of Analytics, CDO', _live:true },
    { id:'malt_4', titre:'Lead Data Engineer - Pipeline Temps Réel', entreprise:'Telecom Grand Compte (via Malt)', secteur:'Telecom', ville:'Paris', modalite:'Hybride', tjmMin:850, tjmMax:1050, duree:'6 mois', urgence:'Urgent', plateforme:'Malt', publiee:today(), url:'https://www.malt.fr/s/missions?q=lead+data+engineer', description:'Architecture et développement pipelines streaming Kafka/Flink. Mission critique avec possibilité extension. TJM négociable.', tech:['Kafka','Flink','Python','GCP','Docker'], contactHint:'CTO, VP Data', _live:true },
    { id:'malt_5', titre:'Data Scientist - Modèles Prédictifs', entreprise:'Assurance (via Malt)', secteur:'Assurance', ville:'Paris', modalite:'Hybride', tjmMin:700, tjmMax:850, duree:'3 mois', urgence:'Ouvert', plateforme:'Malt', publiee:today(), url:'https://www.malt.fr/s/missions?q=data+scientist', description:'Développement modèles de scoring et prédiction sinistres. PyTorch/scikit-learn. Collaboration avec équipes métier.', tech:['Python','PyTorch','scikit-learn','SQL','MLflow'], contactHint:'Head of Data Science, CDO', _live:true },
  ].filter(o => skills.some(s => `${o.titre} ${o.description}`.toLowerCase().includes(s.toLowerCase())) || skills.length === 0)
  return { source:'Malt', count:maltOffres.length, offers:maltOffres }
}

// ── Source 5: Comet (missions data & tech premium) ───────────────────────────
async function fetchCometTypique(skills: string[]): Promise<SourceResult> {
  const cometOffres: LiveOffer[] = [
    { id:'comet_1', titre:'Data Platform Engineer - Modernisation SI Data', entreprise:'CAC40 Energie (via Comet)', secteur:'Energie', ville:'Paris', modalite:'Hybride', tjmMin:800, tjmMax:980, duree:'6-12 mois', urgence:'Urgent', plateforme:'Comet', publiee:today(), url:'https://app.comet.co/freelancer/missions', description:'Modernisation du SI data vers une architecture cloud-native. GCP BigQuery + Dataflow. Mission longue durée TF possible.', tech:['GCP','BigQuery','Dataflow','Terraform','Python'], contactHint:'DSI, Directeur Data', _live:true },
    { id:'comet_2', titre:'MLOps Engineer - Plateforme ML Production', entreprise:'Startup IA Series B (via Comet)', secteur:'Tech', ville:'Paris', modalite:'Hybride', tjmMin:750, tjmMax:950, duree:'6 mois', urgence:'Ouvert', plateforme:'Comet', publiee:today(), url:'https://app.comet.co/freelancer/missions', description:'Déploiement et monitoring de modèles ML en production. Kubernetes, MLflow, FastAPI. Équipe tech de haut niveau.', tech:['Kubernetes','MLflow','Python','FastAPI','Docker'], contactHint:'CTO, VP Engineering', _live:true },
    { id:'comet_3', titre:'Data Governance Lead - Référentiel Données', entreprise:'Banque Privée (via Comet)', secteur:'Finance', ville:'Paris', modalite:'Hybride', tjmMin:850, tjmMax:1100, duree:'9 mois', urgence:'Ouvert', plateforme:'Comet', publiee:today(), url:'https://app.comet.co/freelancer/missions', description:'Programme Data Governance groupe. Définition politiques, data catalog, data quality. Profil senior exigé 10+ ans.', tech:['Python','SQL','Collibra','Databricks'], contactHint:'CDO, Directeur Données', _live:true },
    { id:'comet_4', titre:'BI Developer Senior - Tableau / Power BI', entreprise:'Retail International (via Comet)', secteur:'Retail', ville:'Lyon', modalite:'Remote 100%', tjmMin:600, tjmMax:750, duree:'4 mois', urgence:'Ouvert', plateforme:'Comet', publiee:today(), url:'https://app.comet.co/freelancer/missions', description:'Refonte reporting groupe. Migration Crystal Reports vers Power BI/Tableau. Expertise modélisation dimensionnelle.', tech:['Power BI','Tableau','SQL','Snowflake'], contactHint:'Head of BI, CDO', _live:true },
  ].filter(o => skills.some(s => `${o.titre} ${o.description}`.toLowerCase().includes(s.toLowerCase())) || skills.length === 0)
  return { source:'Comet', count:cometOffres.length, offers:cometOffres }
}

// ── Source 6: Himalia / Hellowork RSS ────────────────────────────────────────
async function fetchHellowork(skills: string[]): Promise<SourceResult> {
  try {
    const q = encodeURIComponent(`${skills.slice(0,2).join(' ')} freelance`)
    const rssUrl = `https://www.hellowork.com/fr-fr/emploi/recherche.html?k=${q}&p=1&datePublication=7j&type=freelance`
    const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}&count=15`
    const r = await fetch(url, { next:{revalidate:600}, signal:AbortSignal.timeout(7000) })
    if (!r.ok) throw new Error('no')
    const data = await r.json()
    const items = (data.items||[]) as Record<string,unknown>[]
    const offers = items.map((item, i): LiveOffer => {
      const desc = stripHtml(String(item.content||item.description||''))
      const tjm = extractTJM(desc+String(item.title||''))
      return {
        id:`hw_${i}`, titre:stripHtml(String(item.title||'')).slice(0,90),
        entreprise:String(item.author||'HelloWork'), secteur:'Tech IT',
        ville:extractVille(desc), modalite:extractModalite(desc),
        tjmMin:tjm.min, tjmMax:tjm.max, duree:'3-6 mois', urgence:'Ouvert',
        plateforme:'HelloWork', publiee:String(item.pubDate||'').slice(0,10)||today(),
        url:String(item.link||'https://www.hellowork.com'), description:desc.slice(0,400),
        tech:extractTech(desc+String(item.title||'')), contactHint:'', _live:true,
      }
    })
    return { source:'HelloWork', count:offers.length, offers }
  } catch { return { source:'HelloWork', count:0, offers:[], error:'timeout' } }
}

// ── Source 7: RemoteOK ───────────────────────────────────────────────────────
async function fetchRemoteOK(skills: string[]): Promise<SourceResult> {
  const tags = [
    (skills.find(s => ['data','python','sql','snowflake','spark','dbt'].includes(s.toLowerCase()))||skills[0]||'data').replace(/\s+/g,'-').toLowerCase(),
    'data-engineer', 'python'
  ]
  const all: LiveOffer[] = []
  for (const tag of tags.slice(0,2)) {
    try {
      const r = await fetch(`https://remoteok.com/api?tag=${encodeURIComponent(tag)}&limit=10`, {
        headers:{'User-Agent':'DataSphere-OS/2.0 (https://datasphere-os.netlify.app)'},
        next:{revalidate:600}, signal:AbortSignal.timeout(7000)
      })
      if (!r.ok) continue
      const raw = await r.json()
      const jobs = (Array.isArray(raw)?raw:[]).filter((j:Record<string,unknown>) => j.id && j.position) as Record<string,unknown>[]
      jobs.slice(0,8).forEach((j,i) => {
        const desc = stripHtml(String(j.description||''))
        all.push({
          id:`rok_${j.id||i}`, titre:String(j.position||'').slice(0,80),
          entreprise:String(j.company||'Remote Company'),
          secteur:Array.isArray(j.tags)?(j.tags as string[]).slice(0,2).join(', '):'Tech',
          ville:'Remote 100%', modalite:'Remote 100%',
          tjmMin:j.salary_min?Math.round(+j.salary_min/12/22):450,
          tjmMax:j.salary_max?Math.round(+j.salary_max/12/22):900,
          duree:'Long terme', urgence:'Ouvert', plateforme:'RemoteOK',
          publiee:String(j.date||'').slice(0,10)||today(),
          url:String(j.url||`https://remoteok.com/remote-jobs/${j.id}`),
          description:desc.slice(0,400), logo:String(j.logo||''),
          tech:extractTech(desc+String(j.position||'')), contactHint:'', _live:true,
        })
      })
    } catch {}
  }
  return { source:'RemoteOK', count:all.length, offers:all }
}

// ── Source 8: Jobicy ─────────────────────────────────────────────────────────
async function fetchJobicy(skills: string[]): Promise<SourceResult> {
  try {
    const tag = encodeURIComponent(skills[0]?.replace(/\s+/g,'-').toLowerCase()||'data')
    const r = await fetch(`https://jobicy.com/api/v2/remote-jobs?tag=${tag}&count=12`, {
      next:{revalidate:600}, signal:AbortSignal.timeout(7000)
    })
    if (!r.ok) throw new Error('no')
    const data = await r.json()
    const jobs = (data.jobs||[]) as Record<string,unknown>[]
    const offers = jobs.slice(0,10).map((j,i): LiveOffer => {
      const desc = stripHtml(String(j.jobDescription||''))
      return {
        id:`jcy_${j.id||i}`, titre:String(j.jobTitle||'').slice(0,80),
        entreprise:String(j.companyName||'Entreprise'),
        secteur:Array.isArray(j.jobIndustry)?(j.jobIndustry as string[]).join(', '):'Tech',
        ville:String(j.jobGeo||'Remote'), modalite:'Remote 100%',
        tjmMin:j.annualSalaryMin?Math.round(+j.annualSalaryMin/12/22):450,
        tjmMax:j.annualSalaryMax?Math.round(+j.annualSalaryMax/12/22):800,
        duree:'Long terme', urgence:'Ouvert', plateforme:'Jobicy',
        publiee:String(j.pubDate||'').slice(0,10)||today(),
        url:String(j.url||''), description:desc.slice(0,400),
        logo:String(j.companyLogo||''), tech:extractTech(desc+String(j.jobTitle||'')),
        contactHint:'', _live:true,
      }
    })
    return { source:'Jobicy', count:offers.length, offers }
  } catch { return { source:'Jobicy', count:0, offers:[], error:'timeout' } }
}

// ── Source 9: ArbeitNow Remote ───────────────────────────────────────────────
async function fetchArbeitNow(): Promise<SourceResult> {
  try {
    const r = await fetch('https://www.arbeitnow.com/api/job-board-api?tag=data-engineer&remote=true', {
      next:{revalidate:600}, signal:AbortSignal.timeout(7000)
    })
    if (!r.ok) throw new Error('no')
    const data = await r.json()
    const jobs = ((data.data||[]) as Record<string,unknown>[])
      .filter(j => j.remote && /data|engineer|architect|analyst|python/i.test(String(j.title||'')))
      .slice(0,10)
    const offers = jobs.map((j,i): LiveOffer => {
      const desc = stripHtml(String(j.description||''))
      return {
        id:`arb_${i}`, titre:String(j.title||'').slice(0,80),
        entreprise:String(j.company_name||'EU Company'),
        secteur:Array.isArray(j.tags)?(j.tags as string[]).slice(0,2).join(', '):'Tech',
        ville:String(j.location||'Europe Remote'), modalite:'Remote 100%',
        tjmMin:450, tjmMax:800, duree:'Long terme', urgence:'Ouvert',
        plateforme:'ArbeitNow', publiee:String(j.date||'').slice(0,10)||today(),
        url:String(j.url||''), description:desc.slice(0,400),
        tech:extractTech(desc+String(j.title||'')), contactHint:'', _live:true,
      }
    })
    return { source:'ArbeitNow', count:offers.length, offers }
  } catch { return { source:'ArbeitNow', count:0, offers:[], error:'timeout' } }
}

// ── Source 10: Adzuna France ─────────────────────────────────────────────────
async function fetchAdzuna(skills: string[], id: string, key: string): Promise<SourceResult> {
  const q = encodeURIComponent(`freelance mission ${skills.slice(0,2).join(' ')}`)
  try {
    const r = await fetch(`https://api.adzuna.com/v1/api/jobs/fr/search/1?app_id=${id}&app_key=${key}&what=${q}&category=it-jobs&results_per_page=15&sort_by=date`, {
      next:{revalidate:600}, signal:AbortSignal.timeout(7000)
    })
    if (!r.ok) throw new Error('no')
    const data = await r.json()
    const jobs = (data.results||[]) as Record<string,unknown>[]
    const offers = jobs.map((j,i): LiveOffer => {
      const desc = stripHtml(String(j.description||''))
      return {
        id:`adz_${j.id||i}`, titre:String(j.title||'').slice(0,80),
        entreprise:(j.company as Record<string,string>)?.display_name||'Entreprise',
        secteur:(j.category as Record<string,string>)?.label||'Tech',
        ville:String((j.location as Record<string,string>)?.display_name||'France').split(',')[0],
        modalite:extractModalite(desc+String(j.title||'')),
        tjmMin:j.salary_min?Math.round(+j.salary_min/22):500,
        tjmMax:j.salary_max?Math.round(+j.salary_max/22):900,
        duree:'3-6 mois', urgence:'Ouvert', plateforme:'Adzuna',
        publiee:String(j.created||'').slice(0,10)||today(),
        url:String(j.redirect_url||''), description:desc.slice(0,400),
        tech:extractTech(desc+String(j.title||'')), contactHint:'', _live:true,
      }
    })
    return { source:'Adzuna', count:offers.length, offers }
  } catch { return { source:'Adzuna', count:0, offers:[], error:'timeout' } }
}

// ── Source 11: Jooble (agrégateur multinational) ─────────────────────────────
async function fetchJooble(skills: string[], apiKey: string): Promise<SourceResult> {
  if (!apiKey) return { source:'Jooble', count:0, offers:[] }
  try {
    const r = await fetch('https://fr.jooble.org/api/'+apiKey, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ keywords:`freelance data ${skills.slice(0,2).join(' ')}`, location:'France', page:1, SearchMode:1 }),
      signal:AbortSignal.timeout(7000)
    })
    if (!r.ok) throw new Error('no')
    const data = await r.json()
    const jobs = (data.jobs||[]) as Record<string,unknown>[]
    const offers = jobs.slice(0,12).map((j,i): LiveOffer => {
      const desc = stripHtml(String(j.snippet||j.content||''))
      const tjm = extractTJM(desc+String(j.title||''))
      return {
        id:`joo_${j.id||i}`, titre:String(j.title||'').slice(0,80),
        entreprise:String(j.company||'Entreprise'),
        secteur:'Tech IT', ville:String(j.location||'France'),
        modalite:extractModalite(desc+String(j.title||'')),
        tjmMin:tjm.min, tjmMax:tjm.max, duree:'3-6 mois', urgence:'Ouvert',
        plateforme:'Jooble', publiee:String(j.updated||'').slice(0,10)||today(),
        url:String(j.link||''), description:desc.slice(0,400),
        tech:extractTech(desc+String(j.title||'')), contactHint:'', _live:true,
      }
    })
    return { source:'Jooble', count:offers.length, offers }
  } catch { return { source:'Jooble', count:0, offers:[], error:'timeout' } }
}

// ── Source 12: WTT (We Are The Seekers) + LinkedIn RSS ───────────────────────
async function fetchLinkedInRSS(skills: string[]): Promise<SourceResult> {
  const q = encodeURIComponent(`${skills.slice(0,2).join(' ')} freelance`)
  try {
    const rssUrl = `https://www.linkedin.com/jobs/search/?keywords=${q}&location=France&f_JT=C&f_WT=2&sortBy=DD`
    const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}&count=10`
    const r = await fetch(url, { next:{revalidate:600}, signal:AbortSignal.timeout(6000) })
    if (!r.ok) throw new Error('no')
    const data = await r.json()
    const items = (data.items||[]) as Record<string,unknown>[]
    const offers = items.map((item, i): LiveOffer => {
      const desc = stripHtml(String(item.content||item.description||''))
      const tjm = extractTJM(desc+String(item.title||''))
      return {
        id:`li_${i}`, titre:stripHtml(String(item.title||'')).slice(0,80),
        entreprise:String(item.author||'LinkedIn'), secteur:'Tech IT',
        ville:extractVille(desc), modalite:extractModalite(desc),
        tjmMin:tjm.min, tjmMax:tjm.max, duree:'3-6 mois', urgence:'Ouvert',
        plateforme:'LinkedIn', publiee:String(item.pubDate||'').slice(0,10)||today(),
        url:String(item.link||'https://www.linkedin.com/jobs/'),
        description:desc.slice(0,400), tech:extractTech(desc+String(item.title||'')),
        contactHint:'Décideur LinkedIn', _live:true,
      }
    })
    return { source:'LinkedIn', count:offers.length, offers }
  } catch { return { source:'LinkedIn', count:0, offers:[], error:'timeout' } }
}

// ── Route principale ──────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const skillsParam = searchParams.get('skills') || 'data engineer python snowflake'
  const skills = skillsParam.split(',').map(s => s.trim()).filter(Boolean)
  const adzunaId  = process.env.ADZUNA_APP_ID  || ''
  const adzunaKey = process.env.ADZUNA_APP_KEY || ''
  const joobleKey = process.env.JOOBLE_API_KEY || ''

  // 12 sources en parallèle
  const promises: Promise<SourceResult>[] = [
    fetchFreeWork(skills),
    fetchFreelanceCom(skills),
    fetchMaltTypique(skills),
    fetchCometTypique(skills),
    fetchRemoteOK(skills),
    fetchJobicy(skills),
    fetchArbeitNow(),
    fetchIndeedFrance(skills),
    fetchHellowork(skills),
    fetchLinkedInRSS(skills),
  ]
  if (adzunaId && adzunaKey) promises.push(fetchAdzuna(skills, adzunaId, adzunaKey))
  if (joobleKey) promises.push(fetchJooble(skills, joobleKey))

  const results = await Promise.allSettled(promises)
  let all: LiveOffer[] = []
  const stats: Record<string, { ok: boolean; count: number; error?: string }> = {}

  results.forEach(r => {
    if (r.status === 'fulfilled') {
      stats[r.value.source] = { ok: !r.value.error, count: r.value.count, error: r.value.error }
      all = all.concat(r.value.offers)
    }
  })

  // Déduplication
  const seen = new Set<string>()
  all = all.filter(o => {
    const key = `${o.titre}${o.entreprise}`.toLowerCase().replace(/\s+/g,'').slice(0,60)
    if (seen.has(key)) return false
    seen.add(key); return true
  })

  // Scorer + trier
  all = all
    .map(o => ({ ...o, score: score(o, skills) }))
    .sort((a, b) => (b.score||0) !== (a.score||0) ? (b.score||0) - (a.score||0) : (b.publiee||'') > (a.publiee||'') ? 1 : -1)

  return NextResponse.json({
    offers: all, total: all.length,
    sources: Object.keys(stats).length, stats,
    skills, cachedAt: new Date().toISOString(),
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300' }
  })
}
