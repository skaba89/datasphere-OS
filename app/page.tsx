// app/page.tsx
import { redirect } from 'next/navigation'

// La page racine redirige vers le dashboard
export default function Home() {
  redirect('/dashboard')
}
