import type { VercelRequest, VercelResponse } from '@vercel/node';
import { clearSessionCookie } from '../_lib';

// POST /api/auth/logout
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const secure = ((req.headers['x-forwarded-proto'] as string) || 'http').startsWith('https');
  clearSessionCookie(res, secure);
  return res.status(200).json({ error: null });
}
