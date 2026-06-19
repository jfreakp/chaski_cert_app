'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { toggleProcessStatus, deleteProcess } from '@/app/actions/processes'
import { Pencil, Trash2, CheckCircle, XCircle, Loader2, Users } from 'lucide-react'

type Process = {
  id: string
  name: string
  date: Date
  isActive: boolean
  institution: { name: string; code: string }
  certificateType: { name: string }
  _count: { participants: number; certificates: number }
}

function RowActions({ proc, isAdmin }: { proc: Process; isAdmin: boolean }) {
  const [pendingToggle, startToggle] = useTransition()
  const [pendingDelete, startDelete] = useTransition()

  if (isAdmin) return null

  return (
    <div className="flex items-center gap-1 justify-end">
      <Link href={`/dashboard/processes/${proc.id}/edit`}
        className="p-2 rounded-lg text-secondary hover:text-primary-container hover:bg-surface-container-low transition-all" title="Editar">
        <Pencil size={16} strokeWidth={1.75} />
      </Link>
      <button onClick={() => startToggle(() => toggleProcessStatus(proc.id))} disabled={pendingToggle}
        title={proc.isActive ? 'Desactivar' : 'Activar'}
        className="p-2 rounded-lg text-secondary hover:bg-surface-container-low transition-all disabled:opacity-40">
        {pendingToggle ? <Loader2 size={16} strokeWidth={2} className="animate-spin" /> :
          proc.isActive
            ? <XCircle size={16} strokeWidth={1.75} className="hover:text-amber-500" />
            : <CheckCircle size={16} strokeWidth={1.75} className="hover:text-green-600" />}
      </button>
      <button
        onClick={() => {
          if (proc._count.certificates > 0) {
            toast.error('No se puede eliminar un proceso con certificados generados.')
            return
          }
          toast.warning(`¿Eliminar "${proc.name}"?`, {
            action: { label: 'Eliminar', onClick: () => startDelete(() => deleteProcess(proc.id)) },
            cancel: { label: 'Cancelar', onClick: () => {} },
          })
        }}
        disabled={pendingDelete}
        className="p-2 rounded-lg text-secondary hover:text-error hover:bg-error-container/10 transition-all disabled:opacity-40">
        {pendingDelete ? <Loader2 size={16} strokeWidth={2} className="animate-spin" /> : <Trash2 size={16} strokeWidth={1.75} />}
      </button>
    </div>
  )
}

export default function ProcessTable({
  processes,
  showInstitution,
  isAdmin,
}: {
  processes: Process[]
  showInstitution: boolean
  isAdmin: boolean
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-surface-container">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-container bg-surface-container-lowest">
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary">Proceso</th>
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary hidden md:table-cell">Tipo</th>
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary hidden lg:table-cell">Fecha</th>
            {showInstitution && <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary hidden lg:table-cell">Institución</th>}
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary hidden md:table-cell">Participantes</th>
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary">Estado</th>
            <th className="px-6 py-4" />
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-container">
          {processes.map((p) => (
            <tr key={p.id} className="hover:bg-surface-container-lowest/50 transition-colors">
              <td className="px-6 py-4">
                <Link
                  href={`/dashboard/processes/${p.id}`}
                  className="font-semibold text-on-surface hover:text-primary-container transition-colors"
                >
                  {p.name}
                </Link>
              </td>
              <td className="px-6 py-4 hidden md:table-cell">
                <span className="inline-block px-2.5 py-1 bg-primary-container/10 text-primary-container rounded-md text-[10px] font-bold uppercase tracking-wider">
                  {p.certificateType.name}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-secondary hidden lg:table-cell">
                {new Date(p.date).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}
              </td>
              {showInstitution && (
                <td className="px-6 py-4 hidden lg:table-cell">
                  <p className="text-sm font-medium">{p.institution.code}</p>
                </td>
              )}
              <td className="px-6 py-4 hidden md:table-cell">
                <Link
                  href={`/dashboard/processes/${p.id}`}
                  className="inline-flex items-center gap-1.5 text-sm text-secondary hover:text-primary-container transition-colors"
                >
                  <Users size={14} strokeWidth={1.75} />
                  {p._count.participants}
                  {p._count.certificates > 0 && (
                    <span className="text-emerald-600 font-medium ml-1">({p._count.certificates} certs)</span>
                  )}
                </Link>
              </td>
              <td className="px-6 py-4">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${p.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-surface-container text-secondary'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${p.isActive ? 'bg-emerald-500' : 'bg-outline'}`} />
                  {p.isActive ? 'Activo' : 'Inactivo'}
                </span>
              </td>
              <td className="px-6 py-4"><RowActions proc={p} isAdmin={isAdmin} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
