import { requireAdmin } from '@/app/lib/dal'
import { PROJECT_NAME } from '@/app/lib/config'
import InstitutionForm from './institution-form'

export const metadata = { title: `${PROJECT_NAME} — Nueva Institución` }

export default async function NewInstitutionPage() {
  await requireAdmin()

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <span className="text-[10px] font-bold text-tertiary uppercase tracking-[0.3em] mb-2 block">
          Administración · Instituciones
        </span>
        <h1 className="text-4xl font-extrabold text-on-surface tracking-tighter">
          Nueva Institución
        </h1>
        <p className="text-secondary mt-2">
          Registra una nueva universidad o institución en la plataforma.
        </p>
      </div>

      <InstitutionForm />
    </div>
  )
}
