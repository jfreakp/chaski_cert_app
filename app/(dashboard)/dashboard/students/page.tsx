import Link from 'next/link'
import { verifySession } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { GraduationCap, UserPlus } from 'lucide-react'
import { PROJECT_NAME } from '@/app/lib/config'
import StudentFilters from './student-filters'
import CsvUpload from './csv-upload'

export const metadata = { title: `${PROJECT_NAME} — Estudiantes` }

export default async function StudentsPage() {
  const session = await verifySession()
  const isAdmin = session.role === 'ADMIN'

  let institutionId: string | null = null
  if (!isAdmin) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { institutionId: true },
    })
    institutionId = user?.institutionId ?? null
  }

  // Carreras para filtro: las de su institución si UNIVERSITY, o todas si ADMIN
  const careers = await prisma.career.findMany({
    where: institutionId ? { institutionId, isActive: true } : { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  // Traer matrículas filtradas por institución o todas
  const enrollments = await prisma.studentEnrollment.findMany({
    where: institutionId ? { institutionId } : undefined,
    select: {
      id: true,
      createdAt: true,
      student: { select: { id: true, name: true, dni: true, email: true, isActive: true } },
      institution: { select: { name: true, code: true } },
      career: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <span className="text-[10px] font-bold text-tertiary uppercase tracking-[0.3em] mb-2 block">
            Estudiantes
          </span>
          <h1 className="text-4xl font-extrabold text-on-surface tracking-tighter">
            Registro de Estudiantes
          </h1>
          <p className="text-secondary mt-2">
            {isAdmin ? 'Todos los estudiantes registrados en la plataforma.' : 'Estudiantes matriculados en tu institución.'}
          </p>
        </div>

        {!isAdmin && (
          <Link
            href="/dashboard/students/new"
            className="inline-flex items-center gap-2 bg-primary-container hover:bg-primary text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg shadow-primary-container/20 text-sm"
          >
            <UserPlus size={18} strokeWidth={1.75} />
            Nuevo Estudiante
          </Link>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 border border-surface-container">
          <p className="text-[10px] font-bold text-tertiary uppercase tracking-widest mb-1">Total</p>
          <p className="text-3xl font-extrabold text-on-surface tracking-tighter">{enrollments.length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-surface-container">
          <p className="text-[10px] font-bold text-tertiary uppercase tracking-widest mb-1">Activos</p>
          <p className="text-3xl font-extrabold text-on-surface tracking-tighter">
            {enrollments.filter((e) => e.student.isActive).length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-surface-container">
          <p className="text-[10px] font-bold text-tertiary uppercase tracking-widest mb-1">Con correo</p>
          <p className="text-3xl font-extrabold text-on-surface tracking-tighter">
            {enrollments.filter((e) => e.student.email).length}
          </p>
        </div>
      </div>

      {!isAdmin && <div className="mb-6"><CsvUpload careers={careers} /></div>}

      {enrollments.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-secondary">
          <GraduationCap size={40} strokeWidth={1} className="text-outline/40 mb-3 mx-auto" />
          <p className="text-sm font-medium">No hay estudiantes registrados.</p>
          {!isAdmin && <p className="text-xs mt-1">Agrega uno manualmente o importa un CSV.</p>}
        </div>
      ) : (
        <StudentFilters enrollments={enrollments} careers={careers} showInstitution={isAdmin} />
      )}
    </div>
  )
}
