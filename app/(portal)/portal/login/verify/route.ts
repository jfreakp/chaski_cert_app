import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { createStudentSession } from '@/app/lib/student-session'

const encodedKey = new TextEncoder().encode(process.env.SESSION_SECRET)

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  if (!token) {
    return NextResponse.redirect(new URL('/portal/login', appUrl))
  }

  try {
    const { payload } = await jwtVerify(token, encodedKey, { algorithms: ['HS256'] })

    if (payload.type !== 'magic-link') throw new Error('Invalid token type')

    await createStudentSession(
      payload.studentId as string,
      payload.email as string,
      payload.name as string,
    )

    return NextResponse.redirect(new URL('/portal', appUrl))
  } catch {
    return NextResponse.redirect(new URL('/portal/login?expired=1', appUrl))
  }
}
