import { verifySession } from '@/app/lib/dal'
import { Building2 } from 'lucide-react'
import { PROJECT_NAME } from '@/app/lib/config'

export const metadata = { title: `${PROJECT_NAME} — Sin Institución` }

export default async function NoInstitutionPage() {
  await verifySession()

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-6">
          <Building2 size={32} strokeWidth={1.5} className="text-amber-500" />
        </div>
        <h1 className="text-2xl font-extrabold text-on-surface tracking-tighter mb-3">
          Sin institución asignada
        </h1>
        <p className="text-secondary text-sm leading-relaxed">
          Tu cuenta de usuario no tiene una institución asociada. Contacta al administrador para que te asigne una antes de continuar.
        </p>
      </div>
    </div>
  )
}
