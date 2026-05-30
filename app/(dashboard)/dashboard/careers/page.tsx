import Link from 'next/link'
import { requireInstitution } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { redirect } from 'next/navigation'
import { BookOpen, Plus } from 'lucide-react'
import { PROJECT_NAME } from '@/app/lib/config'
import CareerTable from './career-table'

export const metadata = { title: `${PROJECT_NAME} — Carreras` }

export default async function CareersPage() {
  const { session, institutionId } = await requireInstitution()
  if (session.role !== 'UNIVERSITY') redirect('/dashboard')

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { institution: { select: { name: true } } },
  })

  const careers = await prisma.career.findMany({
    where: { institutionId: institutionId! },
    select: {
      id: true,
      name: true,
      isActive: true,
      createdAt: true,
      _count: { select: { enrollments: true } },
    },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <span className="text-[10px] font-bold text-tertiary uppercase tracking-[0.3em] mb-2 block">
            {user?.institution?.name}
          </span>
          <h1 className="text-4xl font-extrabold text-on-surface tracking-tighter">Carreras</h1>
          <p className="text-secondary mt-2">Gestiona las carreras de tu institución.</p>
        </div>
        <Link
          href="/dashboard/careers/new"
          className="inline-flex items-center gap-2 bg-primary-container hover:bg-primary text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg shadow-primary-container/20 text-sm"
        >
          <Plus size={18} strokeWidth={1.75} />
          Nueva Carrera
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 border border-surface-container">
          <p className="text-[10px] font-bold text-tertiary uppercase tracking-widest mb-1">Total</p>
          <p className="text-3xl font-extrabold text-on-surface tracking-tighter">{careers.length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-surface-container">
          <p className="text-[10px] font-bold text-tertiary uppercase tracking-widest mb-1">Activas</p>
          <p className="text-3xl font-extrabold text-on-surface tracking-tighter">
            {careers.filter((c) => c.isActive).length}
          </p>
        </div>
      </div>

      {careers.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-secondary">
          <BookOpen size={40} strokeWidth={1} className="text-outline/40 mb-3 mx-auto" />
          <p className="text-sm font-medium">No hay carreras registradas.</p>
          <p className="text-xs mt-1">Crea una para poder asignarla a estudiantes.</p>
        </div>
      ) : (
        <CareerTable careers={careers} />
      )}
    </div>
  )
}
