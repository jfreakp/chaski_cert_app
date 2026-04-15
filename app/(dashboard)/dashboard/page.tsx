import { verifySession } from '@/app/lib/dal'
import { Role } from '@/app/lib/definitions'
import { GraduationCap, BadgeCheck, Network } from 'lucide-react'
import { PROJECT_NAME } from '@/app/lib/config'

export const metadata = { title: `${PROJECT_NAME} — Dashboard` }

export default async function DashboardPage() {
  const session = await verifySession()

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <span className="text-[10px] font-bold text-tertiary uppercase tracking-[0.3em] mb-2 block">
          Panel Principal
        </span>
        <h1 className="text-4xl font-extrabold text-on-surface tracking-tighter">Dashboard</h1>
        <p className="text-secondary mt-2">
          Bienvenido,{' '}
          <span className="font-bold text-primary-container">
            {session.role === Role.ADMIN ? 'Administrador' : 'Institución Emisora'}
          </span>
          .
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-container-low p-6 rounded-xl relative overflow-hidden group">
          <div className="absolute top-3 right-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <GraduationCap size={56} strokeWidth={1} />
          </div>
          <div className="relative z-10">
            <span className="text-[10px] font-extrabold text-tertiary uppercase tracking-widest block mb-4">
              Total Estudiantes
            </span>
            <div className="text-3xl font-bold text-on-surface">2,842</div>
            <div className="text-xs text-primary-container font-bold mt-1">+12% este mes</div>
          </div>
        </div>

        <div className="bg-surface-container-low p-6 rounded-xl relative overflow-hidden group">
          <div className="absolute top-3 right-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <BadgeCheck size={56} strokeWidth={1} />
          </div>
          <div className="relative z-10">
            <span className="text-[10px] font-extrabold text-tertiary uppercase tracking-widest block mb-4">
              Certificados Emitidos
            </span>
            <div className="text-3xl font-bold text-on-surface">1,920</div>
            <div className="text-xs text-secondary font-medium mt-1">Blockchain Activo</div>
          </div>
        </div>

        <div className="bg-surface-container-low p-6 rounded-xl relative overflow-hidden group">
          <div className="absolute top-3 right-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Network size={56} strokeWidth={1} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-extrabold text-tertiary uppercase tracking-widest">Red</span>
            </div>
            <div className="text-xl font-bold text-on-surface">Polygon Mainnet</div>
            <div className="text-xs text-secondary font-medium mt-1">Latencia: 14ms (Óptima)</div>
          </div>
        </div>
      </div>
    </div>
  )
}
