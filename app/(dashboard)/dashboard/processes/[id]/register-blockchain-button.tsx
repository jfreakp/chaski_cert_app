'use client'

import { useState } from 'react'
import { createWalletClient, createPublicClient, custom, http, parseAbi } from 'viem'
import { polygonAmoy, polygon } from 'viem/chains'
import { getIssuedHashes, markCertificatesRegistered } from '@/app/actions/processes'
import { Link2, Loader2 } from 'lucide-react'

const ABI = parseAbi([
  'function registerBatch(bytes32[] calldata hashes) external',
])

const isAmoy = process.env.NEXT_PUBLIC_BLOCKCHAIN_NETWORK !== 'polygon'
const chain = isAmoy ? polygonAmoy : polygon
const contractAddress = (isAmoy
  ? process.env.NEXT_PUBLIC_AMOY_CONTRACT_ADDRESS
  : process.env.NEXT_PUBLIC_POLYGON_CONTRACT_ADDRESS) as `0x${string}`

type Status = 'idle' | 'fetching' | 'connecting' | 'signing' | 'confirming' | 'done'

const statusLabels: Record<Status, string> = {
  idle:       '',
  fetching:   'Obteniendo certificados...',
  connecting: 'Conectando MetaMask...',
  signing:    'Esperando firma en MetaMask...',
  confirming: 'Confirmando en blockchain...',
  done:       'Registrado',
}

export default function RegisterBlockchainButton({
  processId,
  issuedCount,
}: {
  processId: string
  issuedCount: number
}) {
  const [status, setStatus] = useState<Status>('idle')

  if (issuedCount === 0) return null

  async function handleClick() {
    try {
      setStatus('fetching')
      const { hashes } = await getIssuedHashes(processId)
      if (hashes.length === 0) { setStatus('idle'); return }

      setStatus('connecting')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const eth = (window as any).ethereum
      if (!eth) throw new Error('MetaMask no está instalado en este navegador.')

      const walletClient = createWalletClient({ chain, transport: custom(eth) })
      const [address] = await walletClient.requestAddresses()

      setStatus('signing')
      const bytes32Hashes = hashes.map(h => `0x${h}` as `0x${string}`)
      const txHash = await walletClient.writeContract({
        address: contractAddress,
        abi: ABI,
        functionName: 'registerBatch',
        args: [bytes32Hashes],
        account: address,
      })

      setStatus('confirming')
      const publicClient = createPublicClient({ chain, transport: http() })
      await publicClient.waitForTransactionReceipt({ hash: txHash })

      await markCertificatesRegistered(processId, txHash)
      setStatus('done')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido.'
      alert(`Error: ${msg}`)
      setStatus('idle')
    }
  }

  const isPending = status !== 'idle' && status !== 'done'

  return (
    <button
      onClick={handleClick}
      disabled={isPending || status === 'done'}
      className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-5 rounded-lg transition-all text-sm disabled:opacity-60"
    >
      {isPending
        ? <Loader2 size={16} strokeWidth={2} className="animate-spin" />
        : <Link2 size={16} strokeWidth={1.75} />}
      {status === 'idle'
        ? `Registrar en Blockchain (${issuedCount})`
        : statusLabels[status]}
    </button>
  )
}
