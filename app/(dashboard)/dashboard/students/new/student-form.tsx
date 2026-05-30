'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { createStudent } from '@/app/actions/students'
import { User, Hash, AtSign, BookOpen, Loader2, Save } from 'lucide-react'

type Career = { id: string; name: string }

export default function StudentForm({ careers }: { careers: Career[] }) {
  const [state, action, pending] = useActionState(createStudent, undefined)

  return (
    <div className="bg-white rounded-xl shadow-sm p-8 border border-surface-container">
      <form action={action} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nombre */}
          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">Nombre Completo *</label>
            <div className="relative">
              <User size={16} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
              <input name="name" type="text" required placeholder="Ej: Juan Carlos Pérez López"
                className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface placeholder:text-outline/40 transition-all" />
            </div>
            {state?.errors?.name && <p className="text-xs text-error">{state.errors.name[0]}</p>}
          </div>

          {/* Cédula */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">Cédula *</label>
            <div className="relative">
              <Hash size={16} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
              <input name="dni" type="text" required placeholder="Ej: 1234567890"
                className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface placeholder:text-outline/40 transition-all font-mono" />
            </div>
            {state?.errors?.dni && <p className="text-xs text-error">{state.errors.dni[0]}</p>}
          </div>

          {/* Email */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">Correo</label>
            <div className="relative">
              <AtSign size={16} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
              <input name="email" type="email" placeholder="Ej: juan@universidad.edu.ec"
                className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface placeholder:text-outline/40 transition-all" />
            </div>
            {state?.errors?.email && <p className="text-xs text-error">{state.errors.email[0]}</p>}
          </div>

          {/* Carrera */}
          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">Carrera</label>
            <div className="relative">
              <BookOpen size={16} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
              {careers.length > 0 ? (
                <select name="careerId"
                  className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface transition-all appearance-none cursor-pointer">
                  <option value="">Sin carrera asignada</option>
                  {careers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              ) : (
                <div className="w-full pl-11 pr-4 py-3 bg-surface-container-low rounded-lg text-sm text-outline">
                  No hay carreras —{' '}
                  <a href="/dashboard/careers/new" className="text-primary-container font-bold hover:underline">crear una primero</a>
                </div>
              )}
            </div>
          </div>
        </div>

        {state?.message && (
          <div className="px-4 py-3 bg-error-container text-on-error-container text-sm font-medium rounded-lg">{state.message}</div>
        )}

        <div className="flex justify-end items-center gap-4 pt-2">
          <Link href="/dashboard/students" className="text-sm font-bold text-secondary hover:text-on-surface transition-colors">Cancelar</Link>
          <button type="submit" disabled={pending}
            className="inline-flex items-center gap-2 bg-primary-container hover:bg-primary text-white font-bold py-3 px-8 rounded-lg transition-all shadow-lg shadow-primary-container/20 active:scale-95 disabled:opacity-60 text-sm">
            {pending ? <><Loader2 size={16} strokeWidth={2} className="animate-spin" />Guardando...</> : <><Save size={16} strokeWidth={1.75} />Registrar Estudiante</>}
          </button>
        </div>
      </form>
    </div>
  )
}
