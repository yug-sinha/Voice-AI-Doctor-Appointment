import { NextRequest, NextResponse } from 'next/server'

const COOKIE_NAME = 'app_auth'

export async function GET(request: NextRequest) {
  const authorized = request.cookies.get(COOKIE_NAME)?.value === 'verified'
  return NextResponse.json({ authorized })
}
