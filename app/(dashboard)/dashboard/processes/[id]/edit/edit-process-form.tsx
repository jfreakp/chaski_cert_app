'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useActionState } from 'react'
import { updateProcess } from '@/app/actions/processes'
import { CalendarDays, BadgeCheck, BookOpen, FileText, Loader2, Save } from 'lucide-react'

type CertType = { id: string; name: string; requiresCareer: boolean }
type Career = { id: string; name: string }
type Props = {
  processId: string
  defaultName: string
  defaultDescription: string | null
  defaultDate: string
  defaultCertificateTypeId: string
  defaultCareerId: string | null
  certTypes: CertType[]
  careers: Career[]
}

export default function EditProcessForm({ processId, defaultName, defaultDescription, defaultDate, defaultCertificateTypeId, defaultCareerId, certTypes, careers }: Props) {
  const updateWithId = updateProcess.bind(null, processId)
  const [state, action, pending] = useActionState(updateWithId, undefined)
  const [selectedTypeId, setSelectedTypeId] = useState(defaultCertificateTypeId)

  const requiresCareer = certTypes.find(c => c.id === selectedTypeId)?.requiresCareer ?? false

  return (
    <div className="bg-white rounded-xl shadow-sm p-8 border border-surface-container">
      <form action={action} className="space-y-6">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">Nombre del Proceso *</label>
          <div className="relative">
            <FileText size={16} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
            <input name="name" type="text" required defaultValue={defaultName}
              className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface transition-all" />
          </div>
          {state?.errors?.name && <p className="text-xs text-error">{state.errors.name[0]}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">Tipo de Certificado *</label>
          <div className="relative">
            <BadgeCheck size={16} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
            <select
              name="certificateTypeId"
              required
              value={selectedTypeId}
              onChange={e => setSelectedTypeId(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface transition-all appearance-none cursor-pointer"
            >
              {certTypes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {state?.errors?.certificateTypeId && <p className="text-xs text-error">{state.errors.certificateTypeId[0]}</p>}
        </div>

        {requiresCareer && (
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">Carrera *</label>
            <div className="relative">
              <BookOpen size={16} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
              <select name="careerId" defaultValue={defaultCareerId ?? ''}
                className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface transition-all appearance-none cursor-pointer">
                <option value="">Selecciona una carrera...</option>
                {careers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">Fecha *</label>
          <div className="relative">
            <CalendarDays size={16} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
            <input name="date" type="date" required defaultValue={defaultDate}
              className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface transition-all" />
          </div>
          {state?.errors?.date && <p className="text-xs text-error">{state.errors.date[0]}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">Descripción</label>
          <textarea name="description" rows={3} defaultValue={defaultDescription ?? ''}
            className="w-full px-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface transition-all resize-none" />
        </div>

        {state?.message && !state.success && <div className="px-4 py-3 bg-error-container text-on-error-container text-sm font-medium rounded-lg">{state.message}</div>}

        <div className="flex justify-end items-center gap-4 pt-2">
          <Link href={`/dashboard/processes/${processId}`} className="text-sm font-bold text-secondary hover:text-on-surface transition-colors">Cancelar</Link>
          <button type="submit" disabled={pending}
            className="inline-flex items-center gap-2 bg-primary-container hover:bg-primary text-white font-bold py-3 px-8 rounded-lg transition-all shadow-lg shadow-primary-container/20 active:scale-95 disabled:opacity-60 text-sm">
            {pending ? <><Loader2 size={16} strokeWidth={2} className="animate-spin" />Guardando...</> : <><Save size={16} strokeWidth={1.75} />Guardar Cambios</>}
          </button>
        </div>
      </form>
    </div>
  )
}
