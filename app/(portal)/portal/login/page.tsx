import { redirect } from 'next/navigation'
import { getStudentSession } from '@/app/lib/student-session'
import { PROJECT_NAME } from '@/app/lib/config'
import LoginForm from './login-form'

export const metadata = { title: `${PROJECT_NAME} — Portal Estudiante` }

export default async function PortalLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string }>
}) {
  const session = await getStudentSession()
  if (session) redirect('/portal')

  const { expired } = await searchParams

  return (
    <div className="min-h-[calc(100vh-73px)] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-surface-container p-10 w-full max-w-md">
        <div className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-2">
            Portal Estudiante
          </p>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">
            Acceder a mis certificados
          </h1>
          <p className="text-sm text-secondary mt-2">
            Ingresá tu email y te enviaremos un link de acceso instantáneo.
          </p>
        </div>
        {expired && (
          <div className="mb-5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 font-medium">
            Tu link expiró o ya fue utilizado. Ingresá tu email para recibir uno nuevo.
          </div>
        )}
        <LoginForm />
      </div>
    </div>
  )
}
