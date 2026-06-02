import { requireAdmin } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { notFound } from 'next/navigation'
import { PROJECT_NAME } from '@/app/lib/config'
import EditCertificateTypeForm from './edit-certificate-type-form'

export const metadata = { title: `${PROJECT_NAME} — Editar Tipo de Certificado` }

export default async function EditCertificateTypePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  const type = await prisma.certificateType.findUnique({ where: { id } })
  if (!type) notFound()

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <span className="text-[10px] font-bold text-tertiary uppercase tracking-[0.3em] mb-2 block">Administración · Tipos de Certificado</span>
        <h1 className="text-4xl font-extrabold text-on-surface tracking-tighter">Editar Tipo</h1>
        <p className="text-secondary mt-2 text-sm">{type.name}</p>
      </div>
      <EditCertificateTypeForm id={type.id} defaultName={type.name} defaultDescription={type.description} />
    </div>
  )
}
