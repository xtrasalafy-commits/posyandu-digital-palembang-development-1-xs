import type { VercelRequest, VercelResponse } from '@vercel/node';
import { describeError, readCookie, runQuery, verifySession } from './_lib';
import type { Op } from '../src/lib/mockDb';

// POST /api/query  { table, ops[] }
// Semua query butuh session JWT yang valid (cookie HttpOnly).
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ data: null, error: { message: 'Method not allowed' } });
  }
  try {
    const user = await verifySession(readCookie(req));
    if (!user) {
      return res.status(401).json({ data: null, error: { message: 'Belum login atau session habis.' } });
    }

    const table = String(req.body?.table ?? '');
    const ops: Op[] = Array.isArray(req.body?.ops) ? req.body.ops : [];

    if (!table || !/^[a-z_]+$/.test(table)) {
      return res.status(400).json({ data: null, error: { message: 'Nama tabel tidak valid.' } });
    }

    const result = await runQuery(table, ops);
    return res.status(200).json(result);
  } catch (e: any) {
    console.error('[query]', e);
    return res.status(500).json({
      data: null,
      error: { message: describeError(e, 'Kesalahan server saat mengakses data.') },
    });
  }
}
