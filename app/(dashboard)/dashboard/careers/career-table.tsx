'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import { toggleCareerStatus, deleteCareer } from '@/app/actions/careers'
import { Pencil, Trash2, CheckCircle, XCircle, Loader2 } from 'lucide-react'

type Career = {
  id: string
  name: string
  isActive: boolean
  createdAt: Date
  _count: { enrollments: number }
}

function RowActions({ career }: { career: Career }) {
  const [pendingToggle, startToggle] = useTransition()
  const [pendingDelete, startDelete] = useTransition()

  return (
    <div className="flex items-center gap-1 justify-end">
      <Link
        href={`/dashboard/careers/${career.id}/edit`}
        className="p-2 rounded-lg text-secondary hover:text-primary-container hover:bg-surface-container-low transition-all"
        title="Editar"
      >
        <Pencil size={16} strokeWidth={1.75} />
      </Link>

      <button
        onClick={() => startToggle(() => toggleCareerStatus(career.id))}
        disabled={pendingToggle}
        title={career.isActive ? 'Desactivar' : 'Activar'}
        className="p-2 rounded-lg text-secondary hover:bg-surface-container-low transition-all disabled:opacity-40"
      >
        {pendingToggle ? (
          <Loader2 size={16} strokeWidth={2} className="animate-spin" />
        ) : career.isActive ? (
          <XCircle size={16} strokeWidth={1.75} className="hover:text-amber-500" />
        ) : (
          <CheckCircle size={16} strokeWidth={1.75} className="hover:text-green-600" />
        )}
      </button>

      <button
        onClick={() => {
          if (career._count.enrollments > 0) return
          if (confirm(`¿Eliminar "${career.name}"?`)) {
            startDelete(() => deleteCareer(career.id))
          }
        }}
        disabled={pendingDelete || career._count.enrollments > 0}
        title={career._count.enrollments > 0 ? 'Tiene estudiantes asociados' : 'Eliminar'}
        className="p-2 rounded-lg text-secondary hover:text-error hover:bg-error-container/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {pendingDelete ? <Loader2 size={16} strokeWidth={2} className="animate-spin" /> : <Trash2 size={16} strokeWidth={1.75} />}
      </button>
    </div>
  )
}

export default function CareerTable({ careers }: { careers: Career[] }) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-surface-container">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-container bg-surface-container-lowest">
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary">Carrera</th>
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary hidden md:table-cell">Estudiantes</th>
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary hidden lg:table-cell">Creada</th>
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary">Estado</th>
            <th className="px-6 py-4" />
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-container">
          {careers.map((c) => (
            <tr key={c.id} className="hover:bg-surface-container-lowest/50 transition-colors">
              <td className="px-6 py-4 font-semibold text-on-surface">{c.name}</td>
              <td className="px-6 py-4 hidden md:table-cell">
                <span className="text-sm font-semibold text-on-surface">{c._count.enrollments}</span>
              </td>
              <td className="px-6 py-4 text-xs text-secondary hidden lg:table-cell">
                {new Date(c.createdAt).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })}
              </td>
              <td className="px-6 py-4">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${c.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-surface-container text-secondary'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${c.isActive ? 'bg-emerald-500' : 'bg-outline'}`} />
                  {c.isActive ? 'Activa' : 'Inactiva'}
                </span>
              </td>
              <td className="px-6 py-4"><RowActions career={c} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
