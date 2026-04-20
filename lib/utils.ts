// lib/utils.ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function fmt(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n))
}

export function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function esc(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function formatDate(date: string | Date, locale = 'fr-FR'): string {
  return new Date(date).toLocaleDateString(locale, {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
}

export function timeAgo(date: string | Date): string {
  const diff = (Date.now() - new Date(date).getTime()) / 1000
  if (diff < 60)    return 'À l\'instant'
  if (diff < 3600)  return `${Math.floor(diff / 60)} min`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}j`
}

export function truncate(str: string, max = 80): string {
  return str.length > max ? str.slice(0, max) + '…' : str
}

export function slugify(str: string): string {
  return str.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').trim()
}

export const PLAN_LIMITS = {
  free:   { missions: 3, factures: 5, contacts: 10, agentRuns: 3 },
  pro:    { missions: Infinity, factures: Infinity, contacts: Infinity, agentRuns: Infinity },
  agency: { missions: Infinity, factures: Infinity, contacts: Infinity, agentRuns: Infinity },
} as const
