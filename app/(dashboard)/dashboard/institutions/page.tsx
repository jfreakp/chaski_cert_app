import Link from 'next/link'
import { requireAdmin } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { Building2, Plus } from 'lucide-react'
import { PROJECT_NAME } from '@/app/lib/config'
import InstitutionTable from './institution-table'

export const metadata = { title: `${PROJECT_NAME} — Instituciones` }

export default async function InstitutionsPage() {
  await requireAdmin()

  const institutions = await prisma.institution.findMany({
    select: {
      id: true,
      name: true,
      code: true,
      country: true,
      isActive: true,
      createdAt: true,
      _count: { select: { users: true, enrollments: true, careers: true } },
    },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <span className="text-[10px] font-bold text-tertiary uppercase tracking-[0.3em] mb-2 block">
            Administración
          </span>
          <h1 className="text-4xl font-extrabold text-on-surface tracking-tighter">
            Instituciones
          </h1>
          <p className="text-secondary mt-2">
            Gestiona las universidades e instituciones habilitadas en {PROJECT_NAME}.
          </p>
        </div>

        <Link
          href="/dashboard/institutions/new"
          className="inline-flex items-center gap-2 bg-primary-container hover:bg-primary text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg shadow-primary-container/20 text-sm"
        >
          <Plus size={18} strokeWidth={1.75} />
          Nueva Institución
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 border border-surface-container">
          <p className="text-[10px] font-bold text-tertiary uppercase tracking-widest mb-1">Total</p>
          <p className="text-3xl font-extrabold text-on-surface tracking-tighter">{institutions.length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-surface-container">
          <p className="text-[10px] font-bold text-tertiary uppercase tracking-widest mb-1">Activas</p>
          <p className="text-3xl font-extrabold text-on-surface tracking-tighter">
            {institutions.filter((i) => i.isActive).length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-surface-container">
          <p className="text-[10px] font-bold text-tertiary uppercase tracking-widest mb-1">Usuarios</p>
          <p className="text-3xl font-extrabold text-on-surface tracking-tighter">
            {institutions.reduce((sum, i) => sum + i._count.users, 0)}
          </p>
        </div>
      </div>

      {/* Table */}
      {institutions.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-secondary">
          <Building2 size={40} strokeWidth={1} className="text-outline/40 mb-3 mx-auto" />
          <p className="text-sm font-medium">No hay instituciones registradas.</p>
        </div>
      ) : (
        <InstitutionTable institutions={institutions} />
      )}
    </div>
  )
}
