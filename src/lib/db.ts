// ============================================================
// LAPISAN DATA — Client API
// ------------------------------------------------------------
// Aplikasi memanggil /api/* (Vercel Serverless Functions) yang
// koneksi ke Neon PostgreSQL. DATABASE_URL HANYA ada di server
// (env var Vercel tanpa prefix VITE_) → tidak pernah terekspos
// di browser.
//
// `npm run dev` tidak butuh server: vite plugin (devServer.ts)
// melayani /api/* dengan mock database in-memory.
// ============================================================

import type { Op, QueryResult } from './mockDb';

const BASE = '/api';

// ---------- Util fetch ----------
async function post<T = any>(path: string, body: any): Promise<T> {
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'include',
    });
  } catch (e: any) {
    // Network-level failure (CORS, server tidak respond, offline)
    throw { message: `Tidak bisa terhubung ke server (${BASE}${path}). Cek koneksi atau konfigurasi deployment.` };
  }

  // Baca body mentah dulu — bisa JSON atau HTML (mis. 404 page)
  const raw = await res.text();
  let json: any;
  try {
    json = JSON.parse(raw);
  } catch {
    // Response bukan JSON → kemungkinan endpoint belum ada (404 HTML page)
    const hint = res.status === 404
      ? `Endpoint /api tidak ditemukan (404). Pastikan folder "api/" ikut ter-deploy dan env DATABASE_URL + AUTH_SECRET sudah diset di Vercel.`
      : `Server merespons HTTP ${res.status} dengan format non-JSON.`;
    throw { message: hint };
  }
  if (!res.ok && !json.error) json = { error: { message: `HTTP ${res.status}` } };
  return json as T;
}

async function get<T = any>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(BASE + path, { credentials: 'include' });
  } catch {
    return { data: { session: null } } as any;
  }
  const raw = await res.text();
  let json: any;
  try { json = JSON.parse(raw); } catch { json = { data: { session: null } }; }
  return json as T;
}

// ---------- Klien query (mirip builder Supabase, tapi via HTTP) ----------
export class HttpTable implements PromiseLike<QueryResult> {
  private ops: Op[] = [];
  constructor(private table: string) {}

  select(cols = '*') { this.ops.push({ t: 'select', cols }); return this; }
  eq(col: string, v: any) { this.ops.push({ t: 'eq', col, v }); return this; }
  neq(col: string, v: any) { this.ops.push({ t: 'neq', col, v }); return this; }
  in(col: string, vals: any[]) { this.ops.push({ t: 'in', col, v: vals }); return this; }
  gte(col: string, v: any) { this.ops.push({ t: 'gte', col, v }); return this; }
  lte(col: string, v: any) { this.ops.push({ t: 'lte', col, v }); return this; }
  contains(col: string, v: any) { this.ops.push({ t: 'contains', col, v }); return this; }
  order(col: string, opts?: { ascending?: boolean }) { this.ops.push({ t: 'order', col, ascending: opts?.ascending ?? true }); return this; }
  limit(n: number) { this.ops.push({ t: 'limit', n }); return this; }
  single() { this.ops.push({ t: 'single' }); return this; }
  maybeSingle() { this.ops.push({ t: 'maybeSingle' }); return this; }

  insert(rows: any | any[]) { this.ops.push({ t: 'insert', payload: rows }); return this; }
  upsert(rows: any | any[]) { this.ops.push({ t: 'upsert', payload: rows }); return this; }
  update(payload: any) { this.ops.push({ t: 'update', payload }); return this; }
  delete() { this.ops.push({ t: 'delete' }); return this; }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((v: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((r: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return post<QueryResult>('/query', { table: this.table, ops: this.ops }).then(onfulfilled, onrejected);
  }
}

// ---------- Auth client ----------
interface SessionUser { id: string; email: string }
type AuthListener = (event: string, session: { user: SessionUser } | null) => void;
const authListeners = new Set<AuthListener>();

export function emitAuth(event: string, session: { user: SessionUser } | null) {
  authListeners.forEach((l) => l(event, session));
}

export async function resetDemoData() {
  try { await post('/dev/reset', {}); } catch { /* abaikan di production */ }
}

// ---------- Klien utama ----------
export const isDemoMode = import.meta.env.DEV;

export const db = {
  auth: {
    async signInWithPassword({ email, password }: { email: string; password: string }) {
      try {
        const r = await post<{ data: { user: SessionUser | null; session: any }; error: any }>('/auth/login', { email, password });
        if (r.data?.user) emitAuth('SIGNED_IN', { user: r.data.user });
        return r;
      } catch (e: any) {
        return { data: { user: null, session: null }, error: { message: e?.message ?? 'Gagal masuk. Coba lagi.' } };
      }
    },
    async signOut() {
      try {
        const r = await post('/auth/logout', {});
        emitAuth('SIGNED_OUT', null);
        return r;
      } catch (e: any) {
        emitAuth('SIGNED_OUT', null);
        return { error: { message: e?.message } };
      }
    },
    async getSession() {
      return get<{ data: { session: { user: SessionUser } | null }; error: null }>('/auth/session');
    },
    onAuthStateChange(cb: AuthListener) {
      authListeners.add(cb);
      return { data: { subscription: { unsubscribe: () => authListeners.delete(cb) } } };
    },
  },
  from(table: string) { return new HttpTable(table); },
};
