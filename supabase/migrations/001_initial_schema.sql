-- ═══════════════════════════════════════════════════════════
-- DataSphere OS — Schéma Supabase complet
-- Exécutez dans : Dashboard Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════

-- ── Extensions ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- recherche full-text

-- ── Profils utilisateurs ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan                   TEXT NOT NULL DEFAULT 'free'
                           CHECK (plan IN ('free','pro','agency','earlybird','superadmin')),
  stripe_customer_id     TEXT UNIQUE,
  stripe_subscription_id TEXT,
  subscription_expires_at TIMESTAMPTZ,
  full_name              TEXT,
  avatar_url             TEXT,
  locale                 TEXT DEFAULT 'fr',
  currency               TEXT DEFAULT 'EUR',
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

-- ── Données utilisateur (state JSON) ─────────────────────────
CREATE TABLE IF NOT EXISTS user_data (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data        JSONB NOT NULL DEFAULT '{}',
  version     INTEGER DEFAULT 1,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Missions ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS missions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titre        TEXT NOT NULL,
  client       TEXT NOT NULL,
  tjm          NUMERIC(10,2),
  statut       TEXT NOT NULL DEFAULT 'En cours'
                 CHECK (statut IN ('En cours','Terminée','En pause','Annulée')),
  date_debut   DATE,
  date_fin     DATE,
  modalite     TEXT DEFAULT 'Hybride',
  description  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Factures ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS factures (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  numero      TEXT NOT NULL,
  client      TEXT NOT NULL,
  objet       TEXT,
  montant     NUMERIC(12,2) NOT NULL DEFAULT 0,
  tva         NUMERIC(5,2) DEFAULT 20,
  statut      TEXT NOT NULL DEFAULT 'Brouillon'
                CHECK (statut IN ('Brouillon','Envoyée','Payée','En retard','Annulée')),
  date_facture DATE DEFAULT CURRENT_DATE,
  echeance    DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Charges déductibles ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS charges (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  libelle     TEXT NOT NULL,
  categorie   TEXT,
  montant     NUMERIC(10,2) NOT NULL,
  date_charge DATE DEFAULT CURRENT_DATE,
  deductible  BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Contacts CRM ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prenom          TEXT,
  nom             TEXT NOT NULL,
  poste           TEXT,
  entreprise      TEXT,
  email           TEXT,
  tel             TEXT,
  statut          TEXT DEFAULT 'Froid'
                    CHECK (statut IN ('Chaud','Tiède','Froid','Client')),
  notes           TEXT,
  derniere_action DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Deals pipeline ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deals (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titre                 TEXT NOT NULL,
  client                TEXT,
  montant               NUMERIC(12,2),
  statut                TEXT DEFAULT 'Prospect',
  probabilite           INTEGER DEFAULT 50 CHECK (probabilite BETWEEN 0 AND 100),
  date_cloture_estimee  DATE,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ── Rappels ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rappels (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  texte     TEXT NOT NULL,
  date_rappel DATE NOT NULL,
  done      BOOLEAN DEFAULT FALSE,
  priorite  TEXT DEFAULT 'normale' CHECK (priorite IN ('haute','normale','basse')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Offres sauvegardées ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_offres (
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  offre_id   TEXT NOT NULL,
  offre_data JSONB,
  saved_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, offre_id)
);

-- ── Usage IA (analytics) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_usage (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider   TEXT,
  tokens     INTEGER,
  plan       TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS) — CRITIQUE pour la sécurité
-- ════════════════════════════════════════════════════════════

-- Activer RLS sur toutes les tables
ALTER TABLE user_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_data       ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE factures        ENABLE ROW LEVEL SECURITY;
ALTER TABLE charges         ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals           ENABLE ROW LEVEL SECURITY;
ALTER TABLE rappels         ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_offres    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage        ENABLE ROW LEVEL SECURITY;

-- Policies : chaque utilisateur ne voit que ses données
CREATE POLICY "own_profile"  ON user_profiles  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_data"     ON user_data       USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_missions" ON missions        USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_factures" ON factures        USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_charges"  ON charges         USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_contacts" ON contacts        USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_deals"    ON deals           USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_rappels"  ON rappels         USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_offres"   ON saved_offres    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_ai"       ON ai_usage        USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════
-- INDEXES pour performance
-- ════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_missions_user_statut ON missions(user_id, statut);
CREATE INDEX IF NOT EXISTS idx_factures_user_statut ON factures(user_id, statut);
CREATE INDEX IF NOT EXISTS idx_contacts_user        ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_rappels_user_date    ON rappels(user_id, date_rappel);
CREATE INDEX IF NOT EXISTS idx_charges_user_date    ON charges(user_id, date_charge);

-- ════════════════════════════════════════════════════════════
-- TRIGGER — Créer le profil automatiquement à l'inscription
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_data (user_id, data)
  VALUES (NEW.id, '{}'::jsonb)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ════════════════════════════════════════════════════════════
-- TRIGGER — updated_at automatique
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER set_updated_at_missions  BEFORE UPDATE ON missions  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER set_updated_at_factures  BEFORE UPDATE ON factures  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER set_updated_at_contacts  BEFORE UPDATE ON contacts  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER set_updated_at_profiles  BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- ════════════════════════════════════════════════════════════
-- VUE — Dashboard KPIs (lecture seule, filtrée par RLS)
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW dashboard_kpis AS
SELECT
  m.user_id,
  COUNT(DISTINCT m.id) FILTER (WHERE m.statut = 'En cours')    AS missions_en_cours,
  SUM(f.montant)        FILTER (WHERE f.statut = 'Payée'
    AND EXTRACT(YEAR FROM f.date_facture) = EXTRACT(YEAR FROM NOW())) AS ca_ytd,
  COUNT(DISTINCT f.id)  FILTER (WHERE f.statut IN ('Envoyée','En retard'))  AS factures_impayees,
  COUNT(DISTINCT c.id)                                           AS total_contacts
FROM missions m
LEFT JOIN factures f ON f.user_id = m.user_id
LEFT JOIN contacts c ON c.user_id = m.user_id
GROUP BY m.user_id;
