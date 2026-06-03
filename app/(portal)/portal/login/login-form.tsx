'use client'

import { useActionState } from 'react'
import { sendMagicLink } from '@/app/actions/student-portal'
import { AtSign, Send, Loader2, CheckCircle2 } from 'lucide-react'

export default function LoginForm() {
  const [state, action, pending] = useActionState(sendMagicLink, null)

  if (state?.success) {
    return (
      <div className="text-center py-4">
        <CheckCircle2 size={40} strokeWidth={1.5} className="text-emerald-500 mx-auto mb-4" />
        <p className="font-semibold text-on-surface">{state.message}</p>
        <p className="text-sm text-secondary mt-2">Revisá tu bandeja de entrada y spam.</p>
      </div>
    )
  }

  return (
    <form action={action} className="space-y-5">
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">
          Correo electrónico
        </label>
        <div className="relative">
          <AtSign size={16} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
          <input
            name="email"
            type="email"
            required
            placeholder="tu@email.com"
            className="w-full pl-11 pr-4 py-3 bg-surface-container-low border border-transparent rounded-lg focus:ring-2 focus:ring-primary-container outline-none font-medium text-on-surface placeholder:text-outline/40 transition-all"
          />
        </div>
      </div>

      {state?.message && !state.success && (
        <p className="text-sm text-error">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full inline-flex items-center justify-center gap-2 bg-primary-container hover:bg-primary text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg shadow-primary-container/20 active:scale-95 disabled:opacity-60 text-sm"
      >
        {pending
          ? <><Loader2 size={16} strokeWidth={2} className="animate-spin" />Enviando...</>
          : <><Send size={16} strokeWidth={1.75} />Enviar link de acceso</>}
      </button>
    </form>
  )
}
