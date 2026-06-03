import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../app/generated/prisma/client'
import bcrypt from 'bcryptjs'
import { computeDataHash } from '../app/lib/certificate-hash'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Iniciando seed...')

  const SALT = 10

  // ── Instituciones ─────────────────────────────────────────────────────────────
  const utpl = await prisma.institution.upsert({
    where: { code: 'UTPL' },
    update: { name: 'Universidad Técnica Particular de Loja', country: 'Ecuador' },
    create: { name: 'Universidad Técnica Particular de Loja', code: 'UTPL', country: 'Ecuador' },
  })

  const unl = await prisma.institution.upsert({
    where: { code: 'UNL' },
    update: { name: 'Universidad Nacional de Loja', country: 'Ecuador' },
    create: { name: 'Universidad Nacional de Loja', code: 'UNL', country: 'Ecuador' },
  })

  console.log(`🏛  UTPL → ${utpl.name}`)
  console.log(`🏛  UNL  → ${unl.name}`)

  // ── Carreras ──────────────────────────────────────────────────────────────────
  const careerUtpl1 = await prisma.career.upsert({
    where: { name_institutionId: { name: 'Ingeniería en Sistemas Informáticos', institutionId: utpl.id } },
    update: {},
    create: { name: 'Ingeniería en Sistemas Informáticos', institutionId: utpl.id },
  })

  const careerUtpl2 = await prisma.career.upsert({
    where: { name_institutionId: { name: 'Administración de Empresas', institutionId: utpl.id } },
    update: {},
    create: { name: 'Administración de Empresas', institutionId: utpl.id },
  })

  const careerUnl1 = await prisma.career.upsert({
    where: { name_institutionId: { name: 'Medicina', institutionId: unl.id } },
    update: {},
    create: { name: 'Medicina', institutionId: unl.id },
  })

  const careerUnl2 = await prisma.career.upsert({
    where: { name_institutionId: { name: 'Derecho', institutionId: unl.id } },
    update: {},
    create: { name: 'Derecho', institutionId: unl.id },
  })

  console.log(`📚 UTPL: ${careerUtpl1.name}, ${careerUtpl2.name}`)
  console.log(`📚 UNL:  ${careerUnl1.name}, ${careerUnl2.name}`)

  // ── Usuarios ──────────────────────────────────────────────────────────────────
  const users = [
    {
      email: 'admin@chaskicert.com',
      password: await bcrypt.hash('Admin123!', SALT),
      role: 'ADMIN' as const,
      institutionId: null,
    },
    {
      email: 'utpl@universidad.edu.ec',
      password: await bcrypt.hash('University123!', SALT),
      role: 'UNIVERSITY' as const,
      institutionId: utpl.id,
    },
    {
      email: 'unl@universidad.edu.ec',
      password: await bcrypt.hash('University123!', SALT),
      role: 'UNIVERSITY' as const,
      institutionId: unl.id,
    },
  ]

  for (const u of users) {
    const created = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: u,
    })
    console.log(`✅ ${created.role.padEnd(12)} → ${created.email}`)
  }

  // ── Tipos de Certificado ─────────────────────────────────────────────────────
  const certTypes = [
    { name: 'Título de Grado', description: 'Certificado de graduación al terminar la carrera' },
    { name: 'Congreso', description: 'Certificado de participación en congresos y conferencias' },
    { name: 'Seminario', description: 'Certificado de asistencia a seminarios y talleres' },
    { name: 'Curso', description: 'Certificado de aprobación de cursos de capacitación' },
  ]

  for (const ct of certTypes) {
    await prisma.certificateType.upsert({
      where: { name: ct.name },
      update: {},
      create: ct,
    })
    console.log(`📜 Tipo → ${ct.name}`)
  }

  // ── Estudiantes ───────────────────────────────────────────────────────────────

  // Estudiante en ambas universidades con distintas carreras
  const maria = await prisma.student.upsert({
    where: { dni: '1101234567' },
    update: { name: 'María Fernanda Castro', email: 'mfcastro@mail.com' },
    create: { name: 'María Fernanda Castro', dni: '1101234567', email: 'mfcastro@mail.com' },
  })

  await prisma.studentEnrollment.upsert({
    where: { studentId_institutionId: { studentId: maria.id, institutionId: utpl.id } },
    update: {},
    create: { studentId: maria.id, institutionId: utpl.id, careerId: careerUtpl1.id },
  })

  await prisma.studentEnrollment.upsert({
    where: { studentId_institutionId: { studentId: maria.id, institutionId: unl.id } },
    update: {},
    create: { studentId: maria.id, institutionId: unl.id, careerId: careerUnl1.id },
  })

  // Estudiante solo en UTPL
  const juan = await prisma.student.upsert({
    where: { dni: '1109876543' },
    update: { name: 'Juan Carlos Pérez', email: 'jcperez@mail.com' },
    create: { name: 'Juan Carlos Pérez', dni: '1109876543', email: 'jcperez@mail.com' },
  })

  await prisma.studentEnrollment.upsert({
    where: { studentId_institutionId: { studentId: juan.id, institutionId: utpl.id } },
    update: {},
    create: { studentId: juan.id, institutionId: utpl.id, careerId: careerUtpl2.id },
  })

  // Estudiante solo en UNL
  const ana = await prisma.student.upsert({
    where: { dni: '1105554433' },
    update: { name: 'Ana Lucía Romero', email: 'alromero@mail.com' },
    create: { name: 'Ana Lucía Romero', dni: '1105554433', email: 'alromero@mail.com' },
  })

  await prisma.studentEnrollment.upsert({
    where: { studentId_institutionId: { studentId: ana.id, institutionId: unl.id } },
    update: {},
    create: { studentId: ana.id, institutionId: unl.id, careerId: careerUnl2.id },
  })

  console.log(`🎓 María Fernanda Castro → UTPL (${careerUtpl1.name}) + UNL (${careerUnl1.name})`)
  console.log(`🎓 Juan Carlos Pérez     → UTPL (${careerUtpl2.name})`)
  console.log(`🎓 Ana Lucía Romero      → UNL  (${careerUnl2.name})`)

  // ── Estudiantes de prueba para portal ────────────────────────────────────────
  const adminUser = await prisma.user.findUnique({ where: { email: 'admin@chaskicert.com' } })
  const utplUser  = await prisma.user.findUnique({ where: { email: 'utpl@universidad.edu.ec' } })

  const laura = await prisma.student.upsert({
    where: { dni: '9901111111' },
    update: { name: 'Laura Tapia Vargas', email: 'letawa2468@brixozu.com' },
    create: { name: 'Laura Tapia Vargas', dni: '9901111111', email: 'letawa2468@brixozu.com' },
  })

  await prisma.studentEnrollment.upsert({
    where: { studentId_institutionId: { studentId: laura.id, institutionId: utpl.id } },
    update: {},
    create: { studentId: laura.id, institutionId: utpl.id, careerId: careerUtpl1.id },
  })

  const diego = await prisma.student.upsert({
    where: { dni: '9902222222' },
    update: { name: 'Diego Paredes Ruiz', email: 'dp23r4w4j3@wnbaldwy.com' },
    create: { name: 'Diego Paredes Ruiz', dni: '9902222222', email: 'dp23r4w4j3@wnbaldwy.com' },
  })

  await prisma.studentEnrollment.upsert({
    where: { studentId_institutionId: { studentId: diego.id, institutionId: utpl.id } },
    update: {},
    create: { studentId: diego.id, institutionId: utpl.id, careerId: careerUtpl2.id },
  })

  // Proceso de prueba con certificados ISSUED para probar el portal
  const seminarioType = await prisma.certificateType.findUnique({ where: { name: 'Seminario' } })

  if (seminarioType && utplUser) {
    const processDate = new Date('2026-05-15')
    const issuedAt    = new Date('2026-05-20')

    const testProcess = await prisma.certificateProcess.upsert({
      where: { id: 'seed-test-process-portal-001' },
      update: { name: 'Seminario de Innovación Tecnológica 2026' },
      create: {
        id: 'seed-test-process-portal-001',
        name: 'Seminario de Innovación Tecnológica 2026',
        description: 'Proceso de prueba para portal de estudiantes',
        date: processDate,
        institutionId: utpl.id,
        certificateTypeId: seminarioType.id,
      },
    })

    const certsData = [
      { student: laura, career: careerUtpl1 },
      { student: diego, career: careerUtpl2 },
    ]

    for (const { student, career } of certsData) {
      const certId = `seed-cert-portal-${student.dni}`
      const dataHash = computeDataHash({
        id: certId,
        studentName: student.name,
        studentDni: student.dni,
        careerName: career.name,
        processName: testProcess.name,
        processDate,
        issuedAt,
        institutionName: utpl.name,
        certificateTypeName: seminarioType.name,
      })

      await prisma.certificate.upsert({
        where: { id: certId },
        update: { status: 'ISSUED', issuedAt, dataHash },
        create: {
          id: certId,
          status: 'ISSUED',
          dataHash,
          issuedAt,
          processId: testProcess.id,
          studentId: student.id,
          careerId: career.id,
          issuedById: utplUser.id,
        },
      })
    }

    console.log(`🧪 Laura Tapia Vargas  → letawa2468@brixozu.com  (cert ISSUED)`)
    console.log(`🧪 Diego Paredes Ruiz  → dp23r4w4j3@wnbaldwy.com (cert ISSUED)`)
  }

  console.log('\n🎉 Seed completado.\n')
  console.log('Credenciales:')
  console.log('──────────────────────────────────────────────────────────')
  console.log('ADMIN      │ admin@chaskicert.com      │ Admin123!')
  console.log('UNIVERSITY │ utpl@universidad.edu.ec   │ University123!')
  console.log('UNIVERSITY │ unl@universidad.edu.ec    │ University123!')
  console.log('──────────────────────────────────────────────────────────')
  console.log('\nPortal estudiantes (magic link):')
  console.log('──────────────────────────────────────────────────────────')
  console.log('letawa2468@brixozu.com   → Laura Tapia Vargas')
  console.log('dp23r4w4j3@wnbaldwy.com → Diego Paredes Ruiz')
  console.log('──────────────────────────────────────────────────────────')
}

main()
  .catch((e) => { console.error('❌ Error en seed:', e); process.exit(1) })
  .finally(async () => { await pool.end() })
