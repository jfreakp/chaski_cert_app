import { requireAdmin } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { notFound } from 'next/navigation'
import { PROJECT_NAME } from '@/app/lib/config'
import EditInstitutionForm from './edit-institution-form'

export const metadata = { title: `${PROJECT_NAME} — Editar Institución` }

export default async function EditInstitutionPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()

  const { id } = await params
  const institution = await prisma.institution.findUnique({ where: { id } })
  if (!institution) notFound()

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <span className="text-[10px] font-bold text-tertiary uppercase tracking-[0.3em] mb-2 block">
          Administración · Instituciones
        </span>
        <h1 className="text-4xl font-extrabold text-on-surface tracking-tighter">
          Editar Institución
        </h1>
        <p className="text-secondary mt-2">{institution.name}</p>
      </div>

      <EditInstitutionForm
        institutionId={institution.id}
        defaultName={institution.name}
        defaultCode={institution.code}
        defaultCountry={institution.country}
      />
    </div>
  )
}
