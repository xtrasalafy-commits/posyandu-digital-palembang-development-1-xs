// ============================================================
// VITE DEV PLUGIN — /api/* di-serve dengan mock database
// ------------------------------------------------------------
// Saat `npm run dev`, semua permintaan ke /api/* ditangani
// di sini (in-memory mock DB) sehingga aplikasi bisa dicoba
// lengkap tanpa DATABASE_URL / server Neon.
// Di production, Vercel Serverless Functions (api/) yang
// melayani endpoint yang sama.
// ============================================================

import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import { buildSeed, executeOps } from './mockDb';
import type { DB, Op } from './mockDb';

const COOKIE = 'pdp_session';

const USERS: Array<{ id: string; email: string; password: string }> = [
  { id: 'u-kader', email: 'kader@posyandu.id', password: 'kader123' },
  { id: 'u-kader2', email: 'kader2@posyandu.id', password: 'kader123' },
  { id: 'u-bidan', email: 'bidan@posyandu.id', password: 'bidan123' },
  { id: 'u-admin', email: 'admin@dinkes.id', password: 'admin123' },
];

function readBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      try { resolve(JSON.parse(raw || '{}')); } catch { resolve({}); }
    });
  });
}

function send(res: ServerResponse, status: number, body: any) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function getCookie(req: IncomingMessage, name: string): string | undefined {
  const raw = req.headers.cookie ?? '';
  const found = raw.split(';').map((s) => s.trim()).find((s) => s.startsWith(name + '='));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : undefined;
}

function setCookie(res: ServerResponse, value: string) {
  res.setHeader('Set-Cookie', `${COOKIE}=${value}; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`);
}

export function devApi(): Plugin {
  let db: DB = buildSeed();

  return {
    name: 'pdp-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
        const url = req.url ?? '';
        if (!url.startsWith('/api/')) return next();

        const path = url.split('?')[0].replace(/\/$/, '');

        // ---------- AUTH ----------
        if (path === '/api/auth/login' && req.method === 'POST') {
          const { email, password } = await readBody(req);
          const user = USERS.find((u) => u.email.toLowerCase() === String(email ?? '').trim().toLowerCase() && u.password === password);
          if (!user) {
            return send(res, 200, { data: { user: null, session: null }, error: { message: 'Email atau kata sandi salah. Coba lagi ya!' } });
          }
          setCookie(res, encodeURIComponent(user.id));
          return send(res, 200, { data: { user: { id: user.id, email: user.email }, session: { user: { id: user.id, email: user.email } } }, error: null });
        }
        if (path === '/api/auth/logout' && req.method === 'POST') {
          res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; Max-Age=0`);
          return send(res, 200, { error: null });
        }
        if (path === '/api/auth/session' && req.method === 'GET') {
          const id = getCookie(req, COOKIE);
          const user = id ? USERS.find((u) => u.id === id) : undefined;
          return send(res, 200, { data: { session: user ? { user: { id: user.id, email: user.email } } : null }, error: null });
        }

        // ---------- DEV RESET ----------
        if (path === '/api/dev/reset' && req.method === 'POST') {
          db = buildSeed();
          return send(res, 200, { ok: true });
        }

        // ---------- QUERY ----------
        if (path === '/api/query' && req.method === 'POST') {
          const id = getCookie(req, COOKIE);
          if (!id || !USERS.some((u) => u.id === id)) {
            return send(res, 401, { data: null, error: { message: 'Belum login atau session habis.' } });
          }
          const { table, ops } = await readBody(req);
          if (!table || !/^[a-z_]+$/.test(table)) {
            return send(res, 400, { data: null, error: { message: 'Nama tabel tidak valid.' } });
          }
          try {
            const result = executeOps(db, table, ops as Op[]);
            return send(res, 200, result);
          } catch (e) {
            return send(res, 500, { data: null, error: { message: 'Kesalahan mock DB.' } });
          }
        }

        return next();
      });
    },
  };
}
