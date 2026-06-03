# Fase 4 — Registro en Blockchain — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Registrar los `dataHash` de certificados emitidos en Polygon (Amoy para pruebas, mainnet para producción) en una sola transacción por proceso, agregar QR al PDF, y exponer una página pública de verificación.

**Architecture:** Smart contract `CertificateRegistry` almacena hashes on-chain. `app/lib/blockchain.ts` encapsula la interacción vía `viem`. El server action `registerOnBlockchain(processId)` (solo ADMIN) orquesta la llamada y persiste `txHash`+`registeredAt`. La página pública `/verify/[id]` no requiere login. El PDF incluye un QR apuntando a esa URL.

**Tech Stack:** Next.js 16 App Router, Prisma 7, Solidity ^0.8.20, viem, qrcode, pdf-lib (ya instalado), Tailwind CSS 4.

> **Nota:** El usuario gestiona los commits. No ejecutar `git add` ni `git commit`.

---

## Mapa de archivos

| Acción | Archivo |
|--------|---------|
| Crear | `contracts/CertificateRegistry.sol` |
| Modificar | `prisma/schema.prisma` |
| Crear | `prisma/migrations/20260602220000_add_blockchain_fields_to_certificate/migration.sql` |
| Modificar | `.env` (vars documentadas) |
| Crear | `app/lib/blockchain.ts` |
| Modificar | `app/actions/processes.ts` |
| Crear | `app/(dashboard)/dashboard/processes/[id]/register-blockchain-button.tsx` |
| Modificar | `app/(dashboard)/dashboard/processes/[id]/page.tsx` |
| Modificar | `app/(dashboard)/dashboard/processes/[id]/certificate-table.tsx` |
| Modificar | `app/lib/pdf.ts` |
| Modificar | `app/api/certificates/[id]/pdf/route.ts` |
| Crear | `app/verify/[id]/page.tsx` |

---

## Task 1: Smart Contract

**Files:**
- Create: `contracts/CertificateRegistry.sol`

El contrato se despliega manualmente en Remix IDE. La dirección resultante va al `.env`.

- [ ] **Paso 1: Crear el directorio y el contrato**

```bash
mkdir contracts
```

Crear `contracts/CertificateRegistry.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CertificateRegistry {
    address public owner;
    mapping(bytes32 => uint256) public registeredAt;

    event CertificateRegistered(bytes32 indexed hash, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function registerBatch(bytes32[] calldata hashes) external onlyOwner {
        for (uint256 i = 0; i < hashes.length; i++) {
            require(registeredAt[hashes[i]] == 0, "Hash already registered");
            registeredAt[hashes[i]] = block.timestamp;
            emit CertificateRegistered(hashes[i], block.timestamp);
        }
    }

    function isRegistered(bytes32 hash) external view returns (bool) {
        return registeredAt[hash] > 0;
    }
}
```

- [ ] **Paso 2: Desplegar en Polygon Amoy con Remix**

1. Ir a https://remix.ethereum.org
2. Crear nuevo archivo y pegar el contenido de `CertificateRegistry.sol`
3. Compilar con Solidity 0.8.20
4. En "Deploy & Run Transactions": seleccionar "Injected Provider - MetaMask"
5. Asegurarse de estar en la red **Polygon Amoy** (chainId 80002)
6. Si no tenés MATIC de prueba: ir a https://faucet.polygon.technology y pedir para Amoy
7. Click "Deploy" → confirmar en MetaMask
8. Copiar la dirección del contrato desplegado (aparece en "Deployed Contracts")

- [ ] **Paso 3: Anotar la dirección del contrato y la private key de la wallet**

La wallet usada en MetaMask para desplegar será la `owner` del contrato. Su private key va en `.env` como `BLOCKCHAIN_PRIVATE_KEY`.

> Para obtener la private key en MetaMask: Configuración → Gestión de cuentas → Exportar clave privada.

---

## Task 2: Schema + Migración + Variables de entorno

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260602220000_add_blockchain_fields_to_certificate/migration.sql`
- Modify: `.env`

- [ ] **Paso 1: Agregar campos al modelo `Certificate` en schema.prisma**

Reemplazar el modelo `Certificate`:

```prisma
model Certificate {
  id           String            @id @default(uuid())
  status       CertificateStatus @default(PENDING)
  dataHash     String            @unique
  issuedAt     DateTime?
  txHash       String?
  registeredAt DateTime?
  createdAt    DateTime          @default(now())

  processId  String
  process    CertificateProcess @relation(fields: [processId], references: [id])

  studentId  String
  student    Student          @relation(fields: [studentId], references: [id])

  careerId   String?
  career     Career?          @relation(fields: [careerId], references: [id])

  issuedById String
  issuedBy   User             @relation(fields: [issuedById], references: [id])

  @@unique([processId, studentId])
}
```

- [ ] **Paso 2: Crear migración**

```bash
mkdir -p prisma/migrations/20260602220000_add_blockchain_fields_to_certificate
```

Crear `prisma/migrations/20260602220000_add_blockchain_fields_to_certificate/migration.sql`:

```sql
-- AlterTable
ALTER TABLE "Certificate" ADD COLUMN "txHash" TEXT;
ALTER TABLE "Certificate" ADD COLUMN "registeredAt" TIMESTAMP(3);
```

- [ ] **Paso 3: Aplicar migración y regenerar cliente**

```bash
pnpm prisma migrate deploy && pnpm prisma generate
```

Salida esperada: `Your database is now in sync with your schema.`

- [ ] **Paso 4: Agregar variables al `.env`**

Agregar al final del archivo `.env`:

```env
# Blockchain
BLOCKCHAIN_NETWORK=amoy

AMOY_RPC_URL=https://rpc-amoy.polygon.technology
AMOY_CONTRACT_ADDRESS=0x_PEGAR_AQUI_DIRECCION_AMOY

POLYGON_RPC_URL=https://polygon-rpc.com
POLYGON_CONTRACT_ADDRESS=0x_PEGAR_AQUI_DIRECCION_MAINNET

BLOCKCHAIN_PRIVATE_KEY=0x_PEGAR_AQUI_PRIVATE_KEY
```

---

## Task 3: Instalar viem + Servicio blockchain

**Files:**
- Create: `app/lib/blockchain.ts`

- [ ] **Paso 1: Instalar viem**

```bash
pnpm add viem
```

Salida esperada: paquete agregado sin errores.

- [ ] **Paso 2: Crear `app/lib/blockchain.ts`**

```ts
import 'server-only'
import { createWalletClient, createPublicClient, http, parseAbi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { polygon, polygonAmoy } from 'viem/chains'

const ABI = parseAbi([
  'function registerBatch(bytes32[] calldata hashes) external',
  'function isRegistered(bytes32 hash) external view returns (bool)',
  'function registeredAt(bytes32 hash) external view returns (uint256)',
])

function getConfig() {
  const network = process.env.BLOCKCHAIN_NETWORK ?? 'amoy'
  const isAmoy  = network !== 'polygon'

  const rpcUrl          = isAmoy ? process.env.AMOY_RPC_URL!    : process.env.POLYGON_RPC_URL!
  const contractAddress = isAmoy ? process.env.AMOY_CONTRACT_ADDRESS! : process.env.POLYGON_CONTRACT_ADDRESS!
  const chain           = isAmoy ? polygonAmoy : polygon

  return { rpcUrl, contractAddress: contractAddress as `0x${string}`, chain, isAmoy }
}

export function getPolygonscanUrl(txHash: string): string {
  const { isAmoy } = getConfig()
  return isAmoy
    ? `https://amoy.polygonscan.com/tx/${txHash}`
    : `https://polygonscan.com/tx/${txHash}`
}

export async function registerHashes(hashes: string[]): Promise<string> {
  const { rpcUrl, contractAddress, chain } = getConfig()

  const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY as `0x${string}`
  const account    = privateKeyToAccount(privateKey)

  const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) })
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) })

  // Convertir cada dataHash (hex string de 64 chars) a bytes32
  const bytes32Hashes = hashes.map(h => `0x${h}` as `0x${string}`)

  const txHash = await walletClient.writeContract({
    address: contractAddress,
    abi:     ABI,
    functionName: 'registerBatch',
    args:    [bytes32Hashes],
  })

  // Esperar confirmación
  await publicClient.waitForTransactionReceipt({ hash: txHash })

  return txHash
}
```

- [ ] **Paso 3: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "blockchain.ts"
```

Salida esperada: sin errores en `blockchain.ts`.

---

## Task 4: Server Action — registerOnBlockchain

**Files:**
- Modify: `app/actions/processes.ts`

- [ ] **Paso 1: Agregar import y la función al final de `app/actions/processes.ts`**

Agregar al bloque de imports (al inicio del archivo):

```ts
import { registerHashes } from '@/app/lib/blockchain'
```

Agregar al final del archivo (después de `generateCertificates`):

```ts
// ── Registro en Blockchain ────────────────────────────────────────────────────

export async function registerOnBlockchain(processId: string): Promise<{ message?: string }> {
  const { session } = await requireInstitution()
  if (session.role !== 'ADMIN') return { message: 'Solo administradores pueden registrar en blockchain.' }

  const certificates = await prisma.certificate.findMany({
    where: { processId, status: 'ISSUED' },
    select: { id: true, dataHash: true },
  })

  if (certificates.length === 0) return { message: 'No hay certificados emitidos para registrar.' }

  const txHash = await registerHashes(certificates.map(c => c.dataHash))

  const now = new Date()
  await prisma.certificate.updateMany({
    where: { id: { in: certificates.map(c => c.id) } },
    data: { status: 'REGISTERED', txHash, registeredAt: now },
  })

  revalidatePath(`/dashboard/processes/${processId}`)
  return {}
}
```

- [ ] **Paso 2: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "processes.ts"
```

Salida esperada: solo los 2 errores pre-existentes en líneas 35 y 62 (no relacionados a este cambio). Sin nuevos errores.

---

## Task 5: UI — Botón "Registrar en Blockchain" + actualizar página del proceso

**Files:**
- Create: `app/(dashboard)/dashboard/processes/[id]/register-blockchain-button.tsx`
- Modify: `app/(dashboard)/dashboard/processes/[id]/page.tsx`
- Modify: `app/(dashboard)/dashboard/processes/[id]/certificate-table.tsx`

- [ ] **Paso 1: Crear `register-blockchain-button.tsx`**

```tsx
'use client'

import { useTransition } from 'react'
import { registerOnBlockchain } from '@/app/actions/processes'
import { Link2, Loader2 } from 'lucide-react'

export default function RegisterBlockchainButton({
  processId,
  issuedCount,
}: {
  processId: string
  issuedCount: number
}) {
  const [pending, startTransition] = useTransition()

  if (issuedCount === 0) return null

  return (
    <button
      onClick={() => startTransition(async () => {
        const result = await registerOnBlockchain(processId)
        if (result.message) alert(result.message)
      })}
      disabled={pending}
      className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-5 rounded-lg transition-all text-sm disabled:opacity-60"
    >
      {pending
        ? <><Loader2 size={16} strokeWidth={2} className="animate-spin" />Registrando...</>
        : <><Link2 size={16} strokeWidth={1.75} />Registrar en Blockchain ({issuedCount})</>}
    </button>
  )
}
```

- [ ] **Paso 2: Actualizar `app/(dashboard)/dashboard/processes/[id]/page.tsx`**

Agregar el import del nuevo componente junto a los otros imports de componentes:

```tsx
import RegisterBlockchainButton from './register-blockchain-button'
```

En la query de `certificates`, agregar `txHash` y `registeredAt` al include:

```tsx
certificates: {
  include: {
    student: { select: { name: true, dni: true } },
    career:  { select: { name: true } },
  },
  orderBy: { createdAt: 'desc' },
},
```

Reemplazar por:

```tsx
certificates: {
  include: {
    student: { select: { name: true, dni: true } },
    career:  { select: { name: true } },
  },
  select: {
    id: true,
    status: true,
    issuedAt: true,
    txHash: true,
    registeredAt: true,
    student: { select: { name: true, dni: true } },
    career: { select: { name: true } },
  },
  orderBy: { createdAt: 'desc' },
},
```

Calcular `issuedCount` justo antes del `return`:

```tsx
const issuedCount = proc.certificates.filter(c => c.status === 'ISSUED').length
```

En el bloque de botones de acciones (donde están "Importar CSV" y "Agregar Estudiante"), agregar el botón de blockchain **solo para ADMIN**:

```tsx
{isAdmin && (
  <RegisterBlockchainButton processId={id} issuedCount={issuedCount} />
)}
```

El bloque de botones actualmente solo muestra acciones para `!isAdmin`. Agregar antes de ese bloque:

```tsx
{isAdmin && issuedCount > 0 && (
  <RegisterBlockchainButton processId={id} issuedCount={issuedCount} />
)}
```

- [ ] **Paso 3: Actualizar `certificate-table.tsx` para mostrar link a Polygonscan**

Reemplazar el contenido completo de `app/(dashboard)/dashboard/processes/[id]/certificate-table.tsx`:

```tsx
'use client'

import { FileText, Download, ExternalLink } from 'lucide-react'
import { getPolygonscanUrl } from '@/app/lib/blockchain'

type Certificate = {
  id: string
  status: 'PENDING' | 'ISSUED' | 'REGISTERED'
  issuedAt: Date | null
  txHash: string | null
  registeredAt: Date | null
  student: { name: string; dni: string }
  career: { name: string } | null
}

const statusStyles: Record<Certificate['status'], string> = {
  PENDING:    'bg-amber-50 text-amber-700',
  ISSUED:     'bg-emerald-50 text-emerald-700',
  REGISTERED: 'bg-blue-50 text-blue-700',
}
const statusLabels: Record<Certificate['status'], string> = {
  PENDING:    'Pendiente',
  ISSUED:     'Emitido',
  REGISTERED: 'En Blockchain',
}

export default function CertificateTable({
  certificates,
  isAdmin,
  polygonscanBaseUrl,
}: {
  certificates: Certificate[]
  isAdmin: boolean
  polygonscanBaseUrl: string
}) {
  return (
    <div>
      <h2 className="text-lg font-extrabold text-on-surface tracking-tight flex items-center gap-2 mb-4">
        <FileText size={20} strokeWidth={1.75} />
        Certificados Generados
      </h2>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-surface-container">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-container bg-surface-container-lowest">
              <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary">Estudiante</th>
              <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary hidden md:table-cell">Carrera</th>
              <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary">Estado</th>
              <th className="text-left px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-secondary hidden lg:table-cell">Emisión</th>
              <th className="px-6 py-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container">
            {certificates.map((c) => (
              <tr key={c.id} className="hover:bg-surface-container-lowest/50 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-semibold text-on-surface">{c.student.name}</p>
                  <p className="text-xs text-secondary mt-0.5">{c.student.dni}</p>
                </td>
                <td className="px-6 py-4 text-sm text-secondary hidden md:table-cell">
                  {c.career?.name ?? <span className="text-outline/60 italic">Sin carrera</span>}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider w-fit ${statusStyles[c.status]}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {statusLabels[c.status]}
                    </span>
                    {c.status === 'REGISTERED' && c.txHash && (
                      <a
                        href={`${polygonscanBaseUrl}/tx/${c.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:underline"
                      >
                        <ExternalLink size={10} strokeWidth={2} />
                        Ver en Polygonscan
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-secondary hidden lg:table-cell">
                  {c.issuedAt
                    ? new Date(c.issuedAt).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '—'}
                </td>
                <td className="px-6 py-4">
                  <a
                    href={`/api/certificates/${c.id}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg text-secondary hover:text-primary-container hover:bg-surface-container-low transition-all inline-flex"
                    title="Descargar PDF"
                  >
                    <Download size={16} strokeWidth={1.75} />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Paso 4: Actualizar la llamada a `CertificateTable` en `page.tsx`**

`CertificateTable` ahora requiere `polygonscanBaseUrl`. Importar `getPolygonscanUrl` y pasarlo:

Agregar import en `page.tsx`:
```tsx
import { getPolygonscanUrl } from '@/app/lib/blockchain'
```

Calcular antes del return:
```tsx
const polygonscanBaseUrl = process.env.BLOCKCHAIN_NETWORK === 'polygon'
  ? 'https://polygonscan.com'
  : 'https://amoy.polygonscan.com'
```

Actualizar la llamada al componente:
```tsx
<CertificateTable
  certificates={proc.certificates}
  isAdmin={isAdmin}
  polygonscanBaseUrl={polygonscanBaseUrl}
/>
```

- [ ] **Paso 5: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -E "register-blockchain|certificate-table|processes/\[id\]/page" | head -10
```

Salida esperada: sin errores en los archivos modificados.

---

## Task 6: PDF con QR Code

**Files:**
- Modify: `app/lib/pdf.ts`
- Modify: `app/api/certificates/[id]/pdf/route.ts`

- [ ] **Paso 1: Instalar qrcode**

```bash
pnpm add qrcode && pnpm add -D @types/qrcode
```

- [ ] **Paso 2: Actualizar `app/lib/pdf.ts`**

Reemplazar el contenido completo:

```ts
import 'server-only'
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib'
import QRCode from 'qrcode'

const BRAND  = rgb(0.10, 0.20, 0.60)
const DARK   = rgb(0.08, 0.08, 0.12)
const GRAY   = rgb(0.45, 0.45, 0.52)
const ACCENT = rgb(0.95, 0.70, 0.10)
const WHITE  = rgb(1, 1, 1)

export interface CertificatePdfData {
  id: string
  studentName: string
  studentDni: string
  careerName: string | null
  eventName: string
  eventDate: Date
  institutionName: string
  certificateTypeName: string
  issuedAt: Date
  verifyUrl: string
}

export async function generateCertificatePdf(cert: CertificatePdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create()

  // A4 landscape: 841.89 x 595.28 pt
  const page = doc.addPage([841.89, 595.28])
  const { width, height } = page.getSize()

  const fontBold    = await doc.embedFont(StandardFonts.HelveticaBold)
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica)
  const fontOblique = await doc.embedFont(StandardFonts.HelveticaOblique)

  // Fondo blanco
  page.drawRectangle({ x: 0, y: 0, width, height, color: WHITE })

  // Banda lateral izquierda
  page.drawRectangle({ x: 0, y: 0, width: 180, height, color: BRAND })

  // Borde superior derecho
  page.drawRectangle({ x: 180, y: height - 8, width: width - 180, height: 8, color: ACCENT })

  // Borde inferior derecho
  page.drawRectangle({ x: 180, y: 0, width: width - 180, height: 6, color: BRAND })

  // Marca de agua
  page.drawText('CERTIFICADO', {
    x: 280, y: 200, size: 72, font: fontBold,
    color: rgb(0.92, 0.93, 0.97), rotate: degrees(-28), opacity: 0.3,
  })

  // Sidebar: nombre institución vertical
  page.drawText(cert.institutionName.toUpperCase(), {
    x: 28, y: height / 2, size: 9, font: fontBold,
    color: WHITE, rotate: degrees(90),
    maxWidth: height - 80,
  })

  // Tipo de certificado en sidebar
  page.drawText(cert.certificateTypeName.toUpperCase(), {
    x: 50, y: 80, size: 8, font: fontRegular,
    color: rgb(0.8, 0.85, 1),
    maxWidth: 120,
  })

  // Contenido principal
  const cx = 220

  // Institución
  page.drawText(cert.institutionName.toUpperCase(), {
    x: cx, y: height - 80, size: 9, font: fontBold,
    color: GRAY,
  })

  // Título
  page.drawText('Certificado', {
    x: cx, y: height - 130, size: 42, font: fontBold, color: BRAND,
  })

  // Tipo
  page.drawText(cert.certificateTypeName, {
    x: cx, y: height - 165, size: 13, font: fontOblique, color: GRAY,
  })

  // Línea separadora
  page.drawLine({ start: { x: cx, y: height - 185 }, end: { x: cx + 400, y: height - 185 }, thickness: 1, color: rgb(0.85, 0.87, 0.92) })

  // Se certifica que
  page.drawText('Se certifica que', {
    x: cx, y: height - 220, size: 11, font: fontRegular, color: GRAY,
  })

  // Nombre estudiante
  page.drawText(cert.studentName, {
    x: cx, y: height - 265, size: 30, font: fontBold, color: DARK, maxWidth: 560,
  })

  // DNI
  page.drawText(`DNI: ${cert.studentDni}`, {
    x: cx, y: height - 295, size: 10, font: fontRegular, color: GRAY,
  })

  // Carrera
  if (cert.careerName) {
    page.drawText(cert.careerName, {
      x: cx, y: height - 315, size: 11, font: fontRegular, color: DARK,
    })
  }

  // Evento
  page.drawText(`participó en "${cert.eventName}"`, {
    x: cx, y: height - 350, size: 11, font: fontRegular, color: DARK, maxWidth: 560,
  })

  // Fecha del evento
  const eventDateStr = new Date(cert.eventDate).toLocaleDateString('es-PE', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  page.drawText(eventDateStr, {
    x: cx, y: height - 370, size: 10, font: fontRegular, color: GRAY,
  })

  // Línea separadora inferior
  page.drawLine({ start: { x: cx, y: height - 415 }, end: { x: cx + 400, y: height - 415 }, thickness: 1, color: rgb(0.85, 0.87, 0.92) })

  // Fecha de emisión y ID
  const issuedDateStr = new Date(cert.issuedAt).toLocaleDateString('es-PE', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  page.drawText(`Emitido el ${issuedDateStr}`, {
    x: cx, y: height - 438, size: 8, font: fontRegular, color: GRAY,
  })
  page.drawText(`ID: ${cert.id}`, {
    x: cx, y: height - 453, size: 7, font: fontRegular, color: rgb(0.7, 0.7, 0.75),
  })

  // QR de verificación — esquina inferior derecha
  const qrPngBuffer = await QRCode.toBuffer(cert.verifyUrl, { width: 80, margin: 1 })
  const qrImage = await doc.embedPng(qrPngBuffer)
  const qrSize  = 70
  page.drawImage(qrImage, { x: width - qrSize - 20, y: 20, width: qrSize, height: qrSize })
  page.drawText('Verificar', {
    x: width - qrSize - 20, y: 14, size: 6, font: fontRegular, color: GRAY,
  })

  return doc.save()
}
```

- [ ] **Paso 3: Actualizar `app/api/certificates/[id]/pdf/route.ts`**

Reemplazar el contenido completo:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/session'
import { prisma } from '@/app/lib/prisma'
import { generateCertificatePdf } from '@/app/lib/pdf'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session?.userId) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const { id } = await params

  const cert = await prisma.certificate.findUnique({
    where: { id },
    include: {
      student: { select: { name: true, dni: true } },
      career: { select: { name: true } },
      process: {
        include: {
          institution: { select: { name: true } },
          certificateType: { select: { name: true } },
        },
      },
    },
  })

  if (!cert) return NextResponse.json({ error: 'No encontrado.' }, { status: 404 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const pdfBytes = await generateCertificatePdf({
    id: cert.id,
    studentName: cert.student.name,
    studentDni: cert.student.dni,
    careerName: cert.career?.name ?? null,
    eventName: cert.process.name,
    eventDate: cert.process.date,
    institutionName: cert.process.institution.name,
    certificateTypeName: cert.process.certificateType.name,
    issuedAt: cert.issuedAt ?? cert.createdAt,
    verifyUrl: `${appUrl}/verify/${cert.id}`,
  })

  const safeName = cert.student.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
  const filename = `certificado-${safeName}.pdf`

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
```

- [ ] **Paso 4: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -E "pdf\.ts|pdf/route" | head -5
```

Salida esperada: sin errores en los 2 archivos.

---

## Task 7: Página pública de verificación

**Files:**
- Create: `app/verify/[id]/page.tsx`

Esta ruta está fuera de `(dashboard)`, por lo que no hereda el layout autenticado y es pública.

- [ ] **Paso 1: Crear `app/verify/[id]/page.tsx`**

```tsx
import { prisma } from '@/app/lib/prisma'
import { PROJECT_NAME } from '@/app/lib/config'
import { BadgeCheck, ShieldCheck, Clock, ExternalLink, AlertTriangle } from 'lucide-react'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cert = await prisma.certificate.findUnique({
    where: { id },
    include: { student: { select: { name: true } } },
  })
  if (!cert) return { title: `${PROJECT_NAME} — Certificado no encontrado` }
  return { title: `${PROJECT_NAME} — Verificar certificado de ${cert.student.name}` }
}

export default async function VerifyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const cert = await prisma.certificate.findUnique({
    where: { id },
    include: {
      student: { select: { name: true, dni: true } },
      career:  { select: { name: true } },
      process: {
        include: {
          institution:     { select: { name: true } },
          certificateType: { select: { name: true } },
        },
      },
    },
  })

  const isAmoy = process.env.BLOCKCHAIN_NETWORK !== 'polygon'
  const polygonscanBase = isAmoy ? 'https://amoy.polygonscan.com' : 'https://polygonscan.com'

  if (!cert) {
    return (
      <div className="min-h-screen bg-surface-container-low flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-surface-container p-12 max-w-md text-center">
          <AlertTriangle size={40} strokeWidth={1} className="text-outline/40 mb-4 mx-auto" />
          <h1 className="text-xl font-extrabold text-on-surface">Certificado no encontrado</h1>
          <p className="text-sm text-secondary mt-2">El ID proporcionado no corresponde a ningún certificado.</p>
        </div>
      </div>
    )
  }

  const isRegistered = cert.status === 'REGISTERED'

  return (
    <div className="min-h-screen bg-surface-container-low flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-surface-container p-10 max-w-xl w-full">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className={`p-3 rounded-xl ${isRegistered ? 'bg-blue-50' : 'bg-emerald-50'}`}>
            {isRegistered
              ? <ShieldCheck size={24} strokeWidth={1.75} className="text-blue-600" />
              : <BadgeCheck size={24} strokeWidth={1.75} className="text-emerald-600" />}
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-secondary">{PROJECT_NAME}</p>
            <h1 className="text-xl font-extrabold text-on-surface tracking-tight">
              {isRegistered ? 'Certificado verificado en Blockchain' : 'Certificado emitido'}
            </h1>
          </div>
        </div>

        {/* Datos del certificado */}
        <div className="space-y-4 mb-8">
          <Row label="Estudiante" value={cert.student.name} />
          <Row label="DNI" value={cert.student.dni} />
          <Row label="Institución" value={cert.process.institution.name} />
          <Row label="Tipo" value={cert.process.certificateType.name} />
          <Row label="Proceso" value={cert.process.name} />
          {cert.career && <Row label="Carrera" value={cert.career.name} />}
          <Row label="Fecha" value={new Date(cert.process.date).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })} />
          {cert.issuedAt && <Row label="Emitido el" value={new Date(cert.issuedAt).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })} />}
        </div>

        {/* Prueba blockchain */}
        {isRegistered && cert.txHash ? (
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-5 space-y-3">
            <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
              <ShieldCheck size={16} strokeWidth={2} />
              Registrado en Polygon
            </div>
            {cert.registeredAt && (
              <div className="flex items-center gap-2 text-xs text-blue-600">
                <Clock size={12} strokeWidth={2} />
                {new Date(cert.registeredAt).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
            <a
              href={`${polygonscanBase}/tx/${cert.txHash}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 hover:underline break-all"
            >
              <ExternalLink size={12} strokeWidth={2} />
              Ver transacción en Polygonscan
            </a>
            <p className="text-[10px] text-blue-500 font-mono break-all">{cert.txHash}</p>
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-sm text-emerald-700 font-medium">
              Este certificado ha sido emitido oficialmente. El registro en blockchain está pendiente.
            </p>
          </div>
        )}

        <p className="text-[10px] text-secondary mt-6 text-center">ID: {cert.id}</p>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-4 py-2 border-b border-surface-container last:border-0">
      <span className="text-[10px] font-bold uppercase tracking-widest text-secondary shrink-0">{label}</span>
      <span className="text-sm font-semibold text-on-surface text-right">{value}</span>
    </div>
  )
}
```

- [ ] **Paso 2: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "verify" | head -5
```

Salida esperada: sin errores en `verify/[id]/page.tsx`.

---

## Verificación final

- [ ] Iniciar el servidor: `pnpm dev`
- [ ] Como **ADMIN**: ir a un proceso con certificados `ISSUED` → debe aparecer el botón "Registrar en Blockchain"
- [ ] Click en el botón → spinner → certificados cambian a estado "En Blockchain" con link a Polygonscan
- [ ] Descargar un PDF de un certificado → debe incluir QR en la esquina inferior derecha
- [ ] Escanear el QR o abrir `/verify/[id]` en modo incógnito (sin login) → debe mostrar los datos del certificado
- [ ] Si el certificado está registrado: debe mostrar la sección azul con el link a Polygonscan
- [ ] Abrir `/verify/ID_INEXISTENTE` → debe mostrar "Certificado no encontrado"
