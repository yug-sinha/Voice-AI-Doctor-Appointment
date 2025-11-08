import { NextRequest, NextResponse } from 'next/server'

const COOKIE_NAME = 'app_auth'

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null)
  const password = payload?.password ?? ''
  const expectedPassword = process.env.APP_ACCESS_PASSWORD

  if (!expectedPassword) {
    return NextResponse.json(
      { success: false, message: 'Access password is not configured.' },
      { status: 500 }
    )
  }

  if (password !== expectedPassword) {
    return NextResponse.json(
      { success: false, message: 'Invalid password. Please try again.' },
      { status: 401 }
    )
  }

  const response = NextResponse.json({ success: true })

  response.cookies.set({
    name: COOKIE_NAME,
    value: 'verified',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 12, // 12 hours
    path: '/',
  })

  return response
}
