import Link from 'next/link'
import { getStudentSession } from '@/app/lib/student-session'
import { logoutStudent } from '@/app/actions/student-portal'
import { PROJECT_NAME } from '@/app/lib/config'
import { GraduationCap, User, LogOut } from 'lucide-react'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getStudentSession()

  return (
    <div className="min-h-screen bg-surface-container-low">
      <header className="bg-white border-b border-surface-container sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GraduationCap size={20} strokeWidth={1.75} className="text-primary-container" />
            <span className="font-extrabold text-on-surface tracking-tight">{PROJECT_NAME}</span>
            <span className="hidden sm:inline text-xs text-secondary font-medium">· Portal Estudiante</span>
          </div>
          {session && (
            <div className="flex items-center gap-4">
              <Link
                href="/portal/profile"
                className="hidden sm:flex items-center gap-1.5 text-sm text-secondary hover:text-on-surface transition-colors"
              >
                <User size={14} strokeWidth={1.75} />
                {session.name}
              </Link>
              <form action={logoutStudent}>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 text-sm text-secondary hover:text-error transition-colors"
                >
                  <LogOut size={14} strokeWidth={1.75} />
                  <span className="hidden sm:inline">Cerrar sesión</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
