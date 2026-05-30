import { verifySession } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { GraduationCap, BadgeCheck, Building2, Users, BookOpen, Network } from 'lucide-react'
import { PROJECT_NAME } from '@/app/lib/config'

export const metadata = { title: `${PROJECT_NAME} — Dashboard` }

export default async function DashboardPage() {
  const session = await verifySession()
  const isAdmin = session.role === 'ADMIN'

  let institutionId: string | null = null
  if (!isAdmin) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { institutionId: true, institution: { select: { name: true } } },
    })
    institutionId = user?.institutionId ?? null
  }

  const [totalStudents, totalCareers, totalInstitutions, totalUsers] = await Promise.all([
    prisma.studentEnrollment.count({
      where: institutionId ? { institutionId } : undefined,
    }),
    prisma.career.count({
      where: institutionId ? { institutionId } : undefined,
    }),
    isAdmin ? prisma.institution.count() : Promise.resolve(null),
    isAdmin ? prisma.user.count() : Promise.resolve(null),
  ])

  const stats = isAdmin
    ? [
        { label: 'Estudiantes', value: totalStudents, icon: GraduationCap },
        { label: 'Instituciones', value: totalInstitutions!, icon: Building2 },
        { label: 'Usuarios', value: totalUsers!, icon: Users },
      ]
    : [
        { label: 'Estudiantes', value: totalStudents, icon: GraduationCap },
        { label: 'Carreras', value: totalCareers, icon: BookOpen },
        { label: 'Certificados Emitidos', value: 0, icon: BadgeCheck },
      ]

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      <div className="mb-10">
        <span className="text-[10px] font-bold text-tertiary uppercase tracking-[0.3em] mb-2 block">
          Panel Principal
        </span>
        <h1 className="text-4xl font-extrabold text-on-surface tracking-tighter">Dashboard</h1>
        <p className="text-secondary mt-2">
          Bienvenido,{' '}
          <span className="font-bold text-primary-container">
            {isAdmin ? 'Administrador' : 'Universidad'}
          </span>
          .
        </p>
      </div>

      {/* Stats reales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white border border-surface-container p-6 rounded-xl relative overflow-hidden group">
            <div className="absolute top-3 right-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <Icon size={56} strokeWidth={1} />
            </div>
            <div className="relative z-10">
              <span className="text-[10px] font-extrabold text-tertiary uppercase tracking-widest block mb-4">
                {label}
              </span>
              <div className="text-4xl font-extrabold text-on-surface tracking-tighter">{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Estado de red — placeholder hasta Fase 5 */}
      <div className="bg-surface-container-low p-6 rounded-xl">
        <div className="flex items-center gap-3 mb-2">
          <Network size={18} strokeWidth={1.75} className="text-tertiary" />
          <span className="text-[10px] font-extrabold text-tertiary uppercase tracking-widest">Red Blockchain</span>
          <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-secondary font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Pendiente de configuración
          </span>
        </div>
        <p className="text-xs text-secondary">La integración con Polygon se habilitará en la Fase 5 del proyecto.</p>
      </div>
    </div>
  )
}
