// ═══════════════════════════════════════════════
// DataSphere OS — Types TypeScript centralisés
// ═══════════════════════════════════════════════

export type Plan = 'free' | 'pro' | 'agency' | 'earlybird' | 'superadmin'

export interface User {
  id: string
  email: string
  plan: Plan
  createdAt: string
  avatarUrl?: string
}

export interface Mission {
  id: string
  titre: string
  client: string
  tjm: number
  statut: 'En cours' | 'Terminée' | 'En pause' | 'Annulée'
  dateDebut: string
  dateFin?: string
  modalite: 'Remote 100%' | 'Hybride' | 'On-site'
  description?: string
  userId: string
  createdAt?: string
}

export interface Facture {
  id: string
  numero: string
  client: string
  objet: string
  montant: number
  tva: number
  statut: 'Brouillon' | 'Envoyée' | 'Payée' | 'En retard' | 'Annulée'
  date: string
  echeance?: string
  userId: string
}

export interface Charge {
  id: string
  libelle: string
  categorie: string
  montant: number
  date: string
  deductible: boolean
  userId: string
}

export interface Contact {
  id: string
  prenom?: string
  nom: string
  poste: string
  entreprise: string
  email: string
  tel?: string
  statut: 'Chaud' | 'Tiède' | 'Froid' | 'Client'
  notes?: string
  derniereAction?: string
  userId: string
}

export interface Deal {
  id: string
  titre: string
  client: string
  montant: number
  statut: 'Prospect' | 'Qualifié' | 'Proposition' | 'Négociation' | 'Gagné' | 'Perdu'
  probabilite: number
  dateClotureEstimee?: string
  userId: string
}

export interface LiveOffer {
  id: string
  titre: string
  entreprise: string
  secteur: string
  ville: string
  modalite: string
  telework?: string
  tjmMin: number
  tjmMax: number
  duree: string
  urgence: string
  plateforme: string
  publiee: string
  url?: string
  description?: string
  logo?: string
  score?: number
  tech?: string[]
  _live?: boolean
  _mock?: boolean
  contactHint?: string
}

export interface Experience {
  poste: string
  entreprise: string
  periode: string
  desc: string
}

export interface CV {
  nom: string
  titre: string
  email: string
  telephone?: string
  localisation?: string
  linkedin?: string
  disponibilite?: string
  tjm?: string
  resume?: string
  competences: string[]
  experiences: Experience[]
  formation?: string[]
  langues?: string[]
  certifications?: string[]
}

export interface Rappel {
  id: string
  texte: string
  date: string
  done: boolean
  priorite?: 'haute' | 'normale' | 'basse'
  userId: string
}

export interface KeyResult {
  id: string
  titre: string
  cible: number
  actuel: number
}

export interface OKR {
  id: string
  titre: string
  periode: string
  krs: KeyResult[]
  userId: string
}

export interface Candidature {
  id: string
  offreId: string
  titre: string
  statut: 'Envoyée' | 'Ouverte' | 'Réponse reçue' | 'Entretien' | 'Refus'
  cvAdapte?: string
  email?: string
  score?: number
  date: string
}

export interface AgentRun {
  id: string
  status: 'running' | 'completed' | 'error'
  startedAt: string
  completedAt?: string
  candidatures: Candidature[]
  logs: string[]
  userId: string
}

export interface AIConfig {
  provider: 'groq' | 'openrouter' | 'anthropic'
  groqKey?: string
  openrouterKey?: string
  anthropicKey?: string
  groqModel?: string
  openrouterModel?: string
}

export type TabId =
  | 'dashboard' | 'missions' | 'facturation' | 'okrs' | 'rappels'
  | 'graphiques' | 'prospection' | 'offres' | 'marche' | 'agent'
  | 'ia' | 'commercial' | 'audit' | 'comptabilite' | 'formation' | 'pricing'

export interface NavGroup {
  label: string
  tabs: TabId[]
}

export interface OfferSource {
  name: string
  logo: string
  enabled: boolean
  needsKey: boolean
  keyLabel?: string
  signupUrl?: string
}

export interface FetchStats {
  [key: string]: { ok: boolean; count: number; err?: string }
}

export interface StripePlan {
  id: Plan
  name: string
  price: number
  priceLabel: string
  features: string[]
  paymentLink?: string
}
