import { requireInstitution } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import { PROJECT_NAME } from '@/app/lib/config'
import EditProcessForm from './edit-process-form'
import TemplateEditor from './template-editor'

export const metadata = { title: `${PROJECT_NAME} — Editar Proceso` }

export default async function EditProcessPage({ params }: { params: Promise<{ id: string }> }) {
  const { session, institutionId } = await requireInstitution()
  if (session.role !== 'UNIVERSITY') redirect('/dashboard/processes')

  const { id } = await params

  const [proc, certTypes, careers] = await Promise.all([
    prisma.certificateProcess.findUnique({
      where: { id },
      select: {
        id:                true,
        name:              true,
        description:       true,
        date:              true,
        certificateTypeId: true,
        careerId:          true,
        institutionId:     true,
        templateKey:       true,
        pdfWidth:          true,
        pdfHeight:         true,
        nameX:             true,
        nameY:             true,
        nameFontSize:      true,
        nameFontFamily:    true,
        nameColor:         true,
      },
    }),
    prisma.certificateType.findMany({
      where:   { isActive: true },
      select:  { id: true, name: true, requiresCareer: true },
      orderBy: { name: 'asc' },
    }),
    prisma.career.findMany({
      where:   { institutionId: institutionId!, isActive: true },
      select:  { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  if (!proc) notFound()

  const template =
    proc.templateKey && proc.pdfWidth && proc.pdfHeight
      ? {
          pdfWidth:       proc.pdfWidth,
          pdfHeight:      proc.pdfHeight,
          nameX:          proc.nameX          ?? proc.pdfWidth / 2,
          nameY:          proc.nameY          ?? proc.pdfHeight / 3,
          nameFontSize:   proc.nameFontSize   ?? 28,
          nameFontFamily: proc.nameFontFamily ?? 'Helvetica-Bold',
          nameColor:      proc.nameColor      ?? '#0d0d1e',
        }
      : null

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <span className="text-[10px] font-bold text-tertiary uppercase tracking-[0.3em] mb-2 block">Procesos</span>
        <h1 className="text-4xl font-extrabold text-on-surface tracking-tighter">Editar Proceso</h1>
        <p className="text-secondary mt-2 text-sm">{proc.name}</p>
      </div>

      <div className="max-w-2xl">
        <EditProcessForm
          processId={proc.id}
          defaultName={proc.name}
          defaultDescription={proc.description}
          defaultDate={proc.date.toISOString().split('T')[0]}
          defaultCertificateTypeId={proc.certificateTypeId}
          defaultCareerId={proc.careerId}
          certTypes={certTypes}
          careers={careers}
        />
      </div>

      <div className="mt-10 pt-8 border-t border-surface-container">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-secondary block mb-6">
          Plantilla PDF del Certificado
        </span>
        <TemplateEditor processId={proc.id} template={template} />
      </div>
    </div>
  )
}
