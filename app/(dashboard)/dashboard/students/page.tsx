import { verifySession } from '@/app/lib/dal'
import { BadgeCheck, Construction } from 'lucide-react'
import { PROJECT_NAME } from '@/app/lib/config'

export const metadata = { title: `${PROJECT_NAME} — Estudiantes` }

export default async function StudentsPage() {
  await verifySession()

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <span className="text-[10px] font-bold text-tertiary uppercase tracking-[0.3em] mb-2 block">
          Base de Datos
        </span>
        <h1 className="text-4xl font-extrabold text-on-surface tracking-tighter">
          Registro de Estudiantes
        </h1>
        <p className="text-secondary mt-2">
          Gestión centralizada de credenciales académicas.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-on-surface text-white p-6 rounded-xl">
          <div className="text-3xl font-bold">2,842</div>
          <div className="text-sm text-white/70 mt-1">Total Estudiantes</div>
          <div className="text-xs text-primary-fixed-dim mt-1">+12% este mes</div>
        </div>
        <div className="bg-surface-container-low p-6 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <BadgeCheck size={24} strokeWidth={1.75} className="text-primary-container" />
            <span className="text-3xl font-bold">1,920</span>
          </div>
          <div className="text-sm text-secondary">Certificados Emitidos</div>
          <div className="text-xs text-primary-container font-bold mt-1">Blockchain Activo</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 text-center text-secondary">
        <Construction size={40} strokeWidth={1} className="text-outline/40 mb-2 mx-auto" />
        <p className="text-sm font-medium">Módulo completo disponible próximamente.</p>
      </div>
    </div>
  )
}
