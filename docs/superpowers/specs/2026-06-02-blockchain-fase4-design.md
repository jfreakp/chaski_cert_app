# Fase 4 — Registro en Blockchain

## Contexto

Los certificados emitidos en Fase 3 tienen un `dataHash` (SHA-256) calculado al momento de emisión. La Fase 4 registra ese hash en Polygon para dar prueba criptográfica de autenticidad, y expone una página pública de verificación (similar al SENESCYT de Ecuador).

Solo los administradores pueden disparar el registro. El PDF existente se actualiza con un QR apuntando a la página de verificación.

---

## Arquitectura

```
Admin → botón "Registrar en Blockchain" (proceso detail)
      → server action registerOnBlockchain(processId)
      → app/lib/blockchain.ts
      → CertificateRegistry.sol (Polygon Amoy / mainnet)
      → guarda txHash + marca REGISTERED

Público → /verify/[id]
        → muestra datos del certificado
        → si REGISTERED: link Polygonscan + verificación on-chain
```

---

## Smart Contract — CertificateRegistry.sol

Desplegado una vez en Amoy (pruebas) y una vez en mainnet (producción). La dirección va en `.env`.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract CertificateRegistry is Ownable {
    mapping(bytes32 => uint256) public registeredAt;

    event CertificateRegistered(bytes32 indexed hash, uint256 timestamp);

    constructor(address initialOwner) Ownable(initialOwner) {}

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

---

## Schema — Certificate

Agregar dos campos opcionales:

```prisma
txHash       String?
registeredAt DateTime?
```

---

## Variables de entorno

```env
BLOCKCHAIN_NETWORK=amoy          # "amoy" o "polygon"

AMOY_RPC_URL=https://rpc-amoy.polygon.technology
AMOY_CONTRACT_ADDRESS=0x...      # dirección del contrato desplegado en Amoy

POLYGON_RPC_URL=https://polygon-rpc.com
POLYGON_CONTRACT_ADDRESS=0x...   # dirección del contrato desplegado en mainnet

BLOCKCHAIN_PRIVATE_KEY=0x...     # clave privada de la wallet del servidor
```

---

## Servicio blockchain — app/lib/blockchain.ts

Encapsula toda la interacción con la red. Exporta una sola función pública:

```ts
registerHashes(hashes: string[]): Promise<string> // retorna txHash
```

Internamente:
- Lee `BLOCKCHAIN_NETWORK` para elegir RPC y dirección del contrato
- Usa `viem` para crear el cliente y firmar con `BLOCKCHAIN_PRIVATE_KEY`
- Convierte cada `dataHash` (hex string de 64 chars) a `bytes32`
- Llama a `registerBatch` y espera confirmación de la transacción
- Retorna el `txHash`

---

## Server Action — registerOnBlockchain(processId)

En `app/actions/processes.ts`. Solo accesible para rol `ADMIN`.

1. Busca todos los certificados `ISSUED` del proceso
2. Si no hay ninguno, retorna sin hacer nada
3. Llama a `registerHashes(hashes)` del servicio blockchain
4. Actualiza cada certificado: `status = REGISTERED`, `txHash`, `registeredAt = now()`
5. Revalida la página del proceso

Manejo de errores: si la transacción falla, ningún certificado se actualiza (todo o nada).

---

## UI — Proceso detail

En `app/(dashboard)/dashboard/processes/[id]/page.tsx`:

- El botón "Registrar en Blockchain" aparece solo si:
  - `session.role === 'ADMIN'`
  - Hay al menos un certificado con estado `ISSUED`
- Mientras procesa: spinner + "Registrando..."
- Tras éxito: el contador "En Blockchain" se actualiza

El botón vive en un nuevo componente client `register-blockchain-button.tsx`.

---

## Página pública — /verify/[id]

Ruta: `app/verify/[id]/page.tsx`. Sin autenticación requerida.

Muestra:
- Logo y nombre del sistema
- Datos del certificado: nombre del estudiante, DNI, institución, tipo, proceso, carrera (si aplica), fecha
- Badge de estado:
  - `ISSUED` (verde): "Certificado emitido"
  - `REGISTERED` (azul): "Verificado en Blockchain"
- Si `REGISTERED`:
  - `txHash` con link a Polygonscan (Amoy o mainnet según env)
  - Fecha de registro on-chain

Si el `id` no existe: página 404 simple con mensaje "Certificado no encontrado".

---

## PDF — QR Code

El generador de PDF (`app/lib/pdf.ts`) agrega un QR en la esquina inferior derecha del certificado apuntando a:

```
https://<APP_URL>/verify/<certificateId>
```

Variable de entorno necesaria: `NEXT_PUBLIC_APP_URL` (ya debe existir o se agrega).

La librería para QR: `qrcode` (npm). Genera el QR como PNG en base64 y se incrusta en el PDF con pdf-lib.

---

## Polygonscan links

| Red | URL |
|-----|-----|
| Amoy | `https://amoy.polygonscan.com/tx/<txHash>` |
| Mainnet | `https://polygonscan.com/tx/<txHash>` |

El link correcto se determina leyendo `BLOCKCHAIN_NETWORK` desde las env vars del servidor.

---

## Fuera de alcance

- Despliegue del contrato (se hace manualmente con Hardhat/Foundry fuera de la app)
- Revocación de certificados on-chain
- Múltiples firmantes / multisig
