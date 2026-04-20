'use client'
// app/facturation/page.tsx
import { useEffect } from 'react'

export default function FacturationPage() {
  useEffect(() => {
    document.title = 'Facturation — DataSphere OS'
  }, [])

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-extrabold text-ds-text tracking-tight">
        Facturation
      </h1>
      <div className="card py-12 text-center">
        <div className="text-4xl mb-4">💶</div>
        <p className="text-sm text-ds-text3 mb-5 max-w-sm mx-auto">
          Section disponible dans la version complète.
          La migration Next.js de cet onglet est planifiée.
        </p>
        <a href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-ds-sm text-sm
            font-semibold text-ds-text2 bg-ds-bg3 border border-ds-border
            hover:bg-ds-bg4 transition-colors">
          ← Dashboard
        </a>
      </div>
    </div>
  )
}
