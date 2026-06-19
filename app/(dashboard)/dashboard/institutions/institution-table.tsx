'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { toggleInstitutionStatus, deleteInstitution } from '@/app/actions/institutions'
import { Pencil, Trash2, CheckCircle, XCircle, Loader2 } from 'lucide-react'

type Institution = {
  id: string
  name: string
  code: string
  country: string | null
  isActive: boolean
  createdAt: Date
  _count: { users: number; enrollments: number; careers: number }
}

function RowActions({ institution }: { institution: Institution }) {
  const [pendingToggle, startToggle] = useTransition()
  const [pendingDelete, startDelete] = useTransition()

  return (
    <div className="flex items-center gap-1 justify-end">
      <Link
        href={`/dashboard/institutions/${institution.id}/edit`}
        className="p-2 rounded-lg text-secondary hover:text-primary-container hover:bg-surface-container-low transition-all"
        title="Editar"
      >
        <Pencil size={16} strokeWidth={1.75} />
      </Link>

      <button
        onClick={() => startToggle(() => toggleInstitutionStatus(institution.id))}
        disabled={pendingToggle}
        title={institution.isActive ? 'Desactivar' : 'Activar'}
        className="p-2 rounded-lg text-secondary hover:bg-surface-container-low transition-all disabled:opacity-40"
      >
        {pendingToggle ? (
          <Loader2 size={16} strokeWidth={2} className="animate-spin" />
        ) : institution.isActive ? (
          <XCircle size={16} strokeWidth={1.75} className="hover:text-amber-500" />
        ) : (
          <CheckCircle size={16} strokeWidth={1.75} className="hover:text-green-600" />
        )}
      </button>

      <button
        onClick={() => {
          toast.warning(`¿Eliminar "${institution.name}"? Esta acción no se puede deshacer.`, {
            action: { label: 'Eliminar', onClick: () => startDelete(() => deleteInstitution(institution.id)) },
            cancel: { label: 'Cancelar', onClick: () => {} },
          })
        }}
        disabled={pendingDelete || institution._count.users > 0 || institution._count.enrollments > 0 || institution._count.careers > 0}
        title={
          institution._count.users > 0 ? 'Tiene usuarios asociados' :
          institution._count.enrollments > 0 ? 'Tiene estudiantes matriculados' :
          institution._count.careers > 0 ? 'Tiene carreras registradas' : 'Eliminar'
        }
        className="p-2 rounded-lg text-secondary hover:text-error hover:bg-error-container/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {pendingDelete ? (
          <Loader2 size={16} strokeWidth={2} className="animate-spin" />
        ) : (
          <Trash2 size={16} strokeWidth={1.75} />
        )}
      </button>
    </div>
  )
}

export default function InstitutionTable({ institutions }: { institutions: Institution[] }) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-surface-container">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-container bg-surface-container-lowest">
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary">Institución</th>
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary hidden md:table-cell">Código</th>
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary hidden lg:table-cell">País</th>
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary hidden md:table-cell">Usuarios</th>
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary">Estado</th>
            <th className="px-6 py-4" />
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-container">
          {institutions.map((inst) => (
            <tr key={inst.id} className="hover:bg-surface-container-lowest/50 transition-colors">
              <td className="px-6 py-4">
                <p className="font-semibold text-on-surface">{inst.name}</p>
                <p className="text-xs text-secondary mt-0.5">
                  {new Date(inst.createdAt).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </td>
              <td className="px-6 py-4 hidden md:table-cell">
                <span className="inline-block px-2.5 py-1 bg-surface-container rounded-md text-[10px] font-bold uppercase tracking-wider text-secondary">
                  {inst.code}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-secondary hidden lg:table-cell">
                {inst.country ?? '—'}
              </td>
              <td className="px-6 py-4 hidden md:table-cell">
                <span className="text-sm font-semibold text-on-surface">{inst._count.users}</span>
              </td>
              <td className="px-6 py-4">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${inst.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-surface-container text-secondary'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${inst.isActive ? 'bg-emerald-500' : 'bg-outline'}`} />
                  {inst.isActive ? 'Activa' : 'Inactiva'}
                </span>
              </td>
              <td className="px-6 py-4">
                <RowActions institution={inst} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
