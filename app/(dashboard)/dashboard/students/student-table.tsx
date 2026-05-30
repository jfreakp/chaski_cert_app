'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import { toggleStudentStatus, removeEnrollment } from '@/app/actions/students'
import { Pencil, Trash2, CheckCircle, XCircle, Loader2 } from 'lucide-react'

type Enrollment = {
  id: string
  createdAt: Date
  student: {
    id: string
    name: string
    dni: string
    email: string | null
    isActive: boolean
  }
  institution: { name: string; code: string }
  career: { name: string } | null
}

function RowActions({ enrollment }: { enrollment: Enrollment }) {
  const [pendingToggle, startToggle] = useTransition()
  const [pendingRemove, startRemove] = useTransition()

  return (
    <div className="flex items-center gap-1 justify-end">
      <Link
        href={`/dashboard/students/${enrollment.id}/edit`}
        className="p-2 rounded-lg text-secondary hover:text-primary-container hover:bg-surface-container-low transition-all"
        title="Editar"
      >
        <Pencil size={16} strokeWidth={1.75} />
      </Link>

      <button
        onClick={() => startToggle(() => toggleStudentStatus(enrollment.student.id))}
        disabled={pendingToggle}
        title={enrollment.student.isActive ? 'Desactivar' : 'Activar'}
        className="p-2 rounded-lg text-secondary hover:bg-surface-container-low transition-all disabled:opacity-40"
      >
        {pendingToggle ? (
          <Loader2 size={16} strokeWidth={2} className="animate-spin" />
        ) : enrollment.student.isActive ? (
          <XCircle size={16} strokeWidth={1.75} className="hover:text-amber-500" />
        ) : (
          <CheckCircle size={16} strokeWidth={1.75} className="hover:text-green-600" />
        )}
      </button>

      <button
        onClick={() => {
          if (confirm(`¿Quitar a ${enrollment.student.name} de esta institución?`)) {
            startRemove(() => removeEnrollment(enrollment.id))
          }
        }}
        disabled={pendingRemove}
        title="Quitar de esta institución"
        className="p-2 rounded-lg text-secondary hover:text-error hover:bg-error-container/10 transition-all disabled:opacity-40"
      >
        {pendingRemove ? <Loader2 size={16} strokeWidth={2} className="animate-spin" /> : <Trash2 size={16} strokeWidth={1.75} />}
      </button>
    </div>
  )
}

export default function StudentTable({
  enrollments,
  showInstitution = false,
}: {
  enrollments: Enrollment[]
  showInstitution?: boolean
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-surface-container">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-container bg-surface-container-lowest">
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary">Estudiante</th>
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary hidden md:table-cell">Cédula</th>
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary hidden lg:table-cell">Carrera</th>
            {showInstitution && (
              <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary hidden lg:table-cell">Institución</th>
            )}
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary">Estado</th>
            <th className="px-6 py-4" />
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-container">
          {enrollments.map((e) => {
            const initials = e.student.name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
            return (
              <tr key={e.id} className="hover:bg-surface-container-lowest/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-tertiary/20 flex items-center justify-center text-tertiary text-xs font-bold shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-on-surface truncate">{e.student.name}</p>
                      <p className="text-xs text-secondary truncate">{e.student.email ?? '—'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 hidden md:table-cell">
                  <span className="inline-block px-2.5 py-1 bg-surface-container rounded-md text-[10px] font-bold tracking-wider text-secondary font-mono">
                    {e.student.dni}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-secondary hidden lg:table-cell truncate max-w-[200px]">
                  {e.career?.name ?? '—'}
                </td>
                {showInstitution && (
                  <td className="px-6 py-4 hidden lg:table-cell">
                    <p className="text-sm font-medium text-on-surface">{e.institution.code}</p>
                  </td>
                )}
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${e.student.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-surface-container text-secondary'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${e.student.isActive ? 'bg-emerald-500' : 'bg-outline'}`} />
                    {e.student.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-6 py-4"><RowActions enrollment={e} /></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
