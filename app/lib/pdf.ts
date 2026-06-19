import 'server-only'
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib'
import QRCode from 'qrcode'
import { downloadTemplate } from './storage'

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

export interface CustomCertificatePdfData {
  studentName:    string
  verifyUrl:      string
  templateKey:    string
  nameX:          number
  nameY:          number
  nameFontSize:   number
  nameFontFamily: string  // nombre PostScript, ej. "Helvetica-Bold"
  nameColor:      string  // hex, ej. "#0d0d1e"
}

export async function generateCustomCertificatePdf(data: CustomCertificatePdfData): Promise<Uint8Array> {
  const buffer = await downloadTemplate(data.templateKey)
  const doc    = await PDFDocument.load(buffer)
  const pages  = doc.getPages()
  if (pages.length === 0) throw new Error('La plantilla PDF no contiene páginas.')
  const page   = pages[0]
  const font   = await doc.embedFont(data.nameFontFamily as StandardFonts)

  const hex = data.nameColor.replace('#', '')
  const r   = parseInt(hex.slice(0, 2), 16) / 255
  const g   = parseInt(hex.slice(2, 4), 16) / 255
  const b   = parseInt(hex.slice(4, 6), 16) / 255

  const textWidth = font.widthOfTextAtSize(data.studentName, data.nameFontSize)

  page.drawText(data.studentName, {
    x:     data.nameX - textWidth / 2,
    y:     data.nameY,
    size:  data.nameFontSize,
    font,
    color: rgb(r, g, b),
  })

  const { width } = page.getSize()
  const qrPngBuffer = await QRCode.toBuffer(data.verifyUrl, { width: 80, margin: 1 })
  const qrImage     = await doc.embedPng(qrPngBuffer)
  page.drawImage(qrImage, { x: width - 90, y: 20, width: 70, height: 70 })

  return doc.save()
}
