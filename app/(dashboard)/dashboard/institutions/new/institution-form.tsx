'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { createInstitution } from '@/app/actions/institutions'
import { Building2, Hash, Globe, Loader2, Save } from 'lucide-react'

export default function InstitutionForm() {
  const [state, action, pending] = useActionState(createInstitution, undefined)

  return (
    <div className="bg-white rounded-xl shadow-sm p-8 border border-surface-container">
      <form action={action} className="space-y-6">
        {/* Nombre */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">
            Nombre *
          </label>
          <div className="relative">
            <Building2 size={16} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
            <input
              name="name"
              type="text"
              placeholder="Ej: Universidad Nacional de Ingeniería"
              required
              className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface placeholder:text-outline/40 transition-all"
            />
          </div>
          {state?.errors?.name && <p className="text-xs text-error">{state.errors.name[0]}</p>}
        </div>

        {/* Código */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">
            Código *
          </label>
          <div className="relative">
            <Hash size={16} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
            <input
              name="code"
              type="text"
              placeholder="Ej: UNI"
              required
              className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface placeholder:text-outline/40 transition-all uppercase"
            />
          </div>
          {state?.errors?.code && <p className="text-xs text-error">{state.errors.code[0]}</p>}
        </div>

        {/* País */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">
            País
          </label>
          <div className="relative">
            <Globe size={16} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
            <input
              name="country"
              type="text"
              placeholder="Ej: Perú"
              className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface placeholder:text-outline/40 transition-all"
            />
          </div>
          {state?.errors?.country && <p className="text-xs text-error">{state.errors.country[0]}</p>}
        </div>

        {state?.message && (
          <div className="px-4 py-3 bg-error-container text-on-error-container text-sm font-medium rounded-lg">
            {state.message}
          </div>
        )}

        <div className="flex justify-end items-center gap-4 pt-2">
          <Link href="/dashboard/institutions" className="text-sm font-bold text-secondary hover:text-on-surface transition-colors">
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 bg-primary-container hover:bg-primary text-white font-bold py-3 px-8 rounded-lg transition-all shadow-lg shadow-primary-container/20 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed text-sm"
          >
            {pending ? <><Loader2 size={16} strokeWidth={2} className="animate-spin" />Guardando...</> : <><Save size={16} strokeWidth={1.75} />Crear Institución</>}
          </button>
        </div>
      </form>
    </div>
  )
}
