# Email de Notificación — Registro en Blockchain

**Fecha:** 2026-06-03

---

## Objetivo

Notificar al estudiante por email cuando su certificado queda registrado en Polygon, con acceso directo al portal y al comprobante on-chain.

---

## Trigger

`markCertificatesRegistered(processId, txHash)` en `app/actions/processes.ts`. Se ejecuta después de que el admin confirma la transacción en MetaMask y los certificados pasan a estado `REGISTERED` en la DB.

---

## Flujo

1. `markCertificatesRegistered` actualiza los certificados a `REGISTERED` con `txHash` y `registeredAt`.
2. Consulta los certificados recién registrados incluyendo datos del estudiante, proceso e institución.
3. Llama `sendCertificateRegisteredEmail` por cada estudiante, pasando:
   - Email y nombre del estudiante
   - Nombre del certificado (tipo + proceso + institución)
   - URL del portal: `NEXT_PUBLIC_APP_URL/portal`
   - URL de Polygonscan: construida a partir de `txHash` y `NEXT_PUBLIC_BLOCKCHAIN_NETWORK`
4. Los envíos se hacen con `Promise.allSettled` — un fallo de email no revierte la actualización en DB ni bloquea los demás envíos.

---

## Archivos

| Acción | Archivo |
|--------|---------|
| Modificar | `app/lib/email.ts` — agregar `sendCertificateRegisteredEmail` |
| Modificar | `app/actions/processes.ts` — disparar emails en `markCertificatesRegistered` |

---

## Función de email

```ts
sendCertificateRegisteredEmail(
  to: string,
  studentName: string,
  data: {
    certificateTypeName: string
    processName: string
    institutionName: string
    portalUrl: string
    polygonscanUrl: string
  }
)
```

El email incluye:
- Saludo con el nombre del estudiante
- Descripción del certificado (tipo, proceso, institución)
- Botón "Ver mi certificado" → `portalUrl`
- Link secundario "Ver en Polygonscan" → `polygonscanUrl`

---

## Construcción de polygonscanUrl

```ts
const isAmoy = process.env.NEXT_PUBLIC_BLOCKCHAIN_NETWORK !== 'polygon'
const polygonscanUrl = isAmoy
  ? `https://amoy.polygonscan.com/tx/${txHash}`
  : `https://polygonscan.com/tx/${txHash}`
```
