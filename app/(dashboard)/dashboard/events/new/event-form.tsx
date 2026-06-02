'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { createEvent } from '@/app/actions/events'
import { CalendarDays, MapPin, BadgeCheck, FileText, Loader2, Save } from 'lucide-react'

type CertType = { id: string; name: string }

export default function EventForm({ certTypes }: { certTypes: CertType[] }) {
  const [state, action, pending] = useActionState(createEvent, undefined)

  return (
    <div className="bg-white rounded-xl shadow-sm p-8 border border-surface-container">
      <form action={action} className="space-y-6">
        {/* Nombre */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">Nombre del Evento *</label>
          <div className="relative">
            <FileText size={16} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
            <input name="name" type="text" required placeholder="Ej: IX Congreso Internacional de Ingeniería"
              className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface placeholder:text-outline/40 transition-all" />
          </div>
          {state?.errors?.name && <p className="text-xs text-error">{state.errors.name[0]}</p>}
        </div>

        {/* Tipo de certificado */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">Tipo de Certificado *</label>
          <div className="relative">
            <BadgeCheck size={16} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
            {certTypes.length > 0 ? (
              <select name="certificateTypeId" required
                className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface transition-all appearance-none cursor-pointer">
                <option value="">Selecciona un tipo...</option>
                {certTypes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            ) : (
              <div className="w-full pl-11 pr-4 py-3 bg-surface-container-low rounded-lg text-sm text-outline">
                No hay tipos activos — el administrador debe crear uno primero.
              </div>
            )}
          </div>
          {state?.errors?.certificateTypeId && <p className="text-xs text-error">{state.errors.certificateTypeId[0]}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Fecha */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">Fecha *</label>
            <div className="relative">
              <CalendarDays size={16} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
              <input name="date" type="date" required
                className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface transition-all" />
            </div>
            {state?.errors?.date && <p className="text-xs text-error">{state.errors.date[0]}</p>}
          </div>

          {/* Lugar */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">Lugar</label>
            <div className="relative">
              <MapPin size={16} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
              <input name="location" type="text" placeholder="Ej: Loja, Ecuador"
                className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface placeholder:text-outline/40 transition-all" />
            </div>
          </div>
        </div>

        {/* Descripción */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">Descripción</label>
          <textarea name="description" rows={3} placeholder="Descripción opcional del evento"
            className="w-full px-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface placeholder:text-outline/40 transition-all resize-none" />
        </div>

        {state?.message && <div className="px-4 py-3 bg-error-container text-on-error-container text-sm font-medium rounded-lg">{state.message}</div>}

        <div className="flex justify-end items-center gap-4 pt-2">
          <Link href="/dashboard/events" className="text-sm font-bold text-secondary hover:text-on-surface transition-colors">Cancelar</Link>
          <button type="submit" disabled={pending || certTypes.length === 0}
            className="inline-flex items-center gap-2 bg-primary-container hover:bg-primary text-white font-bold py-3 px-8 rounded-lg transition-all shadow-lg shadow-primary-container/20 active:scale-95 disabled:opacity-60 text-sm">
            {pending ? <><Loader2 size={16} strokeWidth={2} className="animate-spin" />Guardando...</> : <><Save size={16} strokeWidth={1.75} />Crear Evento</>}
          </button>
        </div>
      </form>
    </div>
  )
}
