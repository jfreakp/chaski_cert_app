'use client'

import { useState } from 'react'
import { useActionState } from 'react'
import { addParticipants } from '@/app/actions/processes'
import Link from 'next/link'
import { GraduationCap, Loader2, UserPlus } from 'lucide-react'

type Student = { id: string; name: string; dni: string; career: string | null }

export default function StudentPickerTable({
  students,
  processId,
}: {
  students: Student[]
  processId: string
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const boundAction = addParticipants.bind(null, processId)
  const [state, action, pending] = useActionState(boundAction, undefined)

  const allSelected = students.length > 0 && students.every(s => selected.has(s.id))

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(students.map(s => s.id)))
  }

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (students.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center text-secondary border border-surface-container">
        <GraduationCap size={40} strokeWidth={1} className="text-outline/40 mb-3 mx-auto" />
        <p className="text-sm font-medium">No hay estudiantes disponibles para agregar.</p>
        <Link
          href={`/dashboard/processes/${processId}`}
          className="mt-2 text-xs text-primary-container font-bold hover:underline block"
        >
          Volver al proceso
        </Link>
      </div>
    )
  }

  return (
    <form action={action} className="space-y-4">
      {Array.from(selected).map(id => (
        <input key={id} type="hidden" name="studentId" value={id} />
      ))}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-surface-container">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-container bg-surface-container-lowest">
              <th className="px-6 py-4 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="rounded border-surface-container accent-primary-container cursor-pointer"
                  aria-label="Seleccionar todos"
                />
              </th>
              <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary">Nombre</th>
              <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary hidden md:table-cell">Cédula</th>
              <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary hidden md:table-cell">Carrera</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container">
            {students.map(s => (
              <tr
                key={s.id}
                onClick={() => toggle(s.id)}
                className={`cursor-pointer transition-colors ${
                  selected.has(s.id)
                    ? 'bg-primary-container/5'
                    : 'hover:bg-surface-container-lowest/50'
                }`}
              >
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selected.has(s.id)}
                    onChange={() => toggle(s.id)}
                    onClick={e => e.stopPropagation()}
                    className="rounded border-surface-container accent-primary-container cursor-pointer"
                  />
                </td>
                <td className="px-6 py-4 font-semibold text-on-surface">{s.name}</td>
                <td className="px-6 py-4 text-secondary hidden md:table-cell">{s.dni}</td>
                <td className="px-6 py-4 text-secondary hidden md:table-cell">{s.career ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {state?.message && (
        <div className="px-4 py-3 bg-error-container text-on-error-container text-sm font-medium rounded-lg">
          {state.message}
        </div>
      )}

      <div className="flex justify-between items-center pt-2">
        <p className="text-sm text-secondary font-medium">
          {selected.size > 0
            ? `${selected.size} seleccionado${selected.size !== 1 ? 's' : ''}`
            : 'Ninguno seleccionado'}
        </p>
        <div className="flex items-center gap-4">
          <Link
            href={`/dashboard/processes/${processId}`}
            className="text-sm font-bold text-secondary hover:text-on-surface transition-colors"
          >
            Omitir por ahora
          </Link>
          <button
            type="submit"
            disabled={pending || selected.size === 0}
            className="inline-flex items-center gap-2 bg-primary-container hover:bg-primary text-white font-bold py-3 px-8 rounded-lg transition-all shadow-lg shadow-primary-container/20 active:scale-95 disabled:opacity-60 text-sm"
          >
            {pending ? (
              <><Loader2 size={16} strokeWidth={2} className="animate-spin" />Agregando...</>
            ) : (
              <><UserPlus size={16} strokeWidth={1.75} />Agregar {selected.size > 0 ? `${selected.size} ` : ''}seleccionado{selected.size !== 1 ? 's' : ''}</>
            )}
          </button>
        </div>
      </div>
    </form>
  )
}
