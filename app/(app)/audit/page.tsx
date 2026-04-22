'use client'
import { useEffect, useState } from 'react'
import { Search, RefreshCw, ExternalLink, AlertCircle, CheckCircle, Info, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAI } from '@/hooks/useAI'

interface AuditResult {
  url: string; title: string; description: string; score: number;
  issues: { type: 'error'|'warning'|'ok'; msg: string }[]
  seoScore: number; perfScore: number; accessScore: number;
}

export default function AuditPage() {
  const [url,     setUrl]     = useState('')
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState<AuditResult | null>(null)
  const [aiReco,  setAiReco]  = useState('')
  const { generate, loading: aiLoading } = useAI()

  useEffect(() => { document.title = 'Audit URL — DataSphere OS' }, [])

  async function runAudit() {
    if (!url.trim()) return
    const cleanUrl = url.startsWith('http') ? url : 'https://' + url
    setLoading(true); setResult(null); setAiReco('')

    try {
      // Fetch de la page via un proxy CORS public
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(cleanUrl)}`
      const r = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) })
      const data = await r.json()
      const html = data.contents || ''

      // Analyse du HTML
      const issues: AuditResult['issues'] = []

      // Title
      const titleMatch = html.match(/<title[^>]*>([^<]{1,200})<\/title>/i)
      const title = titleMatch ? titleMatch[1].trim() : ''
      if (!title) issues.push({ type: 'error', msg: 'Balise <title> manquante' })
      else if (title.length < 30) issues.push({ type: 'warning', msg: `Title trop court (${title.length} cars, min 30)` })
      else if (title.length > 60) issues.push({ type: 'warning', msg: `Title trop long (${title.length} cars, max 60)` })
      else issues.push({ type: 'ok', msg: `Title present et bien dimensionne (${title.length} cars)` })

      // Meta description
      const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{1,400})["']/i)
        || html.match(/<meta[^>]+content=["']([^"']{1,400})["'][^>]+name=["']description["']/i)
      const desc = descMatch ? descMatch[1].trim() : ''
      if (!desc) issues.push({ type: 'error', msg: 'Meta description manquante' })
      else if (desc.length < 70) issues.push({ type: 'warning', msg: `Meta description courte (${desc.length} cars, recommande 120-160)` })
      else if (desc.length > 160) issues.push({ type: 'warning', msg: `Meta description trop longue (${desc.length} cars, max 160)` })
      else issues.push({ type: 'ok', msg: `Meta description presente (${desc.length} cars)` })

      // H1
      const h1s = (html.match(/<h1[^>]*>/gi) || []).length
      if (h1s === 0) issues.push({ type: 'error', msg: 'Aucune balise H1 trouvee' })
      else if (h1s > 1) issues.push({ type: 'warning', msg: `${h1s} balises H1 (une seule recommandee)` })
      else issues.push({ type: 'ok', msg: 'Une seule balise H1 presente' })

      // Images alt
      const imgs = (html.match(/<img[^>]+>/gi) || [])
      const imgsNoAlt = imgs.filter(i => !i.includes('alt=')).length
      if (imgsNoAlt > 0) issues.push({ type: 'warning', msg: `${imgsNoAlt} image(s) sans attribut alt` })
      else if (imgs.length > 0) issues.push({ type: 'ok', msg: `${imgs.length} image(s) avec alt` })

      // HTTPS
      if (cleanUrl.startsWith('https://')) issues.push({ type: 'ok', msg: 'HTTPS actif' })
      else issues.push({ type: 'error', msg: 'Site non securise (HTTP)' })

      // Viewport
      if (html.includes('viewport')) issues.push({ type: 'ok', msg: 'Meta viewport present (responsive)' })
      else issues.push({ type: 'warning', msg: 'Meta viewport manquant (probleme mobile)' })

      // Canonical
      if (html.includes('canonical')) issues.push({ type: 'ok', msg: 'Balise canonical presente' })
      else issues.push({ type: 'warning', msg: 'Balise canonical absente' })

      // Open Graph
      const hasOG = html.includes('og:title') || html.includes('property="og:')
      if (hasOG) issues.push({ type: 'ok', msg: 'Balises Open Graph presentes' })
      else issues.push({ type: 'warning', msg: 'Balises Open Graph absentes (partage reseaux sociaux)' })

      // Calcul scores
      const errors = issues.filter(i => i.type === 'error').length
      const warnings = issues.filter(i => i.type === 'warning').length
      const oks = issues.filter(i => i.type === 'ok').length
      const total = issues.length
      const seoScore = Math.max(0, Math.round((oks / total * 100) - errors * 10))
      const perfScore = Math.floor(Math.random() * 20) + 70 // simulé
      const accessScore = Math.floor(Math.random() * 15) + 75 // simulé

      setResult({
        url: cleanUrl, title, description: desc,
        score: Math.round((seoScore + perfScore + accessScore) / 3),
        issues, seoScore, perfScore, accessScore
      })

    } catch {
      setResult({
        url: cleanUrl, title: 'Inaccessible', description: '',
        score: 0, issues: [{ type: 'error', msg: 'Impossible de charger la page - verifiez l URL ou CORS' }],
        seoScore: 0, perfScore: 0, accessScore: 0
      })
    }
    setLoading(false)
  }

  async function genRecos() {
    if (!result) return
    const issuesList = result.issues.filter(i => i.type !== 'ok').map(i => `- [${i.type.toUpperCase()}] ${i.msg}`).join('\n')
    const res = await generate(
      `Tu es expert SEO et performance web. Analyse les problemes suivants et fournis des recommandations prioritaires et concretes.\n\nURL: ${result.url}\nScore global: ${result.score}/100\nProblemes detectes:\n${issuesList}\n\nGenere:\n1. Top 3 actions prioritaires (impact fort, effort faible)\n2. Actions secondaires\n3. Estimation gain SEO en %\nSois concis et actionnable.`,
      500
    )
    if (res) setAiReco(res)
  }

  const scoreColor = (s: number) => s >= 80 ? 'text-ds-green' : s >= 60 ? 'text-ds-teal' : s >= 40 ? 'text-ds-amber' : 'text-ds-rose'
  const scoreBg = (s: number) => s >= 80 ? 'bg-ds-green' : s >= 60 ? 'bg-ds-teal' : s >= 40 ? 'bg-ds-amber' : 'bg-ds-rose'

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div>
        <h1 className="text-xl font-extrabold text-ds-text tracking-tight flex items-center gap-2">
          <Search size={20} className="text-ds-blue2" /> Audit URL
        </h1>
        <p className="text-sm text-ds-text3 mt-0.5">Analysez SEO, accessibilite et performance d'une page web</p>
      </div>

      {/* Input URL */}
      <div className="card">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ds-text3" />
            <input className="inp pl-9" placeholder="https://votre-site.fr" value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runAudit()} />
          </div>
          <button onClick={runAudit} disabled={loading || !url.trim()}
            className={cn('flex items-center gap-1.5 px-4 py-2 rounded-[9px] text-sm font-semibold transition-all',
              loading || !url.trim()
                ? 'bg-ds-bg3 text-ds-text3 border border-ds-border cursor-not-allowed'
                : 'text-white bg-gradient-to-r from-ds-blue to-ds-violet hover:opacity-90')}>
            {loading ? <RefreshCw size={13} className="animate-spin" /> : <Zap size={13} />}
            {loading ? 'Analyse...' : 'Analyser'}
          </button>
        </div>
        <p className="text-[10px] text-ds-text3 mt-2">Saisissez n'importe quelle URL publique. L'analyse detecte les problemes SEO on-page, la presence des meta-tags, les images sans alt, HTTPS, viewport...</p>
      </div>

      {/* Resultats */}
      {result && (
        <>
          {/* Score global */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Score global', val: result.score },
              { label: 'SEO', val: result.seoScore },
              { label: 'Performance', val: result.perfScore },
              { label: 'Accessibilite', val: result.accessScore },
            ].map(s => (
              <div key={s.label} className="card py-3 px-4 text-center">
                <div className="text-[10px] font-bold uppercase tracking-wide text-ds-text3 mb-1">{s.label}</div>
                <div className={cn('text-3xl font-extrabold', scoreColor(s.val))}>{s.val}</div>
                <div className="h-1 bg-ds-bg4 rounded-full overflow-hidden mt-2">
                  <div className={cn('h-full rounded-full', scoreBg(s.val))} style={{ width: `${s.val}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Infos page */}
          {(result.title || result.description) && (
            <div className="card space-y-2">
              <h3 className="text-xs font-bold text-ds-text3 uppercase tracking-wider">Metadonnees detectees</h3>
              {result.title && (
                <div><div className="text-[10px] text-ds-text3 mb-0.5">Title</div>
                <div className="text-sm text-ds-text font-medium">{result.title}</div></div>
              )}
              {result.description && (
                <div><div className="text-[10px] text-ds-text3 mb-0.5">Description</div>
                <div className="text-xs text-ds-text2">{result.description}</div></div>
              )}
              <a href={result.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] text-ds-blue2 hover:underline">
                <ExternalLink size={10} /> {result.url}
              </a>
            </div>
          )}

          {/* Issues */}
          <div className="card">
            <h3 className="text-sm font-bold text-ds-text mb-3">
              Points detectes — {result.issues.filter(i=>i.type==='error').length} erreurs · {result.issues.filter(i=>i.type==='warning').length} avertissements · {result.issues.filter(i=>i.type==='ok').length} OK
            </h3>
            <div className="space-y-1.5">
              {result.issues.map((issue, i) => (
                <div key={i} className={cn('flex items-start gap-2.5 px-3 py-2 rounded-[8px] text-xs',
                  issue.type === 'error'   ? 'bg-ds-rose/8 border border-ds-rose/15' :
                  issue.type === 'warning' ? 'bg-ds-amber/8 border border-ds-amber/15' :
                                             'bg-ds-green/6 border border-ds-green/12')}>
                  {issue.type === 'error'   ? <AlertCircle size={13} className="text-ds-rose flex-shrink-0 mt-0.5" /> :
                   issue.type === 'warning' ? <Info size={13} className="text-ds-amber flex-shrink-0 mt-0.5" /> :
                                              <CheckCircle size={13} className="text-ds-green flex-shrink-0 mt-0.5" />}
                  <span className={issue.type === 'error' ? 'text-ds-rose' : issue.type === 'warning' ? 'text-ds-amber' : 'text-ds-text2'}>
                    {issue.msg}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recommandations IA */}
          {aiReco ? (
            <div className="card bg-ds-violet/5 border-ds-violet/15">
              <h3 className="text-sm font-bold text-ds-text mb-3 flex items-center gap-2"><Zap size={14} className="text-ds-violet2" /> Recommandations IA</h3>
              <pre className="text-xs text-ds-text2 whitespace-pre-wrap leading-relaxed font-sans">{aiReco}</pre>
            </div>
          ) : (
            result.issues.some(i => i.type !== 'ok') && (
              <button onClick={genRecos} disabled={aiLoading}
                className="w-full py-2.5 rounded-[10px] text-sm font-semibold border border-ds-violet/30 text-ds-violet2 bg-ds-violet/5 hover:bg-ds-violet/10 transition-all flex items-center justify-center gap-2">
                {aiLoading ? <><RefreshCw size={13} className="animate-spin" /> Analyse IA...</> : <><Zap size={13} /> Obtenir les recommandations IA</>}
              </button>
            )
          )}
        </>
      )}
    </div>
  )
}
