'use client'

import { useActionState } from 'react'
import { requestPasswordReset } from '@/app/actions/auth'
import { AtSign, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react'

export default function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined)

  if (state?.success) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <CheckCircle2 size={40} strokeWidth={1.5} className="text-primary-container" />
        <p className="text-sm text-on-surface leading-relaxed">{state.message}</p>
        <a
          href="/login"
          className="mt-2 text-xs font-bold text-primary-container hover:underline uppercase tracking-widest"
        >
          Volver al inicio de sesión
        </a>
      </div>
    )
  }

  return (
    <form action={action} className="space-y-6">
      <div className="space-y-1.5">
        <label
          className="text-xs font-bold uppercase tracking-widest text-secondary px-1"
          htmlFor="email"
        >
          Correo Electrónico
        </label>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <AtSign
              size={18}
              strokeWidth={1.75}
              className="text-outline group-focus-within:text-primary-container transition-colors"
            />
          </div>
          <input
            className="block w-full pl-12 pr-4 py-4 bg-surface-container-low border border-outline-variant/20 rounded-lg text-on-surface placeholder:text-outline/50 focus:outline-none focus:border-primary-container transition-all text-sm"
            id="email"
            name="email"
            type="email"
            placeholder="nombre@institucion.edu"
            required
            autoComplete="email"
          />
        </div>
        {state?.errors?.email && (
          <p className="text-xs text-error px-1">{state.errors.email[0]}</p>
        )}
      </div>

      {state?.message && !state.success && (
        <div className="px-4 py-3 bg-error-container text-on-error-container text-sm font-medium rounded-lg">
          {state.message}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-primary-container hover:bg-primary text-white font-bold py-4 px-6 rounded-lg shadow-xl shadow-primary-container/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {pending ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            <span>Enviando...</span>
          </>
        ) : (
          <>
            <span>Enviar enlace</span>
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </>
        )}
      </button>

      <p className="text-center text-xs text-secondary">
        <a href="/login" className="font-bold text-primary-container hover:underline">
          Volver al inicio de sesión
        </a>
      </p>
    </form>
  )
}
