'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { createCareer } from '@/app/actions/careers'
import { BookOpen, Loader2, Save } from 'lucide-react'

export default function CareerForm() {
  const [state, action, pending] = useActionState(createCareer, undefined)

  return (
    <div className="bg-white rounded-xl shadow-sm p-8 border border-surface-container">
      <form action={action} className="space-y-6">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">
            Nombre de la Carrera *
          </label>
          <div className="relative">
            <BookOpen size={16} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
            <input
              name="name"
              type="text"
              required
              placeholder="Ej: Ingeniería en Sistemas Informáticos"
              className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface placeholder:text-outline/40 transition-all"
            />
          </div>
          {state?.errors?.name && <p className="text-xs text-error">{state.errors.name[0]}</p>}
        </div>

        {state?.message && (
          <div className="px-4 py-3 bg-error-container text-on-error-container text-sm font-medium rounded-lg">
            {state.message}
          </div>
        )}

        <div className="flex justify-end items-center gap-4 pt-2">
          <Link href="/dashboard/careers" className="text-sm font-bold text-secondary hover:text-on-surface transition-colors">
            Cancelar
          </Link>
          <button type="submit" disabled={pending}
            className="inline-flex items-center gap-2 bg-primary-container hover:bg-primary text-white font-bold py-3 px-8 rounded-lg transition-all shadow-lg shadow-primary-container/20 active:scale-95 disabled:opacity-60 text-sm">
            {pending ? <><Loader2 size={16} strokeWidth={2} className="animate-spin" />Guardando...</> : <><Save size={16} strokeWidth={1.75} />Crear Carrera</>}
          </button>
        </div>
      </form>
    </div>
  )
}
