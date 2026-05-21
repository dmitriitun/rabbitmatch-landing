import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET(): Promise<Response> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null });
  }
  return NextResponse.json({
    user: {
      uid: session.uid,
      email: session.email,
      role: session.role,
      isAdmin: session.isAdmin,
    },
  });
}
