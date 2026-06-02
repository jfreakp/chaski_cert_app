import { createHash } from 'crypto'

export interface CertHashInput {
  id: string
  studentName: string
  studentDni: string
  careerName: string | null
  eventName: string
  eventDate: Date
  issuedAt: Date
  institutionName: string
  certificateTypeName: string
}

export function computeDataHash(input: CertHashInput): string {
  const canonical = [
    input.id,
    input.studentName,
    input.studentDni,
    input.careerName ?? '',
    input.eventName,
    input.eventDate.toISOString(),
    input.issuedAt.toISOString(),
    input.institutionName,
    input.certificateTypeName,
  ].join('|')
  return createHash('sha256').update(canonical).digest('hex')
}
