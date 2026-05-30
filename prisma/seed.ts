import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../app/generated/prisma/client'
import bcrypt from 'bcryptjs'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Iniciando seed...')

  const SALT_ROUNDS = 10

  // ── Instituciones ────────────────────────────────────────────────────────────
  const institutions = [
    {
      name: 'Universidad Técnica Particular de Loja',
      code: 'UTPL',
      country: 'Ecuador',
    },
    {
      name: 'Universidad Nacional de Loja',
      code: 'UNL',
      country: 'Ecuador',
    },
  ]

  const createdInstitutions: Record<string, string> = {}

  for (const inst of institutions) {
    const created = await prisma.institution.upsert({
      where: { code: inst.code },
      update: { name: inst.name, country: inst.country },
      create: inst,
    })
    createdInstitutions[inst.code] = created.id
    console.log(`🏛  ${inst.code.padEnd(6)} → ${inst.name}`)
  }

  // ── Usuarios ─────────────────────────────────────────────────────────────────
  const users = [
    {
      email: 'admin@chaskicert.com',
      password: await bcrypt.hash('Admin123!', SALT_ROUNDS),
      role: 'ADMIN' as const,
      institutionId: null,
    },
    {
      email: 'utpl@universidad.edu.ec',
      password: await bcrypt.hash('University123!', SALT_ROUNDS),
      role: 'UNIVERSITY' as const,
      institutionId: createdInstitutions['UTPL'],
    },
    {
      email: 'unl@universidad.edu.ec',
      password: await bcrypt.hash('University123!', SALT_ROUNDS),
      role: 'UNIVERSITY' as const,
      institutionId: createdInstitutions['UNL'],
    },
  ]

  for (const user of users) {
    const created = await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: user,
    })
    console.log(`✅ ${created.role.padEnd(12)} → ${created.email}`)
  }

  console.log('\n🎉 Seed completado.\n')
  console.log('Credenciales de prueba:')
  console.log('────────────────────────────────────────────────────────')
  console.log('ADMIN      │ admin@chaskicert.com      │ Admin123!')
  console.log('UNIVERSITY │ utpl@universidad.edu.ec   │ University123!')
  console.log('UNIVERSITY │ unl@universidad.edu.ec    │ University123!')
  console.log('────────────────────────────────────────────────────────')
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await pool.end()
  })
