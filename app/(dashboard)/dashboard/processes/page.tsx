import { verifySession } from '@/app/lib/dal'
import { Role } from '@/app/lib/definitions'
import { redirect } from 'next/navigation'
import { Sparkles, Network, Fuel, Database, TrendingDown, History, CheckCircle2, Loader2, Copy, User } from 'lucide-react'
import { PROJECT_NAME } from '@/app/lib/config'

export const metadata = { title: `${PROJECT_NAME} — Panel de Emisión` }

const transactions = [
  { hash: '0x7a...4e21', recipient: 'Carlos Mendoza', time: 'hace 2 min', status: 'confirmed' as const },
  { hash: '0xb1...88c3', recipient: 'Elena Rodriguez', time: 'hace 5 min', status: 'confirmed' as const },
  { hash: '0x3c...9a12', recipient: 'Mateo Salazar', time: 'hace 8 min', status: 'pending' as const },
  { hash: '0xf4...22e9', recipient: 'Sofía Paredes', time: 'hace 12 min', status: 'confirmed' as const },
]

const statusConfig = {
  confirmed: {
    label: 'Confirmado',
    classes: 'bg-emerald-100 text-emerald-700',
    icon: CheckCircle2,
  },
  pending: {
    label: 'Pendiente',
    classes: 'bg-amber-100 text-amber-700',
    icon: Loader2,
  },
}

export default async function ProcessesPage() {
  const session = await verifySession()

  if (session.role !== Role.ADMIN && session.role !== Role.UNIVERSITY) {
    redirect('/dashboard')
  }

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
        <div>
          <span className="text-[10px] font-bold text-tertiary uppercase tracking-[0.3em] mb-2 block">
            Blockchain Core
          </span>
          <h1 className="text-4xl font-extrabold text-on-surface tracking-tighter">
            Panel de Emisión
          </h1>
          <p className="text-secondary mt-2 text-lg">
            Monitoreo técnico de procesos de acuñación distribuida.
          </p>
        </div>
        <button className="bg-primary-container text-white px-8 py-4 rounded-lg font-bold flex items-center gap-3 hover:bg-primary transition-all active:scale-[0.98] shadow-xl shadow-primary-container/20">
          <Sparkles size={20} strokeWidth={1.75} />
          Generar Certificados
        </button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-surface-container-low p-6 rounded-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Network size={56} strokeWidth={1} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-extrabold text-tertiary uppercase tracking-widest">
                Network Status
              </span>
            </div>
            <div className="text-2xl font-bold text-on-surface mb-1">
              Polygon Mainnet
            </div>
            <div className="text-sm text-secondary font-medium">
              Latencia: 14ms (Optimal)
            </div>
          </div>
        </div>

        <div className="bg-surface-container-low p-6 rounded-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Fuel size={56} strokeWidth={1} />
          </div>
          <div className="relative z-10">
            <span className="text-[10px] font-extrabold text-tertiary uppercase tracking-widest block mb-4">
              Gas Price (Gwei)
            </span>
            <div className="text-2xl font-bold text-on-surface mb-1">
              32.4 Gwei
            </div>
            <div className="text-sm text-primary-container font-bold flex items-center gap-1">
              <TrendingDown size={14} strokeWidth={2} />
              Low Demand
            </div>
          </div>
        </div>

        <div className="bg-surface-container-low p-6 rounded-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Database size={56} strokeWidth={1} />
          </div>
          <div className="relative z-10">
            <span className="text-[10px] font-extrabold text-tertiary uppercase tracking-widest block mb-4">
              Minting Quota
            </span>
            <div className="text-2xl font-bold text-on-surface mb-2">
              4,821 / 5,000
            </div>
            <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
              <div
                className="bg-primary-container h-full"
                style={{ width: '96%' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de transacciones */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-surface-container-low flex items-center justify-between">
          <div className="flex items-center gap-3">
            <History size={20} strokeWidth={1.75} className="text-primary-container" />
            <h2 className="text-xl font-bold tracking-tight">
              Transacciones en Tiempo Real
            </h2>
          </div>
          <span className="text-[10px] font-bold text-tertiary uppercase tracking-widest px-2 py-1 bg-surface-container rounded">
            Auto-refresh On
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/50">
                {['Hash de Transacción', 'Destinatario', 'Marca de Tiempo', 'Estado'].map((h) => (
                  <th
                    key={h}
                    className="px-8 py-4 text-[10px] font-bold text-tertiary uppercase tracking-widest"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low">
              {transactions.map((tx) => {
                const s = statusConfig[tx.status]
                const StatusIcon = s.icon
                return (
                  <tr
                    key={tx.hash}
                    className="hover:bg-surface-container-lowest transition-colors group"
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-medium text-on-surface bg-surface-container px-2 py-1 rounded">
                          {tx.hash}
                        </code>
                        <button className="opacity-0 group-hover:opacity-100 text-tertiary hover:text-primary transition-opacity">
                          <Copy size={14} strokeWidth={1.75} />
                        </button>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center">
                          <User size={14} strokeWidth={1.75} className="text-secondary" />
                        </div>
                        <span className="font-semibold text-on-surface">
                          {tx.recipient}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-sm text-secondary">
                      {tx.time}
                    </td>
                    <td className="px-8 py-5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${s.classes}`}
                      >
                        <StatusIcon size={12} strokeWidth={2} className={tx.status === 'pending' ? 'animate-spin' : ''} />
                        {s.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="px-8 py-4 bg-surface-container-low/30 text-center">
          <button className="text-xs font-bold text-primary uppercase tracking-[0.2em] hover:underline transition-all">
            Ver Historial Completo
          </button>
        </div>
      </div>
    </div>
  )
}
