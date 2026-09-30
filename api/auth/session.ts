import type { VercelRequest, VercelResponse } from '@vercel/node';
import { describeError, isConfigError, readCookie, verifySession } from '../_lib';

// GET /api/auth/session → { data: { session: { user } | null } }
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }
  try {
    const token = readCookie(req);
    const user = await verifySession(token);
    return res.status(200).json({ data: { session: user ? { user } : null }, error: null });
  } catch (e) {
    console.error('[session]', e);
    // Mis-konfigurasi server harus kelihatan jelas, bukan disamarkan jadi "belum login".
    if (isConfigError(e)) {
      return res.status(500).json({
        data: { session: null },
        error: { message: describeError(e, 'Kesalahan server.') },
      });
    }
    return res.status(200).json({ data: { session: null }, error: null });
  }
}
