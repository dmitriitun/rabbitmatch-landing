import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { setSessionCookie, signSession, verifyPassword } from '@/lib/auth';

type UserRow = {
  id: number;
  email: string;
  password_hash: string;
  role: string;
  is_admin: boolean;
};

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const email = typeof (body as { email?: unknown }).email === 'string'
    ? ((body as { email: string }).email).trim().toLowerCase()
    : '';
  const password = typeof (body as { password?: unknown }).password === 'string'
    ? (body as { password: string }).password
    : '';

  if (!email || !password) {
    return NextResponse.json({ error: 'missing_credentials' }, { status: 400 });
  }

  const { rows } = await query<UserRow>(
    'SELECT id, email, password_hash, role, is_admin FROM users WHERE email = $1 LIMIT 1',
    [email],
  );

  const user = rows[0];
  if (!user) {
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });
  }

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) {
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });
  }

  const token = await signSession({
    uid: user.id,
    email: user.email,
    role: user.role,
    isAdmin: user.is_admin === true,
  });
  await setSessionCookie(token);

  return NextResponse.json({
    ok: true,
    user: { id: user.id, email: user.email, role: user.role, isAdmin: user.is_admin === true },
  });
}
