import 'server-only'

export function getPolygonscanUrl(txHash: string): string {
  const isAmoy = process.env.NEXT_PUBLIC_BLOCKCHAIN_NETWORK !== 'polygon'
  return isAmoy
    ? `https://amoy.polygonscan.com/tx/${txHash}`
    : `https://polygonscan.com/tx/${txHash}`
}
