# DataSphere OS — Next.js App

> L'OS tout-en-un pour freelances tech : missions, facturation, CRM, Agent IA, comptabilité.

## Stack technique

| Layer | Technologie |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| UI | Tailwind CSS + Radix UI |
| Auth | Supabase Auth |
| Base de données | Supabase Postgres (RLS) |
| Paiement | Stripe (Payment Links + Webhooks) |
| IA | Groq / Anthropic / OpenRouter (proxy sécurisé) |
| Offres live | Adzuna, RemoteOK, Jobicy, ArbeitNow, Free-Work RSS |
| PDF | jsPDF + jsPDF-AutoTable |
| Forms | React Hook Form + Zod |
| State | Zustand + localStorage |
| Tests | Playwright (E2E) |
| Deploy | Netlify / Vercel |

## Démarrage rapide

```bash
# 1. Cloner et installer
git clone https://github.com/votre-user/datasphere-os.git
cd datasphere-os
npm install

# 2. Configurer les variables d'environnement
cp .env.example .env.local
# → Remplir les valeurs (voir DEPLOY.md)

# 3. Lancer en dev
npm run dev
# → http://localhost:3000
```

## Structure du projet

```
datasphere-os/
├── app/
│   ├── layout.tsx              # Layout racine (métadonnées, fonts)
│   ├── page.tsx                # Redirect vers /dashboard
│   ├── globals.css             # Styles globaux + Tailwind
│   ├── dashboard/
│   │   ├── layout.tsx          # Layout avec Sidebar + Header
│   │   └── page.tsx            # Dashboard KPIs
│   ├── missions/page.tsx
│   ├── facturation/page.tsx
│   ├── offres/page.tsx         # Offres live multi-sources
│   ├── pricing/page.tsx        # Plans & Stripe
│   ├── auth/page.tsx           # Login / Signup
│   └── api/
│       ├── ai-proxy/route.ts   # Proxy IA sécurisé (clés serveur)
│       ├── offers/route.ts     # Agrégateur offres (cache 10min)
│       └── stripe/
│           └── webhook/route.ts # Activation plan automatique
│
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx         # Navigation groupée + footer user
│   │   └── Header.tsx          # Header + Cmd+K search
│   ├── dashboard/
│   ├── offers/
│   └── billing/
│
├── hooks/
│   ├── useOffers.ts            # Fetch offres + filtres
│   └── useAI.ts               # Appels IA via proxy
│
├── lib/
│   └── utils.ts               # cn(), fmt(), uid(), etc.
│
├── types/
│   └── index.ts               # Types TypeScript centralisés
│
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql # Schéma + RLS + triggers
│
├── public/
│   └── manifest.json          # PWA manifest
│
├── .env.example               # Template variables d'environnement
├── DEPLOY.md                  # Guide déploiement complet
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.ts
```

## API Routes

### `POST /api/ai-proxy`
Proxy sécurisé pour les appels IA. Requiert un token Supabase.
- Rate limit : 20 req/min par utilisateur
- Limite tokens selon le plan (Free: 500, Pro: 2000, Agency: 4000)

```typescript
// Request
{ prompt: string, maxTokens?: number, provider?: 'groq'|'anthropic'|'openrouter' }

// Response
{ result: string, provider: string, plan: string }
```

### `GET /api/offers`
Agrège les offres de 5+ sources en parallèle. Cache serveur 10 min.

```
GET /api/offers?skills=python,snowflake,dbt
```

### `POST /api/stripe/webhook`
Webhook Stripe — active automatiquement le plan après paiement.
À configurer dans le Dashboard Stripe avec votre URL publique.

## Sécurité

- ✅ Clés API IA jamais exposées côté client (proxy serveur)
- ✅ RLS Supabase sur toutes les tables
- ✅ Auth Supabase avec vérification JWT
- ✅ Rate limiting sur le proxy IA
- ✅ CSP headers dans next.config.ts
- ✅ Webhook Stripe vérifié par signature
- ✅ Variables d'environnement séparées (client vs serveur)

## Déploiement

Voir **DEPLOY.md** pour le guide complet Netlify + Supabase + Stripe.

```bash
# Netlify CLI
netlify login
netlify init
netlify deploy --prod

# Ou via GitHub → Netlify auto-deploy
```

## Roadmap v2

- [ ] Tests E2E Playwright (10 scénarios critiques)
- [ ] Sync bancaire (Powens / Bridge API)
- [ ] App mobile React Native (Expo)
- [ ] Marketplace templates (CV, contrats)
- [ ] Coach IA TJM (analyse marché personnalisée)
- [ ] API publique DataSphere (revendre l'accès)
- [ ] Multi-tenant (version agence)

## Licence

MIT — Voir LICENSE
