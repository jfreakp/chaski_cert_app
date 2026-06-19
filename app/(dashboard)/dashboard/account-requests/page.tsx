import { requireAdmin } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { Inbox } from 'lucide-react'
import RequestsTable from './requests-table'

export const metadata = { title: 'Solicitudes de Cuenta' }

export default async function AccountRequestsPage() {
  await requireAdmin()

  await prisma.accountRequest.updateMany({
    where: { isRead: false },
    data: { isRead: true },
  })

  const requests = await prisma.accountRequest.findMany({
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="p-6 md:p-10 space-y-6">
      <div className="flex items-center gap-3">
        <Inbox size={28} strokeWidth={1.5} className="text-primary-container" />
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-on-surface">Solicitudes de Cuenta</h1>
          <p className="text-sm text-secondary">{requests.length} solicitud{requests.length !== 1 ? 'es' : ''} en total</p>
        </div>
      </div>

      <RequestsTable requests={requests} />
    </div>
  )
}
