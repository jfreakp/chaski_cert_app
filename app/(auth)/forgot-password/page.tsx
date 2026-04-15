import ForgotPasswordForm from './forgot-form'
import { PROJECT_NAME } from '@/app/lib/config'

export const metadata = { title: `${PROJECT_NAME} — Recuperar Contraseña` }

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-surface-container-lowest flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-lg font-black tracking-tighter text-on-surface uppercase mb-1">
            {PROJECT_NAME}
          </p>
          <h1 className="text-3xl font-extrabold tracking-tighter text-on-surface mb-2">
            ¿Olvidaste tu contraseña?
          </h1>
          <p className="text-secondary text-sm">
            Ingresa tu correo y te enviaremos un enlace para restablecerla.
          </p>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-xl shadow-sm border border-surface-container p-8">
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  )
}
