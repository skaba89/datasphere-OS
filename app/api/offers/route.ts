// app/api/offers/route.ts — Sources d'offres freelance RÉELLES
import { NextRequest, NextResponse } from 'next/server'
import type { LiveOffer } from '@/types'

interface SourceResult { source: string; offers: LiveOffer[]; count: number; error?: string }

// ── Helpers ─────────────────────────────────────────────────────────
function stripHtml(html: string): string {
  return html.replace(/<!\[CDATA\[/g,'').replace(/\]\]>/g,'')
    .replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<')
    .replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'")
    .replace(/\s+/g,' ').trim()
}

function extractTJM(text: string): { min: number; max: number } {
  // "700 - 900 €/j" ou "800€/jour" ou "700 à 900€"
  const range = text.match(/(\d{3,4})\s*[-–à]\s*(\d{3,4})\s*[€$]?\s*\/?(?:j(?:our)?|day)/i)
  if (range) return { min: parseInt(range[1]), max: parseInt(range[2]) }
  const single = text.match(/(\d{3,4})\s*[€$]\s*\/?(?:j(?:our)?|day)/i)
  if (single) { const v = parseInt(single[1]); return { min: Math.round(v*.85), max: Math.round(v*1.15) } }
  const annual = text.match(/(\d{2,3})\s*k\s*[€$]/i)
  if (annual) { const a = parseInt(annual[1])*1000; return { min: Math.round(a/220*.8), max: Math.round(a/220*1.1) } }
  return { min: 500, max: 850 }
}

function extractModalite(text: string): string {
  const t = text.toLowerCase()
  if (/remote\s*100|full.?remote|100.*t[eé]l[eé]travail|t[eé]l[eé]travail\s*complet/.test(t)) return 'Remote 100%'
  if (/hybride|hybrid|partiel/.test(t)) return 'Hybride'
  if (/remote|t[eé]l[eé]travail/.test(t)) return 'Hybride'
  return 'Hybride'
}

function extractVille(text: string): string {
  const m = text.match(/\b(Paris|Lyon|Marseille|Bordeaux|Toulouse|Nantes|Lille|Strasbourg|Rennes|Nice|Grenoble|Montpellier)\b/i)
  return m ? m[1] : 'France'
}

function extractTech(text: string): string[] {
  const TECHS = [
    'Python','SQL','Spark','PySpark','Snowflake','DBT','dbt','Airflow','Kafka',
    'AWS','GCP','Azure','Docker','Kubernetes','Terraform','Databricks',
    'Power BI','Tableau','BigQuery','Redshift','PostgreSQL','MongoDB',
    'TypeScript','JavaScript','React','Node.js','Java','Scala','Go','Rust',
    'Pandas','NumPy','scikit-learn','TensorFlow','PyTorch','MLflow',
    'Looker','Metabase','dbt Core','Great Expectations','Fivetran','Airbyte',
    'Synapse','Fabric','Vertex AI','SageMaker','Dataflow','Flink'
  ]
  return TECHS.filter(t => new RegExp('\\b'+t.replace(/[.+]/g,'\\$&')+'\\b','i').test(text)).slice(0,7)
}

function score(offer: Partial<LiveOffer>, skills: string[]): number {
  const text = `${offer.titre} ${offer.description} ${(offer.tech||[]).join(' ')}`.toLowerCase()
  const matches = skills.filter(s => text.includes(s.toLowerCase())).length
  return Math.min(96, 38 + Math.round(matches / Math.max(1, skills.length) * 58))
}

function today(): string { return new Date().toISOString().slice(0,10) }

// ── Source 1: Free-Work RSS (offres France) ──────────────────────────
async function fetchFreeWork(skills: string[]): Promise<SourceResult> {
  const q = encodeURIComponent(skills.slice(0,3).join(' '))
  const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent('https://www.free-work.com/fr/tech-it/jobs.rss?search='+q)}&count=25&order_by=pubDate&order_dir=desc`
  try {
    const r = await fetch(url, { next: { revalidate: 600 }, signal: AbortSignal.timeout(8000) })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const data = await r.json()
    const items = (data.items || []) as Record<string,unknown>[]
    return {
      source: 'Free-Work', count: items.length,
      offers: items.map((item, i): LiveOffer => {
        const desc = stripHtml(String(item.content || item.description || ''))
        const tjm  = extractTJM(desc + String(item.title || ''))
        return {
          id:         `fw_${i}_${Date.now()}`,
          titre:      stripHtml(String(item.title || '')).slice(0,80),
          entreprise: String(item.author || 'Mission Free-Work'),
          secteur:    'Tech IT',
          ville:      extractVille(desc + String(item.title || '')),
          modalite:   extractModalite(desc + String(item.title || '')),
          tjmMin:     tjm.min, tjmMax: tjm.max,
          duree:      '3-6 mois',
          urgence:    'Ouvert',
          plateforme: 'Free-Work',
          publiee:    String(item.pubDate || '').slice(0,10) || today(),
          url:        String(item.link || 'https://www.free-work.com/fr/tech-it/jobs'),
          description: desc.slice(0,400),
          tech:       extractTech(desc + String(item.title || '')),
          _live:      true,
        }
      })
    }
  } catch(e) { return { source: 'Free-Work', offers: [], count: 0, error: String(e) } }
}

// ── Source 2: Indeed France RSS ──────────────────────────────────────
async function fetchIndeedFrance(skills: string[]): Promise<SourceResult> {
  const q = encodeURIComponent(`freelance ${skills.slice(0,2).join(' ')}`)
  const rssUrl = `https://fr.indeed.com/rss?q=${q}&l=France&sort=date`
  const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}&count=20`
  try {
    const r = await fetch(url, { next: { revalidate: 600 }, signal: AbortSignal.timeout(8000) })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const data = await r.json()
    const items = (data.items || []) as Record<string,unknown>[]
    return {
      source: 'Indeed FR', count: items.length,
      offers: items.map((item, i): LiveOffer => {
        const desc = stripHtml(String(item.content || item.description || ''))
        const tjm  = extractTJM(desc + String(item.title || ''))
        return {
          id:         `indeed_${i}_${Date.now()}`,
          titre:      stripHtml(String(item.title || '')).replace(/\s*-\s*Indeed.*$/i,'').slice(0,80),
          entreprise: String(item.author || 'Entreprise').split(' - ').pop() || 'Entreprise',
          secteur:    'Tech IT',
          ville:      extractVille(desc + String(item.link || '')),
          modalite:   extractModalite(desc + String(item.title || '')),
          tjmMin:     tjm.min, tjmMax: tjm.max,
          duree:      '3-12 mois',
          urgence:    'Ouvert',
          plateforme: 'Indeed',
          publiee:    String(item.pubDate || '').slice(0,10) || today(),
          url:        String(item.link || 'https://fr.indeed.com'),
          description: desc.slice(0,400),
          tech:       extractTech(desc + String(item.title || '')),
          _live:      true,
        }
      })
    }
  } catch(e) { return { source: 'Indeed FR', offers: [], count: 0, error: String(e) } }
}

// ── Source 3: Jobboard freelance.com RSS ────────────────────────────
async function fetchFreelanceCom(skills: string[]): Promise<SourceResult> {
  const q = encodeURIComponent(skills.slice(0,2).join('+'))
  const rssUrl = `https://www.freelance.com/offres-de-mission/rss.php?search=${q}&type=1`
  const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}&count=20`
  try {
    const r = await fetch(url, { next: { revalidate: 600 }, signal: AbortSignal.timeout(8000) })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const data = await r.json()
    const items = (data.items || []) as Record<string,unknown>[]
    return {
      source: 'Freelance.com', count: items.length,
      offers: items.map((item, i): LiveOffer => {
        const desc = stripHtml(String(item.content || item.description || ''))
        const tjm  = extractTJM(desc + String(item.title || ''))
        return {
          id:         `flc_${i}_${Date.now()}`,
          titre:      stripHtml(String(item.title || '')).slice(0,80),
          entreprise: String(item.author || 'Client Freelance.com'),
          secteur:    'Tech IT',
          ville:      extractVille(desc),
          modalite:   extractModalite(desc),
          tjmMin:     tjm.min, tjmMax: tjm.max,
          duree:      '3-6 mois',
          urgence:    'Ouvert',
          plateforme: 'Freelance.com',
          publiee:    String(item.pubDate || '').slice(0,10) || today(),
          url:        String(item.link || 'https://www.freelance.com'),
          description: desc.slice(0,400),
          tech:       extractTech(desc + String(item.title || '')),
          _live:      true,
        }
      })
    }
  } catch(e) { return { source: 'Freelance.com', offers: [], count: 0, error: String(e) } }
}

// ── Source 4: RemoteOK (international, remote) ───────────────────────
async function fetchRemoteOK(skills: string[]): Promise<SourceResult> {
  const tag = encodeURIComponent(
    (skills.find(s => ['data','python','sql','snowflake','spark'].includes(s.toLowerCase())) || skills[0] || 'data')
      .replace(/\s+/g,'-').toLowerCase()
  )
  try {
    const r = await fetch(`https://remoteok.com/api?tag=${tag}&limit=15`, {
      headers: { 'User-Agent': 'DataSphere-OS/2.0 (https://datasphere-os.netlify.app)' },
      next: { revalidate: 600 }, signal: AbortSignal.timeout(8000)
    })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const raw = await r.json()
    const jobs = (Array.isArray(raw) ? raw : []).filter((j: Record<string,unknown>) => j.id && j.position) as Record<string,unknown>[]
    return {
      source: 'RemoteOK', count: jobs.length,
      offers: jobs.slice(0,12).map((j, i): LiveOffer => {
        const desc = stripHtml(String(j.description || ''))
        return {
          id:         `rok_${j.id || i}`,
          titre:      String(j.position || '').slice(0,80),
          entreprise: String(j.company || 'Remote Company'),
          secteur:    Array.isArray(j.tags) ? (j.tags as string[]).slice(0,3).join(', ') : 'Tech',
          ville:      'Remote 100%',
          modalite:   'Remote 100%',
          tjmMin:     j.salary_min ? Math.round(Number(j.salary_min)/12/22) : 500,
          tjmMax:     j.salary_max ? Math.round(Number(j.salary_max)/12/22) : 900,
          duree:      'Long terme',
          urgence:    'Ouvert',
          plateforme: 'RemoteOK',
          publiee:    String(j.date || '').slice(0,10) || today(),
          url:        String(j.url || `https://remoteok.com/remote-jobs/${j.id}`),
          description: desc.slice(0,400),
          logo:        String(j.logo || ''),
          tech:       extractTech(desc + String(j.position || '')),
          _live:      true,
        }
      })
    }
  } catch(e) { return { source: 'RemoteOK', offers: [], count: 0, error: String(e) } }
}

// ── Source 5: Jobicy (remote jobs) ──────────────────────────────────
async function fetchJobicy(skills: string[]): Promise<SourceResult> {
  const tag = encodeURIComponent(skills[0]?.replace(/\s+/g,'-').toLowerCase() || 'data')
  try {
    const r = await fetch(`https://jobicy.com/api/v2/remote-jobs?tag=${tag}&count=12`, {
      next: { revalidate: 600 }, signal: AbortSignal.timeout(8000)
    })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const data = await r.json()
    const jobs = (data.jobs || []) as Record<string,unknown>[]
    return {
      source: 'Jobicy', count: jobs.length,
      offers: jobs.slice(0,12).map((j, i): LiveOffer => {
        const desc = stripHtml(String(j.jobDescription || ''))
        return {
          id:         `jcy_${j.id || i}`,
          titre:      String(j.jobTitle || '').slice(0,80),
          entreprise: String(j.companyName || 'Entreprise'),
          secteur:    Array.isArray(j.jobIndustry) ? (j.jobIndustry as string[]).join(', ') : 'Tech',
          ville:      String(j.jobGeo || 'Remote'),
          modalite:   'Remote 100%',
          tjmMin:     j.annualSalaryMin ? Math.round(Number(j.annualSalaryMin)/12/22) : 450,
          tjmMax:     j.annualSalaryMax ? Math.round(Number(j.annualSalaryMax)/12/22) : 800,
          duree:      'Long terme',
          urgence:    'Ouvert',
          plateforme: 'Jobicy',
          publiee:    String(j.pubDate || '').slice(0,10) || today(),
          url:        String(j.url || ''),
          description: desc.slice(0,400),
          logo:        String(j.companyLogo || ''),
          tech:       extractTech(desc + String(j.jobTitle || '')),
          _live:      true,
        }
      })
    }
  } catch(e) { return { source: 'Jobicy', offers: [], count: 0, error: String(e) } }
}

// ── Source 6: Adzuna France (si clés configurées) ──────────────────
async function fetchAdzuna(skills: string[], appId: string, appKey: string): Promise<SourceResult> {
  const q = encodeURIComponent(`freelance mission ${skills.slice(0,2).join(' ')}`)
  const url = `https://api.adzuna.com/v1/api/jobs/fr/search/1?app_id=${appId}&app_key=${appKey}&what=${q}&category=it-jobs&results_per_page=15&sort_by=date`
  try {
    const r = await fetch(url, { next: { revalidate: 600 }, signal: AbortSignal.timeout(8000) })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const data = await r.json()
    const jobs = (data.results || []) as Record<string,unknown>[]
    return {
      source: 'Adzuna', count: jobs.length,
      offers: jobs.map((j, i): LiveOffer => {
        const desc = stripHtml(String(j.description || ''))
        return {
          id:         `adz_${j.id || i}`,
          titre:      String(j.title || '').slice(0,80),
          entreprise: (j.company as Record<string,string>)?.display_name || 'Entreprise',
          secteur:    (j.category as Record<string,string>)?.label || 'Tech',
          ville:      String((j.location as Record<string,string>)?.display_name || 'France').split(',')[0],
          modalite:   extractModalite(desc + String(j.title || '')),
          tjmMin:     j.salary_min ? Math.round(Number(j.salary_min)/22) : 500,
          tjmMax:     j.salary_max ? Math.round(Number(j.salary_max)/22) : 900,
          duree:      '3-6 mois',
          urgence:    'Ouvert',
          plateforme: 'Adzuna',
          publiee:    String(j.created || '').slice(0,10) || today(),
          url:        String(j.redirect_url || ''),
          description: desc.slice(0,400),
          tech:       extractTech(desc + String(j.title || '')),
          _live:      true,
        }
      })
    }
  } catch(e) { return { source: 'Adzuna', offers: [], count: 0, error: String(e) } }
}

// ── Source 7: ArbeitNow remote ──────────────────────────────────────
async function fetchArbeitNow(): Promise<SourceResult> {
  try {
    const r = await fetch('https://www.arbeitnow.com/api/job-board-api?tag=data-engineer&remote=true', {
      next: { revalidate: 600 }, signal: AbortSignal.timeout(8000)
    })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const data = await r.json()
    const jobs = ((data.data || []) as Record<string,unknown>[])
      .filter(j => j.remote && /data|engineer|architect|analyst|python/i.test(String(j.title||'')))
      .slice(0,10)
    return {
      source: 'ArbeitNow', count: jobs.length,
      offers: jobs.map((j, i): LiveOffer => {
        const desc = stripHtml(String(j.description || ''))
        return {
          id:         `arb_${i}_${Date.now()}`,
          titre:      String(j.title || '').slice(0,80),
          entreprise: String(j.company_name || 'EU Company'),
          secteur:    Array.isArray(j.tags) ? (j.tags as string[]).slice(0,2).join(', ') : 'Tech',
          ville:      String(j.location || 'Europe Remote'),
          modalite:   'Remote 100%',
          tjmMin:     450, tjmMax: 800,
          duree:      'Long terme',
          urgence:    'Ouvert',
          plateforme: 'ArbeitNow',
          publiee:    String(j.date || '').slice(0,10) || today(),
          url:        String(j.url || ''),
          description: desc.slice(0,400),
          tech:       extractTech(desc + String(j.title || '')),
          _live:      true,
        }
      })
    }
  } catch(e) { return { source: 'ArbeitNow', offers: [], count: 0, error: String(e) } }
}

// ── Route principale ─────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const skillsParam = searchParams.get('skills') || 'data engineer python snowflake'
  const skills = skillsParam.split(',').map(s => s.trim()).filter(Boolean)
  const adzunaId  = process.env.ADZUNA_APP_ID  || ''
  const adzunaKey = process.env.ADZUNA_APP_KEY || ''

  // Lancer toutes les sources en parallèle
  const promises: Promise<SourceResult>[] = [
    fetchFreeWork(skills),
    fetchFreelanceCom(skills),
    fetchRemoteOK(skills),
    fetchJobicy(skills),
    fetchArbeitNow(),
    fetchIndeedFrance(skills),
  ]
  if (adzunaId && adzunaKey) promises.push(fetchAdzuna(skills, adzunaId, adzunaKey))

  const results = await Promise.allSettled(promises)

  let all: LiveOffer[] = []
  const stats: Record<string, { ok: boolean; count: number; error?: string }> = {}

  results.forEach(r => {
    if (r.status === 'fulfilled') {
      stats[r.value.source] = { ok: !r.value.error, count: r.value.count, error: r.value.error }
      all = all.concat(r.value.offers)
    }
  })

  // Déduplication par titre+entreprise
  const seen = new Set<string>()
  all = all.filter(o => {
    const key = `${o.titre}${o.entreprise}`.toLowerCase().replace(/\s+/g,'').slice(0,50)
    if (seen.has(key)) return false
    seen.add(key); return true
  })

  // Scorer + trier
  all = all
    .map(o => ({ ...o, score: score(o, skills) }))
    .sort((a, b) => {
      if ((b.score||0) !== (a.score||0)) return (b.score||0) - (a.score||0)
      return (b.publiee||'') > (a.publiee||'') ? 1 : -1
    })

  return NextResponse.json({
    offers: all, total: all.length,
    sources: Object.keys(stats).length, stats,
    skills, cachedAt: new Date().toISOString(),
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300' }
  })
}
