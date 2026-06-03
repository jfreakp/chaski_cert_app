# Email de Notificación al Registrar en Blockchain — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enviar un email a cada estudiante cuando su certificado queda registrado en Polygon, con link al portal y a Polygonscan.

**Architecture:** Dos cambios quirúrgicos: (1) nueva función `sendCertificateRegisteredEmail` en el servicio de email existente, (2) llamada desde `markCertificatesRegistered` usando `Promise.allSettled` para que un fallo de envío no revierte la actualización en DB.

**Tech Stack:** Next.js 16 Server Actions, nodemailer (ya instalado), Prisma 7.

> **Nota:** El usuario gestiona los commits. No ejecutar `git add` ni `git commit`.

---

## Mapa de archivos

| Acción | Archivo |
|--------|---------|
| Modificar | `app/lib/email.ts` — agregar `sendCertificateRegisteredEmail` |
| Modificar | `app/actions/processes.ts` — disparar emails en `markCertificatesRegistered` |

---

## Task 1: Agregar sendCertificateRegisteredEmail a email.ts

**Files:**
- Modify: `app/lib/email.ts`

- [ ] **Paso 1: Agregar la función al final de `app/lib/email.ts`**

```ts
export async function sendCertificateRegisteredEmail(
  to: string,
  studentName: string,
  data: {
    certificateTypeName: string
    processName: string
    institutionName: string
    portalUrl: string
    polygonscanUrl: string
  }
) {
  const content = `
    <h1 style="margin:0 0 8px;font-size:28px;font-weight:900;color:#1a1a2e;letter-spacing:-1px;">
      Tu certificado está en blockchain
    </h1>
    <p style="margin:0 0 24px;font-size:14px;color:#666;line-height:1.6;">
      Hola <strong>${studentName}</strong>, tu certificado ha sido registrado de forma permanente en la red Polygon.
    </p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 28px;border-radius:8px;overflow:hidden;">
      <tr style="background:#f5f5f5;">
        <td style="padding:10px 16px;font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:1px;width:40%;">Tipo</td>
        <td style="padding:10px 16px;font-size:13px;font-weight:600;color:#1a1a2e;">${data.certificateTypeName}</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:1px;">Proceso</td>
        <td style="padding:10px 16px;font-size:13px;font-weight:600;color:#1a1a2e;">${data.processName}</td>
      </tr>
      <tr style="background:#f5f5f5;">
        <td style="padding:10px 16px;font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:1px;">Institución</td>
        <td style="padding:10px 16px;font-size:13px;font-weight:600;color:#1a1a2e;">${data.institutionName}</td>
      </tr>
    </table>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
      <tr>
        <td style="background:#1a1a2e;border-radius:8px;padding:16px 32px;">
          <a href="${data.portalUrl}" style="color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.5px;">
            Ver mi certificado →
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:12px;color:#999;line-height:1.6;">
      También podés verificar la transacción on-chain:<br/>
      <a href="${data.polygonscanUrl}" style="color:#1a1a2e;word-break:break-all;">${data.polygonscanUrl}</a>
    </p>
  `

  await transporter.sendMail({
    from: `"${PROJECT_NAME}" <${process.env.GMAIL_USER}>`,
    to,
    subject: `Tu certificado fue registrado en blockchain — ${PROJECT_NAME}`,
    html: baseTemplate(content),
  })
}
```

- [ ] **Paso 2: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "email.ts" | head -5
```

Salida esperada: sin errores.

---

## Task 2: Disparar emails en markCertificatesRegistered

**Files:**
- Modify: `app/actions/processes.ts`

- [ ] **Paso 1: Agregar import de sendCertificateRegisteredEmail**

En el bloque de imports al inicio de `app/actions/processes.ts`, agregar:

```ts
import { sendCertificateRegisteredEmail } from '@/app/lib/email'
```

- [ ] **Paso 2: Reemplazar markCertificatesRegistered con la versión que envía emails**

Reemplazar la función completa:

```ts
export async function markCertificatesRegistered(processId: string, txHash: string): Promise<{ message?: string }> {
  const { session } = await requireInstitution()
  if (session.role !== 'ADMIN') return { message: 'Solo administradores.' }

  try {
    await prisma.certificate.updateMany({
      where: { processId, status: 'ISSUED' },
      data: { status: 'REGISTERED', txHash, registeredAt: new Date() },
    })
  } catch {
    return { message: `Transacción confirmada (${txHash}) pero falló la actualización en DB. Guardá este txHash.` }
  }

  // Consultar certificados recién registrados para enviar emails
  const registered = await prisma.certificate.findMany({
    where: { processId, txHash },
    include: {
      student: { select: { name: true, email: true } },
      process: {
        include: {
          institution:     { select: { name: true } },
          certificateType: { select: { name: true } },
        },
      },
    },
  })

  const appUrl         = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const isAmoy         = process.env.NEXT_PUBLIC_BLOCKCHAIN_NETWORK !== 'polygon'
  const polygonscanUrl = isAmoy
    ? `https://amoy.polygonscan.com/tx/${txHash}`
    : `https://polygonscan.com/tx/${txHash}`

  await Promise.allSettled(
    registered.map(cert =>
      sendCertificateRegisteredEmail(cert.student.email, cert.student.name, {
        certificateTypeName: cert.process.certificateType.name,
        processName:         cert.process.name,
        institutionName:     cert.process.institution.name,
        portalUrl:           `${appUrl}/portal`,
        polygonscanUrl,
      })
    )
  )

  revalidatePath(`/dashboard/processes/${processId}`)
  return {}
}
```

- [ ] **Paso 3: Verificar TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "processes.ts" | head -5
```

Salida esperada: sin errores.

---

## Verificación manual

- [ ] Iniciar el servidor: `pnpm dev`
- [ ] Como ADMIN, ir a un proceso con certificados en estado `ISSUED`
- [ ] Hacer click en "Registrar en Blockchain" y confirmar en MetaMask
- [ ] Verificar que los emails llegan a los estudiantes del proceso
- [ ] El email debe mostrar tipo, proceso, institución, botón al portal y link a Polygonscan
- [ ] Verificar que si un email falla (ej: dirección inválida), el registro blockchain no se revierte
