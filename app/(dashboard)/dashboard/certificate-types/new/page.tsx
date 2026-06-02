import { requireAdmin } from '@/app/lib/dal'
import { PROJECT_NAME } from '@/app/lib/config'
import CertificateTypeForm from './certificate-type-form'

export const metadata = { title: `${PROJECT_NAME} — Nuevo Tipo de Certificado` }

export default async function NewCertificateTypePage() {
  await requireAdmin()
  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <span className="text-[10px] font-bold text-tertiary uppercase tracking-[0.3em] mb-2 block">Administración · Tipos de Certificado</span>
        <h1 className="text-4xl font-extrabold text-on-surface tracking-tighter">Nuevo Tipo</h1>
      </div>
      <CertificateTypeForm />
    </div>
  )
}
