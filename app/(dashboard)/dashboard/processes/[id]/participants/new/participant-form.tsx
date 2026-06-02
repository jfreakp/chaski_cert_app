'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { addParticipant } from '@/app/actions/processes'
import { GraduationCap, Loader2, UserPlus } from 'lucide-react'

type Student = { id: string; name: string; dni: string; career: string | null }

export default function ParticipantForm({ processId, students }: { processId: string; students: Student[] }) {
  const boundAction = addParticipant.bind(null, processId)
  const [state, action, pending] = useActionState(boundAction, undefined)

  return (
    <div className="bg-white rounded-xl shadow-sm p-8 border border-surface-container">
      <form action={action} className="space-y-6">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">Estudiante *</label>
          <div className="relative">
            <GraduationCap size={16} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
            {students.length > 0 ? (
              <select name="studentId" required
                className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface transition-all appearance-none cursor-pointer">
                <option value="">Selecciona un estudiante...</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.dni}{s.career ? ` (${s.career})` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <div className="w-full pl-11 pr-4 py-3 bg-surface-container-low rounded-lg text-sm text-outline">
                Todos los estudiantes matriculados ya están en este proceso.
              </div>
            )}
          </div>
          {state?.errors?.studentId && <p className="text-xs text-error">{state.errors.studentId[0]}</p>}
        </div>

        {state?.message && (
          <div className="px-4 py-3 bg-error-container text-on-error-container text-sm font-medium rounded-lg">
            {state.message}
          </div>
        )}

        <div className="flex justify-end items-center gap-4 pt-2">
          <Link href={`/dashboard/processes/${processId}`}
            className="text-sm font-bold text-secondary hover:text-on-surface transition-colors">
            Cancelar
          </Link>
          <button type="submit" disabled={pending || students.length === 0}
            className="inline-flex items-center gap-2 bg-primary-container hover:bg-primary text-white font-bold py-3 px-8 rounded-lg transition-all shadow-lg shadow-primary-container/20 active:scale-95 disabled:opacity-60 text-sm">
            {pending
              ? <><Loader2 size={16} strokeWidth={2} className="animate-spin" />Agregando...</>
              : <><UserPlus size={16} strokeWidth={1.75} />Agregar al Proceso</>}
          </button>
        </div>
      </form>
    </div>
  )
}
