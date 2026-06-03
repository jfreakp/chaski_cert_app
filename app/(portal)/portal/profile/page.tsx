import Link from 'next/link'
import { requireStudentSession } from '@/app/lib/student-session'
import { getMyProfile } from '@/app/actions/student-portal'
import { PROJECT_NAME } from '@/app/lib/config'
import { User, Hash, AtSign, ArrowLeft } from 'lucide-react'

export const metadata = { title: `${PROJECT_NAME} — Mi Perfil` }

export default async function ProfilePage() {
  await requireStudentSession()
  const student = await getMyProfile()

  if (!student) return null

  return (
    <div className="max-w-lg">
      <div className="mb-8">
        <Link
          href="/portal"
          className="inline-flex items-center gap-1.5 text-xs text-secondary hover:text-on-surface transition-colors mb-4"
        >
          <ArrowLeft size={12} strokeWidth={2} />
          Mis certificados
        </Link>
        <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">Mi Perfil</h1>
        <p className="text-sm text-secondary mt-1">
          Tus datos están gestionados por tu institución.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-surface-container p-8 space-y-6">
        <Row icon={<User size={16} strokeWidth={1.75} className="text-secondary" />} label="Nombre" value={student.name} />
        <Row icon={<Hash size={16} strokeWidth={1.75} className="text-secondary" />} label="Cédula / DNI" value={student.dni} />
        <Row icon={<AtSign size={16} strokeWidth={1.75} className="text-secondary" />} label="Correo" value={student.email} />
      </div>
    </div>
  )
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-secondary">{label}</p>
        <p className="font-semibold text-on-surface mt-0.5">{value}</p>
      </div>
    </div>
  )
}
