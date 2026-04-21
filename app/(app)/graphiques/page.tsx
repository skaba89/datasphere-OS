'use client'
import { useEffect } from 'react'
export default function Page() {
  useEffect(() => { document.title = 'graphiques — DataSphere OS' }, [])
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-extrabold text-ds-text tracking-tight capitalize">graphiques</h1>
      <div className="card py-12 text-center">
        <p className="text-sm text-ds-text3 mb-4">Module en développement — prochainement disponible.</p>
        <a href="/dashboard" className="btn-secondary">← Dashboard</a>
      </div>
    </div>
  )
}
