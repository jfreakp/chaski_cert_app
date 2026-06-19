'use client'

import { useActionState } from 'react'
import { ArrowRight, Loader2, User, AtSign, Phone, Building2, MessageSquare, CheckCircle2 } from 'lucide-react'
import { createAccountRequest } from '@/app/actions/account-requests'
import type { AccountRequestFormState } from '@/app/lib/definitions'

function Field({
  id, label, name, type = 'text', placeholder, error, icon: Icon,
}: {
  id: string; label: string; name: string; type?: string
  placeholder: string; error?: string[]; icon: React.ElementType
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold uppercase tracking-widest text-secondary px-1" htmlFor={id}>
        {label}
      </label>
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Icon size={18} strokeWidth={1.75} className="text-outline group-focus-within:text-primary-container transition-colors" />
        </div>
        <input
          id={id} name={name} type={type} placeholder={placeholder} required
          className="block w-full pl-12 pr-4 py-4 bg-surface-container-low border border-outline-variant/20 rounded-lg text-on-surface placeholder:text-outline/50 focus:outline-none focus:border-primary-container transition-all text-sm"
        />
      </div>
      {error && <p className="text-xs text-error px-1">{error[0]}</p>}
    </div>
  )
}

export default function RequestForm() {
  const [state, action, pending] = useActionState<AccountRequestFormState, FormData>(
    createAccountRequest,
    undefined,
  )

  if (state?.success) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="p-4 rounded-full bg-emerald-50">
          <CheckCircle2 size={40} strokeWidth={1.5} className="text-emerald-600" />
        </div>
        <h3 className="text-xl font-extrabold text-on-surface">¡Solicitud enviada!</h3>
        <p className="text-sm text-secondary max-w-xs">
          Hemos recibido su solicitud. El administrador la revisará y se pondrá en contacto con usted a la brevedad.
        </p>
        <a href="/login" className="mt-2 text-sm font-bold text-primary-container hover:underline">
          Volver al inicio de sesión
        </a>
      </div>
    )
  }

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-4">
        <Field id="name" label="Nombre completo" name="name" placeholder="Juan Pérez" error={state?.errors?.name} icon={User} />
        <Field id="email" label="Correo electrónico" name="email" type="email" placeholder="juan@institucion.edu" error={state?.errors?.email} icon={AtSign} />
        <Field id="phone" label="Celular" name="phone" type="tel" placeholder="+51 999 999 999" error={state?.errors?.phone} icon={Phone} />
        <Field id="institution" label="Institución" name="institution" placeholder="Universidad Nacional de ..." error={state?.errors?.institution} icon={Building2} />

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-widest text-secondary px-1" htmlFor="message">
            Mensaje / Justificación
          </label>
          <div className="relative group">
            <div className="absolute top-4 left-4 pointer-events-none">
              <MessageSquare size={18} strokeWidth={1.75} className="text-outline group-focus-within:text-primary-container transition-colors" />
            </div>
            <textarea
              id="message" name="message" required rows={4} placeholder="Describa brevemente por qué necesita acceso al sistema..."
              className="block w-full pl-12 pr-4 py-4 bg-surface-container-low border border-outline-variant/20 rounded-lg text-on-surface placeholder:text-outline/50 focus:outline-none focus:border-primary-container transition-all text-sm resize-none"
            />
          </div>
          {state?.errors?.message && <p className="text-xs text-error px-1">{state.errors.message[0]}</p>}
        </div>
      </div>

      <button
        type="submit" disabled={pending}
        className="w-full bg-primary-container hover:bg-primary text-white font-bold py-4 px-6 rounded-lg shadow-xl shadow-primary-container/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {pending ? (
          <><Loader2 size={20} className="animate-spin" /><span>Enviando...</span></>
        ) : (
          <><span>Enviar solicitud</span><ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" /></>
        )}
      </button>
    </form>
  )
}
