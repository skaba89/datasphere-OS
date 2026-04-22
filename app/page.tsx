import Link from 'next/link'

const FEATURES = [
  { icon:'search', emoji:'🔍', title:'Offres live', desc:'7 sources en temps reel : Free-Work, Indeed France, RemoteOK, Jobicy. Scoring auto sur vos competences.', color:'from-blue-500/20 to-blue-500/5', border:'border-blue-500/20' },
  { icon:'bot',    emoji:'🤖', title:'Agent IA',    desc:'Genere des emails de candidature personnalises pour chaque offre. Kanban 5 colonnes pour le suivi.', color:'from-violet-500/20 to-violet-500/5', border:'border-violet-500/20' },
  { icon:'spark',  emoji:'✨', title:'IA Studio',   desc:'Post LinkedIn, email B2B, pitch mission, lettre de motivation generes en 5 secondes.', color:'from-teal-500/15 to-teal-500/3', border:'border-teal-500/20' },
  { icon:'euro',   emoji:'💶', title:'Facturation', desc:'Factures HT/TVA/TTC en 30 secondes. Suivi des paiements, alertes retards, export PDF.', color:'from-amber-500/15 to-amber-500/3', border:'border-amber-500/20' },
  { icon:'brief',  emoji:'💼', title:'CRM',         desc:'Pipeline deals, contacts DSI/CDO, alertes relances. Tout pour developper votre activite.', color:'from-rose-500/15 to-rose-500/3', border:'border-rose-500/20' },
  { icon:'chart',  emoji:'📊', title:'Comptabilite',desc:'URSSAF, seuil micro-BIC, charges deductibles. Analyse fiscale IA incluse.', color:'from-green-500/15 to-green-500/3', border:'border-green-500/20' },
]

const SOURCES = ['Free-Work', 'Freelance.com', 'Indeed France', 'RemoteOK', 'Jobicy', 'ArbeitNow', 'Adzuna']

export default function LandingPage() {
  return (
    <main style={{ minHeight:'100vh', background:'#07080F', color:'#F0F2FF', fontFamily:'Inter, system-ui, sans-serif', overflowX:'hidden' }}>

      {/* Nav */}
      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:50, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 24px', background:'rgba(7,8,15,.9)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(255,255,255,.05)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:32, height:32, borderRadius:10, background:'linear-gradient(135deg,#5B7FFF,#8B5CF6)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:14, fontWeight:700 }}>◈</div>
          <span style={{ fontWeight:800, fontSize:15, letterSpacing:'-0.04em' }}>Data<span style={{ background:'linear-gradient(90deg,#7B9BFF,#A78BFA)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Sphere OS</span></span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <Link href="/pricing" style={{ fontSize:14, color:'#4A5270', textDecoration:'none' }}>Tarifs</Link>
          <Link href="/auth" style={{ fontSize:14, color:'#4A5270', textDecoration:'none' }}>Connexion</Link>
          <Link href="/dashboard" style={{ padding:'8px 18px', borderRadius:10, fontSize:14, fontWeight:600, color:'white', background:'linear-gradient(135deg,#5B7FFF,#8B5CF6)', textDecoration:'none' }}>
            Acceder →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ paddingTop:128, paddingBottom:80, textAlign:'center', position:'relative' }}>
        <div style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:80, left:'50%', transform:'translateX(-50%)', width:600, height:400, background:'rgba(91,127,255,.08)', borderRadius:'50%', filter:'blur(120px)' }} />
        </div>
        <div style={{ position:'relative', maxWidth:800, margin:'0 auto', padding:'0 24px' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'6px 14px', borderRadius:100, border:'1px solid rgba(91,127,255,.3)', background:'rgba(91,127,255,.08)', color:'#7B9BFF', fontSize:12, fontWeight:600, marginBottom:24 }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'#00DDB3', boxShadow:'0 0 6px #00DDB3' }} />
            Nouveau - 7 sources d'offres en temps reel
          </div>
          <h1 style={{ fontSize:'clamp(32px,6vw,60px)', fontWeight:900, letterSpacing:'-0.04em', lineHeight:1.05, marginBottom:24 }}>
            Votre OS freelance<br />
            <span style={{ background:'linear-gradient(90deg,#7B9BFF,#A78BFA,#00DDB3)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
              alimente par l'IA
            </span>
          </h1>
          <p style={{ fontSize:18, color:'#8892B0', maxWidth:560, margin:'0 auto 36px', lineHeight:1.6 }}>
            Missions, facturation, CRM, offres live et Agent IA en un seul endroit. Pour les freelances data et tech.
          </p>
          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            <Link href="/dashboard" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'14px 28px', borderRadius:12, fontSize:16, fontWeight:700, color:'white', background:'linear-gradient(135deg,#5B7FFF,#8B5CF6)', textDecoration:'none', boxShadow:'0 8px 32px rgba(91,127,255,.4)' }}>
              Commencer gratuitement →
            </Link>
            <Link href="/pricing" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'14px 28px', borderRadius:12, fontSize:16, fontWeight:600, color:'#8892B0', background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', textDecoration:'none' }}>
              Voir les tarifs
            </Link>
          </div>
          <p style={{ fontSize:12, color:'#4A5270', marginTop:16 }}>Gratuit pour commencer - Aucune carte requise</p>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding:'0 24px 80px', maxWidth:1100, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:48 }}>
          <h2 style={{ fontSize:'clamp(22px,4vw,32px)', fontWeight:900, letterSpacing:'-0.03em', marginBottom:12 }}>Tout ce dont vous avez besoin</h2>
          <p style={{ color:'#8892B0', fontSize:16 }}>Concu pour les freelances data, tech et IT</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:16 }}>
          {FEATURES.map(f => (
            <div key={f.icon} style={{ padding:20, borderRadius:16, border:`1px solid`, borderColor:f.border.replace('border-','').replace('-500/20','').replace('-',''), background:`linear-gradient(to bottom, ${f.color.split(' ')[0].replace('from-','').replace('/20','').replace('/15','')})` }} className={`bg-gradient-to-b ${f.color} ${f.border} hover:border-opacity-40 transition-all`}>
              <div style={{ fontSize:32, marginBottom:12 }}>{f.emoji}</div>
              <h3 style={{ fontSize:16, fontWeight:700, color:'#F0F2FF', marginBottom:8 }}>{f.title}</h3>
              <p style={{ fontSize:14, color:'#8892B0', lineHeight:1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sources */}
      <section style={{ padding:'48px 24px', background:'rgba(13,15,28,.5)', textAlign:'center' }}>
        <div style={{ maxWidth:700, margin:'0 auto' }}>
          <h2 style={{ fontSize:24, fontWeight:900, marginBottom:12, letterSpacing:'-0.03em' }}>Sources d'offres en temps reel</h2>
          <p style={{ color:'#8892B0', marginBottom:32, fontSize:15 }}>Toutes les plateformes freelance tech agreees automatiquement</p>
          <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'center', gap:10 }}>
            {SOURCES.map(s => (
              <span key={s} style={{ padding:'8px 16px', borderRadius:100, background:'#1E2238', border:'1px solid #272B45', fontSize:13, color:'#8892B0', fontWeight:500 }}>{s}</span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding:'80px 24px', textAlign:'center' }}>
        <div style={{ maxWidth:560, margin:'0 auto', padding:'48px 40px', borderRadius:24, border:'1px solid #1F2340', background:'linear-gradient(to bottom, #12152A, #0D0F1C)', position:'relative', overflow:'hidden' }}>
          <div style={{ fontSize:40, marginBottom:16 }}>◈</div>
          <h2 style={{ fontSize:28, fontWeight:900, marginBottom:12, letterSpacing:'-0.03em' }}>Pret a demarrer ?</h2>
          <p style={{ color:'#8892B0', marginBottom:28, fontSize:14 }}>Sans carte bancaire, sans inscription obligatoire.</p>
          <Link href="/dashboard" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'14px 32px', borderRadius:12, fontSize:16, fontWeight:700, color:'white', background:'linear-gradient(135deg,#5B7FFF,#8B5CF6)', textDecoration:'none', boxShadow:'0 8px 32px rgba(91,127,255,.4)' }}>
            Acceder a DataSphere OS →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding:'24px', borderTop:'1px solid rgba(255,255,255,.05)', textAlign:'center', fontSize:12, color:'#4A5270' }}>
        <div style={{ marginBottom:8 }}>DataSphere OS - L'OS pour freelances data et tech</div>
        <div style={{ display:'flex', gap:16, justifyContent:'center' }}>
          <Link href="/dashboard" style={{ color:'#4A5270', textDecoration:'none' }}>App</Link>
          <Link href="/pricing" style={{ color:'#4A5270', textDecoration:'none' }}>Tarifs</Link>
          <Link href="/auth" style={{ color:'#4A5270', textDecoration:'none' }}>Connexion</Link>
        </div>
      </footer>
    </main>
  )
}
