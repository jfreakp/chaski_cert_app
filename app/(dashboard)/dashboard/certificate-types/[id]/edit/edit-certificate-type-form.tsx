'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { updateCertificateType } from '@/app/actions/certificate-types'
import { BadgeCheck, FileText, GraduationCap, Loader2, Save, CheckCircle2 } from 'lucide-react'

type Props = {
  id: string
  defaultName: string
  defaultDescription: string | null
  defaultRequiresCareer: boolean
}

export default function EditCertificateTypeForm({ id, defaultName, defaultDescription, defaultRequiresCareer }: Props) {
  const updateWithId = updateCertificateType.bind(null, id)
  const [state, action, pending] = useActionState(updateWithId, undefined)

  return (
    <div className="bg-white rounded-xl shadow-sm p-8 border border-surface-container">
      <form action={action} className="space-y-6">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">Nombre *</label>
          <div className="relative">
            <BadgeCheck size={16} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
            <input name="name" type="text" required defaultValue={defaultName}
              className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface transition-all" />
          </div>
          {state?.errors?.name && <p className="text-xs text-error">{state.errors.name[0]}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">Descripción</label>
          <div className="relative">
            <FileText size={16} strokeWidth={1.75} className="absolute left-4 top-3.5 text-secondary" />
            <textarea name="description" rows={3} defaultValue={defaultDescription ?? ''}
              className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface transition-all resize-none" />
          </div>
        </div>

        <label className="flex items-center justify-between p-4 bg-surface-container-low rounded-lg cursor-pointer group">
          <div className="flex items-center gap-3">
            <GraduationCap size={18} strokeWidth={1.75} className="text-secondary group-has-[:checked]:text-primary-container transition-colors" />
            <div>
              <p className="text-sm font-semibold text-on-surface">Requiere carrera específica</p>
              <p className="text-xs text-secondary mt-0.5">Los procesos de este tipo deben tener una carrera asignada.</p>
            </div>
          </div>
          <div className="relative">
            <input type="checkbox" name="requiresCareer" value="true" defaultChecked={defaultRequiresCareer} className="sr-only peer" />
            <div className="w-11 h-6 bg-outline/30 rounded-full peer peer-checked:bg-primary-container after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
          </div>
        </label>

        {state?.message && !state.success && <div className="px-4 py-3 bg-error-container text-on-error-container text-sm font-medium rounded-lg">{state.message}</div>}
        {state?.success && <div className="px-4 py-3 bg-emerald-50 text-emerald-700 text-sm font-medium rounded-lg flex items-center gap-2"><CheckCircle2 size={16} strokeWidth={2} />Tipo actualizado correctamente.</div>}

        <div className="flex justify-end items-center gap-4 pt-2">
          <Link href="/dashboard/certificate-types" className="text-sm font-bold text-secondary hover:text-on-surface transition-colors">Cancelar</Link>
          <button type="submit" disabled={pending}
            className="inline-flex items-center gap-2 bg-primary-container hover:bg-primary text-white font-bold py-3 px-8 rounded-lg transition-all shadow-lg shadow-primary-container/20 active:scale-95 disabled:opacity-60 text-sm">
            {pending ? <><Loader2 size={16} strokeWidth={2} className="animate-spin" />Guardando...</> : <><Save size={16} strokeWidth={1.75} />Guardar Cambios</>}
          </button>
        </div>
      </form>
    </div>
  )
}
