import { verifySession } from '@/app/lib/dal'
import { redirect } from 'next/navigation'
import { PROJECT_NAME } from '@/app/lib/config'
import CareerForm from './career-form'

export const metadata = { title: `${PROJECT_NAME} — Nueva Carrera` }

export default async function NewCareerPage() {
  const session = await verifySession()
  if (session.role !== 'UNIVERSITY') redirect('/dashboard')

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <span className="text-[10px] font-bold text-tertiary uppercase tracking-[0.3em] mb-2 block">
          Carreras
        </span>
        <h1 className="text-4xl font-extrabold text-on-surface tracking-tighter">Nueva Carrera</h1>
        <p className="text-secondary mt-2 text-sm">Agrega una carrera a tu institución.</p>
      </div>
      <CareerForm />
    </div>
  )
}
