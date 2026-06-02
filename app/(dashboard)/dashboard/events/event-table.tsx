'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import { toggleEventStatus, deleteEvent } from '@/app/actions/events'
import { Pencil, Trash2, CheckCircle, XCircle, Loader2 } from 'lucide-react'

type Event = {
  id: string
  name: string
  date: Date
  location: string | null
  isActive: boolean
  institution: { name: string; code: string }
  certificateType: { name: string }
}

function RowActions({ event, isAdmin }: { event: Event; isAdmin: boolean }) {
  const [pendingToggle, startToggle] = useTransition()
  const [pendingDelete, startDelete] = useTransition()

  if (isAdmin) return null

  return (
    <div className="flex items-center gap-1 justify-end">
      <Link href={`/dashboard/events/${event.id}/edit`}
        className="p-2 rounded-lg text-secondary hover:text-primary-container hover:bg-surface-container-low transition-all" title="Editar">
        <Pencil size={16} strokeWidth={1.75} />
      </Link>
      <button onClick={() => startToggle(() => toggleEventStatus(event.id))} disabled={pendingToggle}
        title={event.isActive ? 'Desactivar' : 'Activar'}
        className="p-2 rounded-lg text-secondary hover:bg-surface-container-low transition-all disabled:opacity-40">
        {pendingToggle ? <Loader2 size={16} strokeWidth={2} className="animate-spin" /> :
          event.isActive ? <XCircle size={16} strokeWidth={1.75} className="hover:text-amber-500" /> :
          <CheckCircle size={16} strokeWidth={1.75} className="hover:text-green-600" />}
      </button>
      <button
        onClick={() => { if (confirm(`¿Eliminar "${event.name}"?`)) startDelete(() => deleteEvent(event.id)) }}
        disabled={pendingDelete}
        className="p-2 rounded-lg text-secondary hover:text-error hover:bg-error-container/10 transition-all disabled:opacity-40">
        {pendingDelete ? <Loader2 size={16} strokeWidth={2} className="animate-spin" /> : <Trash2 size={16} strokeWidth={1.75} />}
      </button>
    </div>
  )
}

export default function EventTable({ events, showInstitution, isAdmin }: { events: Event[]; showInstitution: boolean; isAdmin: boolean }) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-surface-container">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-container bg-surface-container-lowest">
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary">Evento</th>
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary hidden md:table-cell">Tipo</th>
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary hidden lg:table-cell">Fecha</th>
            {showInstitution && <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary hidden lg:table-cell">Institución</th>}
            <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary">Estado</th>
            <th className="px-6 py-4" />
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-container">
          {events.map((e) => (
            <tr key={e.id} className="hover:bg-surface-container-lowest/50 transition-colors">
              <td className="px-6 py-4">
                <p className="font-semibold text-on-surface">{e.name}</p>
                {e.location && <p className="text-xs text-secondary mt-0.5">{e.location}</p>}
              </td>
              <td className="px-6 py-4 hidden md:table-cell">
                <span className="inline-block px-2.5 py-1 bg-primary-container/10 text-primary-container rounded-md text-[10px] font-bold uppercase tracking-wider">
                  {e.certificateType.name}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-secondary hidden lg:table-cell">
                {new Date(e.date).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}
              </td>
              {showInstitution && (
                <td className="px-6 py-4 hidden lg:table-cell">
                  <p className="text-sm font-medium">{e.institution.code}</p>
                </td>
              )}
              <td className="px-6 py-4">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${e.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-surface-container text-secondary'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${e.isActive ? 'bg-emerald-500' : 'bg-outline'}`} />
                  {e.isActive ? 'Activo' : 'Inactivo'}
                </span>
              </td>
              <td className="px-6 py-4"><RowActions event={e} isAdmin={isAdmin} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
