# DataSphere OS — Guide de Déploiement Complet
## Netlify + Supabase + Stripe

---

## ÉTAPE 1 — Supabase (30 min)

### 1.1 Créer le projet
1. Allez sur **https://supabase.com** → New Project
2. Choisissez une région **EU West (Ireland)** — conformité RGPD
3. Notez le **mot de passe de la base de données**

### 1.2 Configurer le schéma
1. Dashboard → **SQL Editor** → New Query
2. Copiez-collez le contenu de `supabase/migrations/001_initial_schema.sql`
3. Cliquez **Run** → vérifiez "Success"

### 1.3 Récupérer les clés
1. Dashboard → **Settings** → **API**
2. Copiez :
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ jamais exposée côté client)

### 1.4 Configurer l'Auth
1. Dashboard → **Authentication** → **Settings**
2. **Site URL** : `https://votre-app.netlify.app`
3. **Redirect URLs** : `https://votre-app.netlify.app/**`
4. Activez **Email confirmations**

---

## ÉTAPE 2 — Stripe (20 min)

### 2.1 Créer les produits
1. Dashboard → **Products** → Add Product
2. Créez 4 produits :

| Produit | Prix | Récurrence |
|---------|------|-----------|
| DataSphere OS Pro | 29€ | Mensuel |
| DataSphere OS Pro | 290€ | Annuel |
| DataSphere OS Agency | 79€ | Mensuel |
| DataSphere OS Early Bird | 199€ | One-shot |

3. Pour chaque produit, copiez le **Price ID** (format `price_xxx`)

### 2.2 Créer les Payment Links
1. Dashboard → **Payment Links** → Create
2. Sélectionnez votre produit
3. Copiez le lien (format `https://buy.stripe.com/xxx`)

### 2.3 Configurer le Webhook
1. Dashboard → **Developers** → **Webhooks** → Add endpoint
2. URL : `https://votre-app.netlify.app/api/stripe/webhook`
3. Events à écouter :
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copiez le **Signing secret** (format `whsec_xxx`)

---

## ÉTAPE 3 — Netlify (10 min)

### 3.1 Déployer
```bash
# Option A : via Git (recommandé)
git init
git add .
git commit -m "Initial DataSphere OS"
git remote add origin https://github.com/votre-user/datasphere-os.git
git push -u origin main
# → Connectez le repo dans Netlify

# Option B : via CLI
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --prod
```

### 3.2 Variables d'environnement
Dashboard Netlify → Site → **Environment variables** → Add :

```
NEXT_PUBLIC_SUPABASE_URL        = https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY   = eyJ...
SUPABASE_SERVICE_ROLE_KEY       = eyJ...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = pk_live_...
STRIPE_SECRET_KEY               = sk_live_...
STRIPE_WEBHOOK_SECRET           = whsec_...
NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY = price_...
NEXT_PUBLIC_STRIPE_LINK_PRO_MONTHLY  = https://buy.stripe.com/...
GROQ_API_KEY                    = gsk_...
ANTHROPIC_API_KEY               = sk-ant-...
ADZUNA_APP_ID                   = ...
ADZUNA_APP_KEY                  = ...
NEXT_PUBLIC_APP_URL             = https://votre-app.netlify.app
```

### 3.3 Build settings
- **Build command** : `npm run build`
- **Publish directory** : `.next`
- **Node version** : `20`

---

## ÉTAPE 4 — Domaine custom (optionnel, 10 min)

1. Achetez un domaine sur **Namecheap** (~10€/an) : ex: `datasphere-os.fr`
2. Netlify → Domain management → Add custom domain
3. Suivez les instructions DNS (propagation 5-30 min)
4. SSL automatique via Let's Encrypt ✅

---

## ÉTAPE 5 — APIs Offres (optionnel)

### Adzuna (250 req/mois gratuit)
1. https://developer.adzuna.com/ → Register
2. Copiez `App ID` + `App Key`
3. Ajoutez dans les env vars : `ADZUNA_APP_ID` + `ADZUNA_APP_KEY`

### Jooble (gratuit sur demande)
1. https://jooble.org/api/about → Demande de clé
2. Réponse sous 24h
3. Ajoutez : `JOOBLE_API_KEY`

---

## CHECKLIST PRÉ-LANCEMENT

- [ ] Supabase RLS activé sur toutes les tables
- [ ] Webhook Stripe configuré et testé (mode test d'abord)
- [ ] Variables d'environnement complètes sur Netlify
- [ ] Domaine custom configuré avec SSL
- [ ] CGU + Politique de confidentialité publiées
- [ ] Test du flow complet : inscription → paiement → activation plan
- [ ] Test de l'API offres avec `curl https://votre-app.netlify.app/api/offers?skills=data,python`
- [ ] Test du proxy IA avec un utilisateur authentifié
- [ ] Monitoring activé (Netlify Analytics ou Plausible)

---

## MONITORING (recommandé)

```bash
# Plausible Analytics (RGPD-friendly, gratuit 30j)
npm install @plausible/tracker

# Sentry (erreurs, gratuit jusqu'à 5k events/mois)
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

---

## COMMANDES UTILES

```bash
# Dev local
cp .env.example .env.local
npm install
npm run dev              # http://localhost:3000

# Tests
npm run type-check       # TypeScript
npx playwright test      # E2E

# Build production
npm run build
npm start

# Deploy Netlify
netlify deploy --prod

# Supabase CLI (migrations)
npx supabase db push     # appliquer les migrations
npx supabase gen types   # régénérer les types
```
