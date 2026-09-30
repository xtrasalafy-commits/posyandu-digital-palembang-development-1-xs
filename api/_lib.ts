// ============================================================
// API SERVER — Helper bersama (Vercel Serverless Functions)
// ------------------------------------------------------------
// - Koneksi Neon PostgreSQL via driver HTTP (@neondatabase/serverless)
// - Autentikasi: bcrypt (password) + JWT (session cookie HttpOnly)
// - DATABASE_URL & AUTH_SECRET HANYA ada di server (env var Vercel)
// ============================================================

import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { FilterOp, Op, QueryResult } from '../src/lib/mockDb';

export interface SessionUser { id: string; email: string }

const COOKIE_NAME = 'pdp_session';
const SEVEN_DAYS = 60 * 60 * 24 * 7;

let _sql: ReturnType<typeof neon> | null = null;
function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL belum diset di environment variables Vercel.');
  if (!_sql) _sql = neon(url);
  return _sql;
}

// ---------- JWT (HMAC-SHA256 via node:crypto — tanpa dependency eksternal) ----------
function getSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) {
    // Fallback agar tidak crash total; session akan hilang saat cold start
    console.warn('[AUTH] AUTH_SECRET belum diset — generate ephemeral secret (session tidak persisten antar cold start).');
    return 'ephemeral-' + randomToken();
  }
  return s;
}

function randomToken(): string {
  return createHmac('sha256', String(Date.now())).digest('base64url');
}

function b64url(input: string | Buffer): string {
  return Buffer.from(input as string).toString('base64url');
}

function b64urlDecodeToStr(s: string): string {
  return Buffer.from(s, 'base64url').toString('utf8');
}

function signature(data: string): string {
  return createHmac('sha256', getSecret()).update(data).digest('base64url');
}

export async function signSession(user: SessionUser): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({ sub: user.id, email: user.email, iat: now, exp: now + SEVEN_DAYS }));
  const signingInput = `${header}.${payload}`;
  return `${signingInput}.${signature(signingInput)}`;
}

export async function verifySession(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, sig] = parts;

  // Validasi signature (timing-safe compare)
  const expected = signature(`${header}.${payload}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const claims = JSON.parse(b64urlDecodeToStr(payload));
    if (typeof claims.sub !== 'string' || typeof claims.email !== 'string') return null;
    if (typeof claims.exp === 'number' && claims.exp < Math.floor(Date.now() / 1000)) return null;
    return { id: claims.sub, email: claims.email };
  } catch { return null; }
}

// ---------- Cookie ----------
export function setSessionCookie(res: VercelResponse, token: string, secure: boolean) {
  res.setHeader('Set-Cookie', [
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SEVEN_DAYS}${secure ? '; Secure' : ''}`,
  ].join(', '));
}

export function clearSessionCookie(res: VercelResponse, secure: boolean) {
  res.setHeader('Set-Cookie', [
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`,
  ].join(', '));
}

export function readCookie(req: VercelRequest): string | undefined {
  const raw = req.headers.cookie as string | undefined;
  if (!raw) return undefined;
  const found = raw.split(';').map((s) => s.trim()).find((s) => s.startsWith(COOKIE_NAME + '='));
  return found ? decodeURIComponent(found.slice(COOKIE_NAME.length + 1)) : undefined;
}

// ---------- Helper response ----------
export function sendJson(res: VercelResponse, status: number, body: any) {
  res.status(status).json(body);
}

// ---------- SQL builder: Op[] → SQL parameterized ----------

function quoteIdent(name: string): string {
  return '"' + name.replace(/"/g, '""') + '"';
}

export function buildSql(table: string, ops: Op[]): { text: string; values: any[] } {
  const q = quoteIdent(table);
  const params: any[] = [];
  const p = (v: any): string => {
    // object/array → jsonb
    if (v !== null && typeof v === 'object') {
      params.push(JSON.stringify(v));
      return `$${params.length}::jsonb`;
    }
    params.push(v);
    return `$${params.length}`;
  };

  const filters: FilterOp[] = [];
  let sortCol: string | null = null;
  let sortAsc = true;
  let limitN: number | null = null;
  let singleMode = false;
  let opKind: 'insert' | 'upsert' | 'update' | 'delete' | null = null;
  let payload: any = null;

  for (const op of ops) {
    switch (op.t) {
      case 'select': break;
      case 'single': case 'maybeSingle': singleMode = true; break;
      case 'order': sortCol = op.col; sortAsc = op.ascending; break;
      case 'limit': limitN = op.n; break;
      case 'insert': case 'upsert': case 'update': opKind = op.t; payload = op.payload; break;
      case 'delete': opKind = 'delete'; break;
      default: filters.push(op as FilterOp);
    }
  }

  const where = (): string => {
    if (!filters.length) return '';
    const parts = filters.map((f) => {
      const col = quoteIdent(f.col);
      switch (f.t) {
        case 'eq': return `${col} = ${p(f.v)}`;
        case 'neq': return `${col} <> ${p(f.v)}`;
        case 'gte': return `${col} >= ${p(f.v)}`;
        case 'lte': return `${col} <= ${p(f.v)}`;
        case 'in': return `${col} = ANY(${p(f.v)})`;
        case 'contains': return `${col}::text ILIKE ${p('%' + String(f.v) + '%')}`;
      }
    });
    return ' WHERE ' + parts.join(' AND ');
  };

  const orderBy = (): string => {
    if (!sortCol) return '';
    return ` ORDER BY ${quoteIdent(sortCol)} ${sortAsc ? 'ASC' : 'DESC'}`;
  };

  const limit = (): string => (limitN != null ? ` LIMIT ${Number(limitN)}` : '');

  let text: string;

  if (opKind === 'insert') {
    const rows = (Array.isArray(payload) ? payload : [payload]).map((r: any) => {
      // id null → biarkan default gen_random_uuid()
      const out = { ...r };
      if (out.id === null || out.id === undefined) delete out.id;
      return out;
    });
    const cols = Object.keys(rows[0] ?? {});
    const valuesSql = rows.map((r: any) => '(' + cols.map((c) => p(r[c])).join(', ') + ')').join(', ');
    text = `INSERT INTO ${q} (${cols.map(quoteIdent).join(', ')}) VALUES ${valuesSql} RETURNING *`;
  } else if (opKind === 'upsert') {
    const rows = (Array.isArray(payload) ? payload : [payload]).map((r: any) => {
      const out = { ...r };
      if (out.id === null || out.id === undefined) delete out.id;
      return out;
    });
    const cols = Object.keys(rows[0] ?? {});
    const valuesSql = rows.map((r: any) => '(' + cols.map((c) => p(r[c])).join(', ') + ')').join(', ');
    const conflictCols = cols.includes('id') ? '("id")' : '';
    const updates = cols.filter((c) => c !== 'id').map((c) => `${quoteIdent(c)} = EXCLUDED.${quoteIdent(c)}`).join(', ');
    text = `INSERT INTO ${q} (${cols.map(quoteIdent).join(', ')}) VALUES ${valuesSql}`
      + (conflictCols ? ` ON CONFLICT ${conflictCols} DO ${updates ? `UPDATE SET ${updates}` : 'NOTHING'}` : '')
      + ' RETURNING *';
  } else if (opKind === 'update') {
    const cols = Object.keys(payload ?? {}).filter((c) => payload[c] !== undefined);
    const sets = cols.map((c) => `${quoteIdent(c)} = ${p(payload[c])}`).join(', ');
    text = `UPDATE ${q} SET ${sets || "updated_at = now()"}${where()} RETURNING *`;
  } else if (opKind === 'delete') {
    text = `DELETE FROM ${q}${where()} RETURNING *`;
  } else {
    text = `SELECT * FROM ${q}${where()}${orderBy()}${limit()}`;
  }

  void singleMode; // single/maybeSingle: client yang handle (rows[0] ?? null)
  return { text, values: params };
}

// ---------- Konversi tipe (DATE / NUMERIC → format yang app harapkan) ----------
// pg/neon mem-parse:
//   - kolom DATE        → JS Date (tengah malam TZ lokal)
//   - kolom NUMERIC     → string (mis. "10.20") demi presisi
// App membutuhkan string 'YYYY-MM-DD' untuk tanggal dan number untuk bb/tb.
// Karena cols selalu '*' di app ini, kita konversi eksplisit per-tabel.
const TABLE_META: Record<string, { date: string[]; numeric: string[] }> = {
  users:               { date: [], numeric: [] },
  profiles:            { date: [], numeric: [] },
  bayi:                { date: ['tgl_lahir'], numeric: ['bb_lahir', 'tb_lahir'] },
  antropometri_logs:   { date: ['tanggal'], numeric: ['bb', 'tb', 'lk'] },
  imunisasi:           { date: ['tanggal'], numeric: [] },
  ibu_hamil:           { date: ['tgl_periksa'], numeric: ['lila'] },
};

function dateToISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function normalizeRows(table: string, rows: any[]): any[] {
  const meta = TABLE_META[table] ?? { date: [], numeric: [] };
  return rows.map((row) => {
    if (!row || typeof row !== 'object') return row;
    const out: Record<string, any> = {};
    for (const k of Object.keys(row)) {
      let v = row[k];
      if (v instanceof Date) {
        out[k] = dateToISO(v); // DATE & TIMESTAMPTZ → 'YYYY-MM-DD' / ISO-ish
      } else if (meta.numeric.includes(k) && v != null) {
        out[k] = typeof v === 'string' ? Number(v) : v;
      } else if (Array.isArray(v)) {
        out[k] = v.map((x) => (x instanceof Date ? dateToISO(x) : x));
      } else {
        out[k] = v;
      }
    }
    return out;
  });
}

// ---------- Eksekusi query ----------
export async function runQuery(table: string, ops: Op[]): Promise<QueryResult> {
  const { text, values } = buildSql(table, ops);
  // neon() hanya bisa dipanggil sebagai tagged-template; untuk query dinamis
  // dengan placeholder $1..$n, gunakan sql.query().
  const rows = await sql().query(text, values) as unknown as any[];
  const singleMode = ops.some((o) => o.t === 'single' || o.t === 'maybeSingle');
  const data = singleMode ? (rows[0] ?? null) : rows;
  const norm = data instanceof Array
    ? normalizeRows(table, data)
    : (data ? normalizeRows(table, [data])[0] : null);
  return { data: norm, error: null };
}

// ---------- Auth: login by email/password ----------
export async function authenticate(email: string, password: string): Promise<SessionUser | null> {
  const rows = await sql()`SELECT id, email, password_hash FROM public.users WHERE email = ${email.toLowerCase()} LIMIT 1` as unknown as any[];
  const user = rows[0];
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.password_hash as string);
  return ok ? { id: user.id as string, email: user.email as string } : null;
}
