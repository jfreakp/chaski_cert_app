import Link from 'next/link'
import { requireAdmin } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { BadgeCheck, Plus } from 'lucide-react'
import { PROJECT_NAME } from '@/app/lib/config'
import CertificateTypeTable from './certificate-type-table'

export const metadata = { title: `${PROJECT_NAME} — Tipos de Certificado` }

export default async function CertificateTypesPage() {
  await requireAdmin()

  const types = await prisma.certificateType.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      requiresCareer: true,
      createdAt: true,
      _count: { select: { processes: true } },
    },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <span className="text-[10px] font-bold text-tertiary uppercase tracking-[0.3em] mb-2 block">
            Administración
          </span>
          <h1 className="text-4xl font-extrabold text-on-surface tracking-tighter">Tipos de Certificado</h1>
          <p className="text-secondary mt-2">Define los tipos de certificados que las instituciones pueden emitir.</p>
        </div>
        <Link
          href="/dashboard/certificate-types/new"
          className="inline-flex items-center gap-2 bg-primary-container hover:bg-primary text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg shadow-primary-container/20 text-sm"
        >
          <Plus size={18} strokeWidth={1.75} />
          Nuevo Tipo
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 border border-surface-container">
          <p className="text-[10px] font-bold text-tertiary uppercase tracking-widest mb-1">Total</p>
          <p className="text-3xl font-extrabold text-on-surface tracking-tighter">{types.length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-surface-container">
          <p className="text-[10px] font-bold text-tertiary uppercase tracking-widest mb-1">Activos</p>
          <p className="text-3xl font-extrabold text-on-surface tracking-tighter">{types.filter(t => t.isActive).length}</p>
        </div>
      </div>

      {types.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-secondary">
          <BadgeCheck size={40} strokeWidth={1} className="text-outline/40 mb-3 mx-auto" />
          <p className="text-sm font-medium">No hay tipos de certificado registrados.</p>
        </div>
      ) : (
        <CertificateTypeTable types={types} />
      )}
    </div>
  )
}
