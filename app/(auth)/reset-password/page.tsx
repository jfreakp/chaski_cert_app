import { redirect } from 'next/navigation'
import ResetPasswordForm from './reset-form'
import { PROJECT_NAME } from '@/app/lib/config'

export const metadata = { title: `${PROJECT_NAME} — Nueva Contraseña` }

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  if (!token) redirect('/login')

  return (
    <div className="min-h-screen bg-surface-container-lowest flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-lg font-black tracking-tighter text-on-surface uppercase mb-1">
            {PROJECT_NAME}
          </p>
          <h1 className="text-3xl font-extrabold tracking-tighter text-on-surface mb-2">
            Crea tu contraseña
          </h1>
          <p className="text-secondary text-sm">
            Establece una contraseña segura para tu cuenta.
          </p>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-xl shadow-sm border border-surface-container p-8">
          <ResetPasswordForm token={token} />
        </div>
      </div>
    </div>
  )
}
