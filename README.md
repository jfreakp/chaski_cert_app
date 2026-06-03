# Chaski Cert App

Plataforma de emisión de certificados digitales en blockchain (Polygon), con gestión de instituciones, carreras, usuarios y estudiantes, construida con Next.js 16, Prisma 7 y PostgreSQL.

## Stack

- **Framework:** Next.js 16 (App Router)
- **Base de datos:** PostgreSQL 16 (via Docker)
- **ORM:** Prisma 7 (cliente generado en `app/generated/prisma`)
- **Autenticación:** Sesiones con JWT (`jose`) + bcrypt
- **Estilos:** Tailwind CSS 4
- **Lenguaje:** TypeScript
- **Package manager:** pnpm

## Estructura

```
app/
├── (auth)/                        # Login, forgot-password, reset-password
├── (dashboard)/
│   ├── dashboard/
│   │   ├── institutions/          # CRUD instituciones (solo ADMIN)
│   │   ├── users/                 # CRUD usuarios (solo ADMIN)
│   │   ├── careers/               # CRUD carreras (solo UNIVERSITY)
│   │   ├── students/              # Gestión estudiantes + CSV import
│   │   ├── profile/               # Perfil del usuario
│   │   ├── no-institution/        # Error: UNIVERSITY sin institución
│   │   └── processes/[id]/        # Detalle de proceso + tabla de certificados + botón blockchain
│   └── components/                # Sidebar, dropdown, admin-menu
├── verify/[id]/                   # Página pública de verificación (sin login)
├── portal/                        # Portal del estudiante (magic link)
│   ├── login/                     # Formulario de email + verify token
│   └── profile/                   # Datos personales (solo lectura)
├── actions/                       # Server actions (auth, usuarios, instituciones, carreras, estudiantes, procesos)
├── api/
│   ├── auth/                      # Route handlers (clear-session)
│   └── certificates/[id]/pdf/     # Descarga de PDF con QR de verificación
└── lib/                           # Prisma client, sesión, DAL, email, config, blockchain
prisma/
├── schema.prisma
├── seed.ts
└── migrations/
contracts/
└── CertificateRegistry.sol        # Smart contract Solidity (desplegar en Remix)
```

## Modelos

| Modelo | Descripción |
|--------|-------------|
| `Institution` | Universidades e instituciones |
| `Career` | Carreras ligadas a una institución |
| `Student` | Estudiante (entidad global, identificado por cédula) |
| `StudentEnrollment` | Matrícula: relación Student ↔ Institution + Career |
| `User` | Usuarios de la plataforma |
| `Certificate` | Certificado emitido; incluye `dataHash`, `txHash`, `registeredAt` para trazabilidad blockchain |

**Estados de un certificado:** `PENDING` → `ISSUED` → `REGISTERED` (registrado en blockchain)

## Roles

| Rol | Descripción |
|-----|-------------|
| `ADMIN` | Gestión completa: usuarios, instituciones |
| `UNIVERSITY` | Gestión de carreras, estudiantes e importación CSV de su institución |
| `Estudiante` | Accede vía magic link a `/portal` — ve sus certificados, descarga PDFs, comparte links de verificación |

## Requisitos

- Node.js 20+
- pnpm
- Docker y Docker Compose

## Instalación

```bash
# 1. Instalar dependencias (aprobar build scripts la primera vez)
pnpm approve-builds   # seleccionar todos con 'a' y Enter
pnpm install

# 2. Levantar la base de datos
docker compose up -d

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con los valores correspondientes

# 4. Ejecutar migraciones
pnpm db:migrate

# 5. Generar el cliente Prisma
pnpm prisma generate

# 6. Poblar la base de datos con datos iniciales
pnpm db:seed
```

## Variables de entorno

```env
# Base de datos
DATABASE_URL=postgresql://chaskicert:chaskicert_pass@localhost:5432/chaskicert

# Sesión (JWT) — mínimo 32 caracteres, generar con: openssl rand -hex 32
SESSION_SECRET=

# URL pública de la app
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Nombre de la plataforma (aparece en UI, emails y títulos de página)
NEXT_PUBLIC_APP_NAME=NombreDeTuPlataforma

# Email (Gmail con App Password)
GMAIL_USER=tu-cuenta@gmail.com
GMAIL_APP_PASSWORD=

# Blockchain (Polygon) — MetaMask firma directamente desde el browser, no se almacena ninguna clave
NEXT_PUBLIC_BLOCKCHAIN_NETWORK=amoy        # "amoy" para testnet, "polygon" para mainnet
NEXT_PUBLIC_AMOY_CONTRACT_ADDRESS=0x_DIRECCION_CONTRATO_AMOY
NEXT_PUBLIC_POLYGON_CONTRACT_ADDRESS=0x_DIRECCION_CONTRATO_MAINNET

# Portal Estudiante
STUDENT_SESSION_DAYS=7       # duración de la cookie de sesión del estudiante (default: 7)
MAGIC_LINK_MINUTES=15        # tiempo de vida del magic link enviado al email (default: 15)
```

## Configuración de Blockchain (Polygon)

El registro en blockchain usa **MetaMask** — el admin firma la transacción directamente desde el navegador. No se almacena ninguna clave privada en el servidor.

### Arquitectura

- El admin firma con MetaMask desde el browser (la clave nunca sale del dispositivo)
- Un solo contrato `CertificateRegistry` almacena todos los hashes de todas las instituciones
- Cada certificado queda verificable públicamente en `/verify/[id]` sin login

### Paso 1 — Configurar MetaMask

1. Instalar [MetaMask](https://metamask.io/download) en el navegador del admin
2. Agregar la red **Polygon Amoy** (testnet):

| Campo | Valor |
|-------|-------|
| Nombre | Polygon Amoy |
| RPC URL | `https://rpc-amoy.polygon.technology` |
| Chain ID | `80002` |
| Símbolo | POL |

3. Conseguir POL de prueba en: https://faucet.polygon.technology

### Paso 2 — Desplegar el contrato

La wallet que despliega el contrato se convierte en su **owner** — solo esa wallet puede llamar `registerBatch`.

**Desde la terminal** (requiere tener la private key de la wallet deployante):

```bash
node --input-type=module << 'EOF'
import { createWalletClient, createPublicClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { polygonAmoy } from 'viem/chains'

const PRIVATE_KEY = '0x<TU_PRIVATE_KEY>'
const BYTECODE = '0x6080604052...' // compilar contracts/CertificateRegistry.sol en Remix → copiar bytecode

const account = privateKeyToAccount(PRIVATE_KEY)
const walletClient = createWalletClient({ account, chain: polygonAmoy, transport: http('https://rpc-amoy.polygon.technology') })
const publicClient = createPublicClient({ chain: polygonAmoy, transport: http('https://rpc-amoy.polygon.technology') })

const txHash = await walletClient.deployContract({ abi: [], bytecode: BYTECODE })
const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
console.log('Contrato desplegado en:', receipt.contractAddress)
EOF
```

### Paso 3 — Variables de entorno

```env
NEXT_PUBLIC_BLOCKCHAIN_NETWORK=amoy    # "amoy" para testnet, "polygon" para mainnet

NEXT_PUBLIC_AMOY_CONTRACT_ADDRESS=0x<dirección del contrato en Amoy>
NEXT_PUBLIC_POLYGON_CONTRACT_ADDRESS=0x<dirección del contrato en mainnet>
```

> No se necesita `BLOCKCHAIN_PRIVATE_KEY` — MetaMask firma directamente desde el browser.

### Paso 4 — Configurar MetaMask del admin

La cuenta de MetaMask que el admin use para registrar **debe ser la misma que desplegó el contrato** (el owner). Si la cuenta no está en MetaMask:

1. MetaMask → selector de cuenta → **"+ Agregar cuenta o hardware wallet"**
2. **"Importar cuenta"** → **"Clave privada"**
3. Pegar la private key de la wallet deployante

### Paso 5 — Cómo registrar certificados

1. Ingresar como **ADMIN** → **Procesos** en el sidebar
2. Entrar al detalle de un proceso con certificados emitidos
3. Asegurarse de que MetaMask esté en la red **Amoy** y la cuenta **owner**
4. Click en **"Registrar en Blockchain (N)"**
5. MetaMask abre un popup para confirmar → aprobar la transacción
6. El botón muestra el progreso: Conectando → Esperando firma → Confirmando

Los `N` certificados se registran en una sola transacción. Cada uno queda verificable en `/verify/[id]`.

### Recarga de saldo

La wallet owner necesita POL para pagar gas (~0.0002 POL por batch). Monitorear en:
`https://amoy.polygonscan.com/address/<WALLET_ADDRESS>`

---

## Comandos

```bash
pnpm dev           # Servidor de desarrollo
pnpm build         # Build de producción
pnpm start         # Servidor de producción

pnpm db:migrate    # Ejecutar migraciones
pnpm db:seed       # Poblar base de datos
pnpm db:reset      # Resetear base de datos (borra todo y re-aplica migraciones + seed)
pnpm db:studio     # Abrir Prisma Studio
```

## Base de datos (Docker)

```bash
docker compose up -d      # Iniciar PostgreSQL
docker compose down       # Detener
docker compose down -v    # Detener y eliminar volúmenes
```

## Seed inicial

| Rol | Email | Password |
|-----|-------|----------|
| ADMIN | admin@chaskicert.com | Admin123! |
| UNIVERSITY (UTPL) | utpl@universidad.edu.ec | University123! |
| UNIVERSITY (UNL) | unl@universidad.edu.ec | University123! |

**Instituciones:** UTPL y UNL (Ecuador)

**Carreras UTPL:** Ingeniería en Sistemas Informáticos, Administración de Empresas

**Carreras UNL:** Medicina, Derecho

**Estudiantes de prueba:**
- María Fernanda Castro — matriculada en UTPL (Ing. Sistemas) y UNL (Medicina)
- Juan Carlos Pérez — UTPL (Administración)
- Ana Lucía Romero — UNL (Derecho)
