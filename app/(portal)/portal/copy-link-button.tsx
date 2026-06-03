'use client'

import { useState } from 'react'
import { Link2, Check } from 'lucide-react'

export default function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 text-xs font-bold text-secondary hover:text-primary-container transition-colors"
      title="Copiar link de verificación"
    >
      {copied
        ? <><Check size={12} strokeWidth={2.5} className="text-emerald-500" />Copiado</>
        : <><Link2 size={12} strokeWidth={2} />Copiar link</>}
    </button>
  )
}
