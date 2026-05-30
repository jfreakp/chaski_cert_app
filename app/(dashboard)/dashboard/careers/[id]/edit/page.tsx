import { verifySession } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import { PROJECT_NAME } from '@/app/lib/config'
import EditCareerForm from './edit-career-form'

export const metadata = { title: `${PROJECT_NAME} — Editar Carrera` }

export default async function EditCareerPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession()
  if (session.role !== 'UNIVERSITY') redirect('/dashboard')

  const { id } = await params
  const career = await prisma.career.findUnique({ where: { id } })
  if (!career) notFound()

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <span className="text-[10px] font-bold text-tertiary uppercase tracking-[0.3em] mb-2 block">
          Carreras
        </span>
        <h1 className="text-4xl font-extrabold text-on-surface tracking-tighter">Editar Carrera</h1>
        <p className="text-secondary mt-2 text-sm">{career.name}</p>
      </div>
      <EditCareerForm careerId={career.id} defaultName={career.name} />
    </div>
  )
}
