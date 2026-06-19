'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { toggleCertificateTypeStatus, deleteCertificateType } from '@/app/actions/certificate-types'
import { GraduationCap, Pencil, Trash2, CheckCircle, XCircle, Loader2 } from 'lucide-react'

type CertType = {
  id: string
  name: string
  description: string | null
  isActive: boolean
  requiresCareer: boolean
  createdAt: Date
  _count: { processes: number }
}

function RowActions({ type }: { type: CertType }) {
  const [pendingToggle, startToggle] = useTransition()
  const [pendingDelete, startDelete] = useTransition()

  return (
    <div className="flex items-center gap-1 justify-end">
      <Link href={`/dashboard/certificate-types/${type.id}/edit`}
        className="p-2 rounded-lg text-secondary hover:text-primary-container hover:bg-surface-container-low transition-all" title="Editar">
        <Pencil size={16} strokeWidth={1.75} />
      </Link>
      <button onClick={() => startToggle(() => toggleCertificateTypeStatus(type.id))} disabled={pendingToggle}
        title={type.isActive ? 'Desactivar' : 'Activar'}
        className="p-2 rounded-lg text-secondary hover:bg-surface-container-low transition-all disabled:opacity-40">
        {pendingToggle ? <Loader2 size={16} strokeWidth={2} className="animate-spin" /> :
          type.isActive ? <XCircle size={16} strokeWidth={1.75} className="hover:text-amber-500" /> :
          <CheckCircle size={16} strokeWidth={1.75} className="hover:text-green-600" />}
      </button>
      <button
        onClick={() => {
          if (type._count.processes > 0) return
          toast.warning(`¿Eliminar "${type.name}"?`, {
            action: { label: 'Eliminar', onClick: () => startDelete(() => deleteCertificateType(type.id)) },
            cancel: { label: 'Cancelar', onClick: () => {} },
          })
        }}
        disabled={pendingDelete || type._count.processes > 0}
        title={type._count.processes > 0 ? 'Tiene procesos asociados' : 'Eliminar'}
        className="p-2 rounded-lg text-secondary hover:text-error hover:bg-error-container/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
        {pendingDelete ? <Loader2 size={16} strokeWidth={2} className="animate-spin" /> : <Trash2 size={16} strokeWidth={1.75} />}
      </button>
    </div>
  )
}

export default function CertificateTypeTable({ types }: { types: CertType[] }) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-surface-container">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-container bg-surface-container-lowest">
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary">Tipo</th>
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary hidden md:table-cell">Procesos</th>
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary hidden md:table-cell">Carrera req.</th>
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary">Estado</th>
            <th className="px-6 py-4" />
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-container">
          {types.map((t) => (
            <tr key={t.id} className="hover:bg-surface-container-lowest/50 transition-colors">
              <td className="px-6 py-4">
                <p className="font-semibold text-on-surface">{t.name}</p>
                {t.description && <p className="text-xs text-secondary mt-0.5">{t.description}</p>}
              </td>
              <td className="px-6 py-4 hidden md:table-cell">
                <span className="text-sm font-semibold text-on-surface">{t._count.processes}</span>
              </td>
              <td className="px-6 py-4 hidden md:table-cell">
                {t.requiresCareer
                  ? <div title="Sí"><GraduationCap size={16} strokeWidth={1.75} className="text-primary-container" /></div>
                  : <span className="text-secondary">—</span>}
              </td>
              <td className="px-6 py-4">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${t.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-surface-container text-secondary'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${t.isActive ? 'bg-emerald-500' : 'bg-outline'}`} />
                  {t.isActive ? 'Activo' : 'Inactivo'}
                </span>
              </td>
              <td className="px-6 py-4"><RowActions type={t} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
