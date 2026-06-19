import { ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { PROJECT_NAME } from '@/app/lib/config'
import RequestForm from './request-form'

export const metadata = { title: `${PROJECT_NAME} — Solicitar Cuenta` }

export default function RequestAccountPage() {
  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-screen flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-lg space-y-8">
        <div className="flex items-center gap-3">
          <div className="bg-primary-container p-2.5 rounded-xl">
            <ShieldCheck size={24} strokeWidth={1.75} className="text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tighter text-on-surface">{PROJECT_NAME}</h1>
        </div>

        <div className="space-y-1">
          <h2 className="text-3xl font-extrabold tracking-tight text-on-surface">Solicitar acceso</h2>
          <p className="text-secondary font-medium">
            Complete el formulario y el administrador revisará su solicitud.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-surface-container p-8 shadow-sm">
          <RequestForm />
        </div>

        <p className="text-center text-sm text-secondary">
          ¿Ya tiene una cuenta?{' '}
          <Link href="/login" className="text-primary-container font-bold hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
