// app/api/offers/route.ts
// ═══════════════════════════════════════════════════
// API Route — Agrège les offres de toutes les sources
// Cache serveur 10 minutes (ISR-like via headers)
// ═══════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server'
import type { LiveOffer } from '@/types'

interface SourceResult {
  source:  string
  offers:  LiveOffer[]
  error?:  string
  count:   number
}

// ── Helpers ──────────────────────────────────────────
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function extractTJM(text: string): { min: number; max: number } {
  const m = text.match(/(\d{3,4})\D+(\d{3,4})\s*(?:€|EUR)?\s*\/?\s*(?:jour|j|day)/i)
  if (m) return { min: parseInt(m[1]), max: parseInt(m[2]) }
  const s = text.match(/(\d{3,4})\s*(?:€|EUR)\s*\/?\s*(?:jour|j)/i)
  if (s) { const v = parseInt(s[1]); return { min: Math.round(v*.85), max: Math.round(v*1.15) } }
  const k = text.match(/(\d{2,3})\s*k\s*€/i)
  if (k) { const a = parseInt(k[1])*1000; return { min: Math.round(a/12/22*.9), max: Math.round(a/12/22*1.1) } }
  return { min: 500, max: 800 }
}

function extractModalite(text: string): string {
  const t = text.toLowerCase()
  if (t.includes('remote 100%') || t.includes('full remote') || t.includes('100% télétravail')) return 'Remote 100%'
  if (t.includes('hybride') || t.includes('hybrid')) return 'Hybride'
  if (t.includes('remote') || t.includes('télétravail')) return 'Remote 100%'
  return 'Hybride'
}

function extractTech(text: string): string[] {
  const TECHS = ['Python','SQL','Spark','Snowflake','DBT','Airflow','Kafka','AWS','GCP',
    'Azure','Docker','Kubernetes','Terraform','Databricks','Power BI','Tableau',
    'BigQuery','Redshift','PostgreSQL','MongoDB','dbt','React','TypeScript','Java','Scala']
  return TECHS.filter(t => text.toLowerCase().includes(t.toLowerCase())).slice(0, 6)
}

function quickScore(offer: Partial<LiveOffer>, cvSkills: string[]): number {
  const text = `${offer.titre} ${offer.description} ${(offer.tech||[]).join(' ')}`.toLowerCase()
  const matches = cvSkills.filter(s => text.includes(s.toLowerCase())).length
  return Math.min(95, 40 + Math.round((matches / Math.max(1, cvSkills.length)) * 55))
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

// ── Source : Adzuna ───────────────────────────────────
async function fetchAdzuna(skills: string[], appId: string, appKey: string): Promise<SourceResult> {
  const query   = encodeURIComponent(`freelance ${skills.slice(0, 2).join(' ')}`)
  const url     = `https://api.adzuna.com/v1/api/jobs/fr/search/1?app_id=${appId}&app_key=${appKey}&what=${query}&category=it-jobs&results_per_page=20&sort_by=date&content-type=application/json`
  try {
    const res    = await fetch(url, { next: { revalidate: 600 } })
    const data   = await res.json()
    const offers = (data.results || []).map((j: Record<string,unknown>, i: number): LiveOffer => ({
      id:          `adzuna_${j.id || i}`,
      titre:       String(j.title || '').slice(0, 80),
      entreprise:  (j.company as Record<string,string>)?.display_name || 'Entreprise',
      secteur:     (j.category as Record<string,string>)?.label || 'Tech',
      ville:       String((j.location as Record<string,string>)?.display_name || 'France').split(',')[0],
      modalite:    extractModalite(String(j.title)),
      tjmMin:      j.salary_min ? Math.round(Number(j.salary_min) / 22) : 500,
      tjmMax:      j.salary_max ? Math.round(Number(j.salary_max) / 22) : 800,
      duree:       '6 mois',
      urgence:     'Ouvert',
      plateforme:  'Adzuna',
      publiee:     String(j.created || '').slice(0, 10) || today(),
      url:         String(j.redirect_url || ''),
      description: stripHtml(String(j.description || '')).slice(0, 300),
      tech:        extractTech(String(j.description || '') + String(j.title || '')),
      _live:       true,
    }))
    return { source: 'adzuna', offers, count: offers.length }
  } catch (e) {
    return { source: 'adzuna', offers: [], count: 0, error: String(e) }
  }
}

// ── Source : RemoteOK ─────────────────────────────────
async function fetchRemoteOK(skills: string[]): Promise<SourceResult> {
  const tag = encodeURIComponent(skills[0]?.replace(/\s+/g,'-').toLowerCase() || 'data-engineer')
  try {
    const res  = await fetch(`https://remoteok.com/api?tag=${tag}&limit=20`, {
      headers: { 'User-Agent': 'DataSphere-OS/1.0' },
      next: { revalidate: 600 }
    })
    const raw  = await res.json()
    const jobs = (Array.isArray(raw) ? raw : []).filter((j: Record<string,unknown>) => j.id && j.position)
    const offers = jobs.slice(0, 15).map((j: Record<string,unknown>, i: number): LiveOffer => ({
      id:          `remoteok_${j.id || i}`,
      titre:       String(j.position || '').slice(0, 80),
      entreprise:  String(j.company || 'Remote Company'),
      secteur:     Array.isArray(j.tags) ? j.tags.join(', ') : 'Tech',
      ville:       'Remote 100%',
      modalite:    'Remote 100%',
      telework:    'Full Remote',
      tjmMin:      j.salary_min ? Math.round(Number(j.salary_min) / 12 / 22) : 500,
      tjmMax:      j.salary_max ? Math.round(Number(j.salary_max) / 12 / 22) : 800,
      duree:       'Long terme',
      urgence:     'Ouvert',
      plateforme:  'RemoteOK',
      publiee:     String(j.date || '').slice(0, 10) || today(),
      url:         String(j.url || `https://remoteok.com/remote-jobs/${j.id}`),
      description: stripHtml(String(j.description || '')).slice(0, 300),
      logo:        String(j.logo || ''),
      tech:        extractTech(String(j.description || '') + String(j.position || '')),
      _live:       true,
    }))
    return { source: 'remoteok', offers, count: offers.length }
  } catch (e) {
    return { source: 'remoteok', offers: [], count: 0, error: String(e) }
  }
}

// ── Source : Jobicy ───────────────────────────────────
async function fetchJobicy(skills: string[]): Promise<SourceResult> {
  const tag = encodeURIComponent(skills[0]?.replace(/\s+/g,'-').toLowerCase() || 'data')
  try {
    const res  = await fetch(`https://jobicy.com/api/v2/remote-jobs?tag=${tag}&count=15`, {
      next: { revalidate: 600 }
    })
    const data = await res.json()
    const jobs = (data.jobs || []) as Record<string,unknown>[]
    const offers = jobs.slice(0, 15).map((j, i): LiveOffer => ({
      id:          `jobicy_${j.id || i}`,
      titre:       String(j.jobTitle || '').slice(0, 80),
      entreprise:  String(j.companyName || 'Entreprise'),
      secteur:     Array.isArray(j.jobIndustry) ? j.jobIndustry.join(', ') : 'Tech',
      ville:       String(j.jobGeo || 'Remote'),
      modalite:    'Remote 100%',
      telework:    'Full Remote',
      tjmMin:      j.annualSalaryMin ? Math.round(Number(j.annualSalaryMin) / 12 / 22) : 450,
      tjmMax:      j.annualSalaryMax ? Math.round(Number(j.annualSalaryMax) / 12 / 22) : 750,
      duree:       'Long terme',
      urgence:     'Ouvert',
      plateforme:  'Jobicy',
      publiee:     String(j.pubDate || '').slice(0, 10) || today(),
      url:         String(j.url || ''),
      description: stripHtml(String(j.jobDescription || '')).slice(0, 300),
      logo:        String(j.companyLogo || ''),
      tech:        extractTech(String(j.jobDescription || '') + String(j.jobTitle || '')),
      _live:       true,
    }))
    return { source: 'jobicy', offers, count: offers.length }
  } catch (e) {
    return { source: 'jobicy', offers: [], count: 0, error: String(e) }
  }
}

// ── Source : ArbeitNow ────────────────────────────────
async function fetchArbeitNow(): Promise<SourceResult> {
  try {
    const res  = await fetch('https://www.arbeitnow.com/api/job-board-api?tag=data-engineer&remote=true', {
      next: { revalidate: 600 }
    })
    const data = await res.json()
    const jobs = (data.data || []) as Record<string,unknown>[]
    const offers = jobs
      .filter(j => j.remote && /data|engineer|architect|analyst/i.test(String(j.title || '')))
      .slice(0, 12)
      .map((j, i): LiveOffer => ({
        id:          `arbeitnow_${i}`,
        titre:       String(j.title || '').slice(0, 80),
        entreprise:  String(j.company_name || 'EU Company'),
        secteur:     Array.isArray(j.tags) ? j.tags.join(', ') : 'Tech',
        ville:       String(j.location || 'Europe Remote'),
        modalite:    'Remote 100%',
        telework:    'Full Remote',
        tjmMin:      450, tjmMax: 750,
        duree:       'Long terme',
        urgence:     'Ouvert',
        plateforme:  'ArbeitNow',
        publiee:     String(j.date || '').slice(0, 10) || today(),
        url:         String(j.url || ''),
        description: stripHtml(String(j.description || '')).slice(0, 300),
        tech:        extractTech(String(j.description || '') + String(j.title || '')),
        _live:       true,
      }))
    return { source: 'arbeitnow', offers, count: offers.length }
  } catch (e) {
    return { source: 'arbeitnow', offers: [], count: 0, error: String(e) }
  }
}

// ── Source : RSS Free-Work ────────────────────────────
async function fetchFreeWorkRSS(skills: string[]): Promise<SourceResult> {
  const search = encodeURIComponent(skills.slice(0,2).join(' '))
  const rssUrl = `https://www.free-work.com/fr/tech-it/jobs.rss?search=${search}`
  const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}&count=20`
  try {
    const res  = await fetch(apiUrl, { next: { revalidate: 600 } })
    const data = await res.json()
    const items = (data.items || []) as Record<string,unknown>[]
    const offers = items.map((item, i): LiveOffer => {
      const desc = stripHtml(String(item.description || item.content || ''))
      const tjm  = extractTJM(desc)
      return {
        id:          `fw_${i}`,
        titre:       String(item.title || '').slice(0, 80),
        entreprise:  String(item.author || 'Free-Work Mission'),
        secteur:     'Tech IT',
        ville:       'France',
        modalite:    extractModalite(String(item.title || '') + ' ' + desc),
        tjmMin:      tjm.min, tjmMax: tjm.max,
        duree:       '6 mois',
        urgence:     'Ouvert',
        plateforme:  'Free-Work',
        publiee:     String(item.pubDate || '').slice(0, 10) || today(),
        url:         String(item.link || 'https://www.free-work.com'),
        description: desc.slice(0, 300),
        tech:        extractTech(desc + String(item.title || '')),
        _live:       true,
      }
    })
    return { source: 'freework', offers, count: offers.length }
  } catch (e) {
    return { source: 'freework', offers: [], count: 0, error: String(e) }
  }
}

// ── Route principale ──────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const skillsParam = searchParams.get('skills') || 'data engineer'
  const skills      = skillsParam.split(',').map(s => s.trim()).filter(Boolean)

  const adzunaAppId  = process.env.ADZUNA_APP_ID  || searchParams.get('adzunaAppId')  || ''
  const adzunaAppKey = process.env.ADZUNA_APP_KEY || searchParams.get('adzunaAppKey') || ''

  // Lancer toutes les sources en parallèle
  const fetchPromises = [
    fetchRemoteOK(skills),
    fetchJobicy(skills),
    fetchArbeitNow(),
    fetchFreeWorkRSS(skills),
  ]
  if (adzunaAppId && adzunaAppKey) {
    fetchPromises.push(fetchAdzuna(skills, adzunaAppId, adzunaAppKey))
  }

  const results = await Promise.allSettled(fetchPromises)

  let allOffers: LiveOffer[] = []
  const stats: Record<string, { ok: boolean; count: number; error?: string }> = {}

  results.forEach(result => {
    if (result.status === 'fulfilled') {
      const r = result.value
      stats[r.source] = { ok: !r.error, count: r.count, error: r.error }
      allOffers = allOffers.concat(r.offers)
    }
  })

  // Dédupliquer
  const seen = new Set<string>()
  allOffers = allOffers.filter(o => {
    const key = `${o.titre}${o.entreprise}`.toLowerCase().replace(/\s+/g, '')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Scorer avec les compétences
  allOffers = allOffers.map(o => ({
    ...o,
    score: quickScore(o, skills),
  }))

  // Trier par score puis date
  allOffers.sort((a, b) => {
    if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0)
    return (b.publiee || '') > (a.publiee || '') ? 1 : -1
  })

  return NextResponse.json({
    offers:    allOffers,
    total:     allOffers.length,
    sources:   Object.keys(stats).length,
    stats,
    cachedAt:  new Date().toISOString(),
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300',
    },
  })
}
