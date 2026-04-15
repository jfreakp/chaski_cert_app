import 'server-only'
import nodemailer from 'nodemailer'
import { PROJECT_NAME } from '@/app/lib/config'

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

function baseTemplate(content: string): string {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${PROJECT_NAME}</title>
    </head>
    <body style="margin:0;padding:0;background:#f5f5f5;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
        <tr>
          <td align="center">
            <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
              <!-- Header -->
              <tr>
                <td style="background:#f95f2b;padding:32px 40px;">
                  <p style="margin:0;font-size:20px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;text-transform:uppercase;">
                    ${PROJECT_NAME}
                  </p>
                  <p style="margin:4px 0 0;font-size:10px;font-weight:700;color:#8080a0;letter-spacing:3px;text-transform:uppercase;">
                    El estándar soberano en certificación académica
                  </p>
                </td>
              </tr>
              <!-- Content -->
              <tr>
                <td style="padding:40px;">
                  ${content}
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background:#f9f9f9;padding:24px 40px;border-top:1px solid #f0f0f0;">
                  <p style="margin:0;font-size:11px;color:#999;text-align:center;">
                    Este correo fue enviado automáticamente por ${PROJECT_NAME}. No respondas a este mensaje.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `
}

export async function sendWelcomeEmail(to: string, name: string | null, resetUrl: string) {
  const displayName = name ?? to

  const content = `
    <h1 style="margin:0 0 8px;font-size:28px;font-weight:900;color:#1a1a2e;letter-spacing:-1px;">
      Bienvenido a ${PROJECT_NAME}
    </h1>
    <p style="margin:0 0 24px;font-size:14px;color:#666;line-height:1.6;">
      Hola <strong>${displayName}</strong>, tu cuenta ha sido creada en la plataforma ${PROJECT_NAME}.
    </p>
    <p style="margin:0 0 32px;font-size:14px;color:#444;line-height:1.7;">
      Para activar tu cuenta y establecer tu contraseña, haz clic en el botón a continuación.
      Este enlace expirará en <strong>24 horas</strong>.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
      <tr>
        <td style="background:#1a1a2e;border-radius:8px;padding:16px 32px;">
          <a href="${resetUrl}" style="color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.5px;">
            Activar mi cuenta →
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:12px;color:#999;line-height:1.6;">
      Si no puedes hacer clic en el botón, copia y pega esta URL en tu navegador:<br/>
      <span style="color:#1a1a2e;word-break:break-all;">${resetUrl}</span>
    </p>
  `

  await transporter.sendMail({
    from: `"${PROJECT_NAME}" <${process.env.GMAIL_USER}>`,
    to,
    subject: `Activa tu cuenta — ${PROJECT_NAME}`,
    html: baseTemplate(content),
  })
}

export async function sendPasswordResetEmail(to: string, name: string | null, resetUrl: string) {
  const displayName = name ?? to

  const content = `
    <h1 style="margin:0 0 8px;font-size:28px;font-weight:900;color:#f95f2b;letter-spacing:-1px;">
      Restablecer contraseña
    </h1>
    <p style="margin:0 0 24px;font-size:14px;color:#666;line-height:1.6;">
      Hola <strong>${displayName}</strong>, recibimos una solicitud para restablecer la contraseña de tu cuenta.
    </p>
    <p style="margin:0 0 32px;font-size:14px;color:#444;line-height:1.7;">
      Haz clic en el botón a continuación para crear una nueva contraseña.
      Este enlace expirará en <strong>24 horas</strong>.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
      <tr>
        <td style="background:#f95f2b;border-radius:8px;padding:16px 32px;">
          <a href="${resetUrl}" style="color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.5px;">
            Crear nueva contraseña →
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 16px;font-size:12px;color:#999;">
      Si no solicitaste este cambio, puedes ignorar este correo. Tu contraseña no cambiará.
    </p>
    <p style="margin:0;font-size:12px;color:#999;line-height:1.6;">
      Si no puedes hacer clic en el botón, copia y pega esta URL:<br/>
      <span style="color:#1a1a2e;word-break:break-all;">${resetUrl}</span>
    </p>
  `

  await transporter.sendMail({
    from: `"${PROJECT_NAME}" <${process.env.GMAIL_USER}>`,
    to,
    subject: `Restablece tu contraseña — ${PROJECT_NAME}`,
    html: baseTemplate(content),
  })
}
