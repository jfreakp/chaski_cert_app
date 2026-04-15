import { requireAdmin } from '@/app/lib/dal'
import { ShieldCheck } from 'lucide-react'
import { PROJECT_NAME } from '@/app/lib/config'

export const metadata = { title: `${PROJECT_NAME} — Configuración` }

export default async function SettingsPage() {
  await requireAdmin()

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <span className="text-[10px] font-bold text-tertiary uppercase tracking-[0.3em] mb-2 block">
          Sistema
        </span>
        <h1 className="text-4xl font-extrabold text-on-surface tracking-tighter">
          Configuración
        </h1>
        <p className="text-secondary mt-2">
          Panel de administración del sistema — solo ADMIN.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 text-center text-secondary">
        <ShieldCheck size={40} strokeWidth={1} className="text-outline/40 mb-2 mx-auto" />
        <p className="text-sm font-medium">Módulo disponible próximamente.</p>
      </div>
    </div>
  )
}
