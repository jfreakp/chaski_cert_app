import 'server-only'
import { Prisma } from '@/app/generated/prisma/client'
import { prisma } from './prisma'

interface AuditLogData {
  action: string
  entityType: string
  entityId?: string
  metadata?: Record<string, unknown>
  userId?: string
}

export function createAuditLog(data: AuditLogData): void {
  const { userId, metadata, ...rest } = data
  const createData: Prisma.AuditLogUncheckedCreateInput = {
    ...rest,
    ...(metadata !== undefined ? { metadata: metadata as Prisma.InputJsonValue } : {}),
    ...(userId !== undefined ? { userId } : {}),
  }
  prisma.auditLog.create({ data: createData }).catch(() => {})
}
