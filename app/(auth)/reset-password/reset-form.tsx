'use client'

import { useActionState } from 'react'
import { confirmPasswordReset } from '@/app/actions/users'
import { Lock, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react'
import { useState } from 'react'

export default function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(confirmPasswordReset, undefined)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="token" value={token} />

      {/* Nueva contraseña */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">
          Nueva Contraseña
        </label>
        <div className="relative group">
          <Lock
            size={16}
            strokeWidth={1.75}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary"
          />
          <input
            name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Mínimo 8 caracteres"
            required
            minLength={8}
            className="w-full pl-11 pr-11 py-3.5 bg-surface-container-low border border-outline-variant/20 rounded-lg focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 outline-none font-medium text-on-surface placeholder:text-outline/40 transition-all text-sm"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary hover:text-on-surface transition-colors"
          >
            {showPassword ? <EyeOff size={16} strokeWidth={1.75} /> : <Eye size={16} strokeWidth={1.75} />}
          </button>
        </div>
        {state?.errors?.password && (
          <p className="text-xs text-error">{state.errors.password[0]}</p>
        )}
      </div>

      {/* Confirmar contraseña */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-extrabold uppercase tracking-widest text-secondary">
          Confirmar Contraseña
        </label>
        <div className="relative group">
          <Lock
            size={16}
            strokeWidth={1.75}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary"
          />
          <input
            name="confirmPassword"
            type={showConfirm ? 'text' : 'password'}
            placeholder="Repite la contraseña"
            required
            className="w-full pl-11 pr-11 py-3.5 bg-surface-container-low border border-outline-variant/20 rounded-lg focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 outline-none font-medium text-on-surface placeholder:text-outline/40 transition-all text-sm"
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary hover:text-on-surface transition-colors"
          >
            {showConfirm ? <EyeOff size={16} strokeWidth={1.75} /> : <Eye size={16} strokeWidth={1.75} />}
          </button>
        </div>
        {state?.errors?.confirmPassword && (
          <p className="text-xs text-error">{state.errors.confirmPassword[0]}</p>
        )}
      </div>

      {/* Error global */}
      {state?.message && (
        <div className="px-4 py-3 bg-error-container text-on-error-container text-sm font-medium rounded-lg">
          {state.message}
        </div>
      )}

      {/* Requisitos */}
      <p className="text-xs text-secondary leading-relaxed">
        La contraseña debe tener al menos 8 caracteres.
      </p>

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-primary-container hover:bg-primary text-white font-bold py-4 px-6 rounded-lg shadow-lg shadow-primary-container/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {pending ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            <span>Guardando...</span>
          </>
        ) : (
          <>
            <span>Establecer Contraseña</span>
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </>
        )}
      </button>
    </form>
  )
}
