import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticate, setSessionCookie, signSession } from '../_lib';

// POST /api/auth/login  { email, password }
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }
  try {
    const email = String(req.body?.email ?? '').trim();
    const password = String(req.body?.password ?? '');

    if (!email || !password) {
      return res.status(200).json({
        data: { user: null, session: null },
        error: { message: 'Email atau kata sandi salah. Coba lagi ya!' },
      });
    }

    const user = await authenticate(email, password);
    if (!user) {
      return res.status(200).json({
        data: { user: null, session: null },
        error: { message: 'Email atau kata sandi salah. Coba lagi ya!' },
      });
    }

    const token = await signSession(user);
    const secure = ((req.headers['x-forwarded-proto'] as string) || 'http').startsWith('https');
    setSessionCookie(res, token, secure);

    return res.status(200).json({ data: { user, session: { user } }, error: null });
  } catch (e: any) {
    console.error('[login]', e);
    const msg = /DATABASE_URL belum diset/.test(e?.message ?? '')
      ? 'Server belum dikonfigurasi: DATABASE_URL belum diset.'
      : 'Kesalahan server. Coba lagi.';
    return res.status(500).json({ data: { user: null, session: null }, error: { message: msg } });
  }
}
