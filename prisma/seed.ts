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

  const users = [
    {
      email: 'admin@chaskicert.com',
      password: await bcrypt.hash('Admin123!', SALT_ROUNDS),
      role: 'ADMIN' as const,
    },
    {
      email: 'emisor@universidad.edu',
      password: await bcrypt.hash('Emisor123!', SALT_ROUNDS),
      role: 'ISSUER' as const,
    },
  ]

  for (const user of users) {
    const created = await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: user,
    })
    console.log(`✅ ${created.role.padEnd(8)} → ${created.email}`)
  }

  console.log('\n🎉 Seed completado.\n')
  console.log('Credenciales de prueba:')
  console.log('─────────────────────────────────────────')
  console.log('ADMIN  │ admin@chaskicert.com   │ Admin123!')
  console.log('ISSUER │ emisor@universidad.edu │ Emisor123!')
  console.log('─────────────────────────────────────────')
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await pool.end()
  })
