// ============================================================
// LAPISAN DATA SUPABASE (dengan Mode Demo Terintegrasi)
// ------------------------------------------------------------
// Jika env VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY tersedia,
// aplikasi terhubung ke Supabase sungguhan (Auth + PostgreSQL +
// Realtime). Tanpa env, aktif "Demo Mode": mesin query lokal
// dengan API yang identik (auth, select/insert/update/delete,
// realtime stub) dan data contoh realistis Kota Palembang —
// seluruh aplikasi tetap berfungsi penuh untuk uji coba.
// ============================================================

import { createClient } from '@supabase/supabase-js';
import {
  hitungZScore, kategoriGizi, cekKenaikan, medianWFA, sdWFA,
  medianHFA, sdHFA, medianLK, sdLK,
} from './antropometri';
import { tanggalISO, nBulanLalu } from './utils';
import { JADWAL_IMUNISASI } from './types';
import type { AntropometriLog, Bayi, IbuHamil, Imunisasi, Profile } from './types';

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const isDemoMode = !(URL && KEY);

// ============================================================
// 1. MODE DEMO — Database lokal (localStorage)
// ============================================================
const DB_KEY = 'pdp_db_v1';
const SES_KEY = 'pdp_session_v1';

interface DB {
  profiles: Profile[];
  ibu_hamil: IbuHamil[];
  bayi: Bayi[];
  antropometri_logs: AntropometriLog[];
  imunisasi: Imunisasi[];
}

function uid(): string {
  return 'id-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

// ---------- Generator data contoh (deterministik) ----------
function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NAMA_L = ['Muhammad Rafa', 'Alif Saputra', 'Bima Ardiansyah', 'Dimas Prasetyo', 'Fadil Maulana', 'Hafiz Al-Ghozali', 'Lutfi Hakim', 'Naufal Rizky', 'Putra Ramadhan', 'Rizky Ananda', 'Tegar Saputra', 'Umar Fauzi', 'Wahyu Hidayat', 'Yusuf Maulana', 'Zaki Firmansyah', 'Akbar Maulana'];
const NAMA_P = ['Aisyah Putri', 'Nayla Azzahra', 'Zahra Ramadhani', 'Cahaya Ningsih', 'Eka Lestari', 'Gita Puspita', 'Intan Permata', 'Kirana Dewi', 'Maya Sari', 'Oktavia Salsabila', 'Qori Amelia', 'Salsabila Zahra', 'Vina Oktarina', 'Adinda Rahma', 'Balqis Azkia', 'Cantika Ayu', 'Dini Rahayu', 'Fatin Nabila'];
const NAMA_IBU = ['Rina Marlina', 'Sari Wulandari', 'Dewi Anggraini', 'Fitri Handayani', 'Leni Susanti', 'Mega Puspita', 'Nur Aini', 'Ratna Sari', 'Sri Wahyuni', 'Tuti Alawiyah', 'Yuli Astuti', 'Zainab Abdullah', 'Indah Lestari', 'Putri Melati', 'Winda Oktarina', 'Hesti Pratiwi'];
const WILAYAH = [
  { kec: 'Ilir Barat I', kel: '30 Ilir' }, { kec: 'Ilir Barat I', kel: 'Bukit Lama' },
  { kec: 'Ilir Timur I', kel: '20 Ilir' }, { kec: 'Ilir Timur I', kel: 'Kapuk' },
  { kec: 'Sukarami', kel: 'Talang Betutu' }, { kec: 'Sukarami', kel: 'Sukabangun' },
  { kec: 'Plaju', kel: 'Plaju Ulu' }, { kec: 'Kertapati', kel: 'Kertapati' },
  { kec: 'Gandus', kel: 'Gandus' }, { kec: 'Kalidoni', kel: 'Sei Selincah' },
  { kec: 'Sako', kel: 'Sako Baru' }, { kec: 'Alang-Alang Lebar', kel: 'Alang-Alang Lebar' },
  { kec: 'Kemuning', kel: 'Pahlawan' }, { kec: 'Seberang Ulu II', kel: '16 Ulu' },
];

function buildSeed(): DB {
  const rnd = mulberry32(20240817);
  const rand = (a: number, b: number) => a + rnd() * (b - a);
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];

  const profiles: Profile[] = [
    { id: 'u-kader', full_name: 'Siti Aminah', role: 'kader', phone: '0812-7001-2345', kelurahan: '30 Ilir', kecamatan: 'Ilir Barat I', puskesmas: 'Puskesmas Pembantu 30 Ilir', address: 'Jl. KH. Ahmad Dahlan No. 12' },
    { id: 'u-kader2', full_name: 'Nur Halimah', role: 'kader', phone: '0813-7002-8890', kelurahan: 'Plaju Ulu', kecamatan: 'Plaju', puskesmas: 'Puskesmas Plaju', address: 'Jl. Kompol H. Bari No. 45' },
    { id: 'u-bidan', full_name: 'Bidan Dewi Lestari', role: 'bidan', phone: '0811-7788-1234', kelurahan: 'Talang Betutu', kecamatan: 'Sukarami', puskesmas: 'Puskesmas Talang Betutu', address: 'Jl. Letda Mgs. S. Karim No. 8' },
    { id: 'u-admin', full_name: 'dr. Andi Pratama, MKM', role: 'admin', phone: '0711-351-666', kelurahan: 'Demang Lebar Daun', kecamatan: 'Ilir Barat I', puskesmas: 'Dinas Kesehatan Kota Palembang', address: 'Jl. Merdeka No. 21 Palembang' },
  ];

  const bayi: Bayi[] = [];
  const logs: AntropometriLog[] = [];
  const imunisasi: Imunisasi[] = [];
  const ibu: IbuHamil[] = [];
  const now = new Date();

  for (let i = 0; i < 32; i++) {
    const jk: 'L' | 'P' = rnd() < 0.52 ? 'L' : 'P';
    const nama = jk === 'L' ? pick(NAMA_L) : pick(NAMA_P);
    const wilayah = pick(WILAYAH);
    const kaderId = rnd() < 0.78 ? 'u-kader' : 'u-kader2';
    const usiaBln = rand(2, 57);
    const tglLahir = tanggalISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() - Math.round(usiaBln * 30.4375)));
    const anakId = uid();

    // Trajektori pertumbuhan (distribusi menyerupai data riil)
    const t = rnd();
    let traj: { wfa: number; hfa: number; stagnan?: boolean };
    if (t < 0.56) traj = { wfa: rand(-0.7, 0.7), hfa: rand(-0.9, 0.4) };
    else if (t < 0.74) traj = { wfa: rand(-2.1, -1.5), hfa: rand(-1.7, -1.1) };
    else if (t < 0.9) traj = { wfa: rand(-2.0, -1.2), hfa: rand(-3.0, -2.4) };
    else traj = { wfa: rand(-3.4, -2.7), hfa: rand(-2.6, -1.8), stagnan: rnd() < 0.45 };

    bayi.push({
      id: anakId, nama, nama_ortu: pick(NAMA_IBU),
      jenis_kelamin: jk, tgl_lahir: tglLahir,
      bb_lahir: Math.round(rand(2.4, 3.8) * 100) / 100,
      tb_lahir: Math.round(rand(46, 52) * 10) / 10,
      kelurahan: wilayah.kel, kecamatan: wilayah.kec,
      kader_id: kaderId, alamat: 'RT ' + Math.ceil(rand(1, 20)) + ' / RW ' + Math.ceil(rand(1, 6)),
    });

    const logsAnak: AntropometriLog[] = [];
    const baseAge = usiaBulanFloatRef(tglLahir, now);

    for (let m = 5; m >= 0; m--) {
      const ageAt = baseAge - m;
      if (ageAt < 0.2) continue;
      const tgl = nBulanLalu(m);
      const zWfa = traj.wfa + rand(-0.28, 0.28);
      const zHfa = traj.hfa + rand(-0.28, 0.28);
      let bb = medianWFA(jk, ageAt) + sdWFA(jk, ageAt) * zWfa;
      let tb = medianHFA(jk, ageAt) + sdHFA(jk, ageAt) * zHfa;
      let lk = medianLK(jk, ageAt) + sdLK(jk, ageAt) * (zHfa + 0.35 + rand(-0.3, 0.3));
      if (traj.stagnan && m === 0) bb = bb - rand(0.3, 0.6); // berat turun → "T"
      bb = Math.round(bb * 100) / 100;
      tb = Math.round(tb * 10) / 10;
      lk = Math.round(lk * 10) / 10;

      const z = hitungZScore({ jenis_kelamin: jk, tgl_lahir: tglLahir }, bb, tb, lk, tgl);
      const kat = kategoriGizi(z);
      const prev = logsAnak[logsAnak.length - 1];
      const selisihHari = prev ? Math.max((new Date(tgl).getTime() - new Date(prev.tanggal).getTime()) / 86400000, 1) : 30;
      const knk = cekKenaikan(ageAt, bb, prev?.bb, selisihHari).kenaikan;

      logsAnak.push({
        id: uid(), anak_id: anakId, tanggal: tgl, bb, tb, lk,
        z, status: kat.status, kenaikan: knk,
        validated_by: null, validated_at: null, created_by: kaderId,
      });
    }
    // Validasi oleh bidan (sebagian besar log sudah divalidasi)
    const pendingLatest = rnd() < 0.34;
    logsAnak.forEach((lg, idx) => {
      const isLatest = idx === logsAnak.length - 1;
      if (!(isLatest && pendingLatest)) {
        lg.validated_by = 'u-bidan';
        lg.validated_at = lg.tanggal + 'T09:00:00';
      }
    });
    logs.push(...logsAnak);

    // Imunisasi sesuai jadwal & usia
    for (const v of JADWAL_IMUNISASI) {
      const due = v.bulan;
      if (baseAge >= due && rnd() < 0.9) {
        const tglVaksin = new Date(tglLahir + 'T00:00:00');
        tglVaksin.setMonth(tglVaksin.getMonth() + due);
        tglVaksin.setDate(tglVaksin.getDate() + Math.floor(rand(0, 20)));
        if (tglVaksin.getTime() > now.getTime()) tglVaksin.setTime(now.getTime() - 86400000);
        imunisasi.push({ id: uid(), anak_id: anakId, vaksin: v.nama, tanggal: tanggalISO(tglVaksin), status: 'completed', diberikan_oleh: rnd() < 0.5 ? 'u-bidan' : kaderId });
      } else {
        imunisasi.push({ id: uid(), anak_id: anakId, vaksin: v.nama, tanggal: null, status: 'pending' });
      }
    }
  }

  for (let i = 0; i < 14; i++) {
    const wilayah = pick(WILAYAH);
    const lila = Math.round(rand(19.8, 32) * 10) / 10;
    ibu.push({
      id: uid(), nama: pick(NAMA_IBU),
      nik: '1671' + String(Math.floor(rand(1e10, 9.999e10))).padStart(11, '0'),
      usia_kehamilan: Math.round(rand(6, 39)),
      tgl_periksa: nBulanLalu(Math.floor(rand(0, 2)), Math.ceil(rand(1, 28))),
      lila,
      status: lila < 21.5 ? 'Risiko Tinggi' : lila < 23.5 ? 'KEK' : 'Normal',
      anc_count: Math.round(rand(1, 6)),
      kelurahan: wilayah.kel, kecamatan: wilayah.kec,
      kader_id: rnd() < 0.78 ? 'u-kader' : 'u-kader2',
      alamat: 'RT ' + Math.ceil(rand(1, 20)) + ' / RW ' + Math.ceil(rand(1, 6)),
    });
  }

  return { profiles, ibu_hamil: ibu, bayi, antropometri_logs: logs, imunisasi };
}

function usiaBulanFloatRef(tglLahir: string, ref: Date): number {
  const lahir = new Date(tglLahir + 'T00:00:00');
  return (ref.getTime() - lahir.getTime()) / (30.4375 * 24 * 3600 * 1000);
}

// ---------- Persistensi ----------
function loadDB(): DB {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw) as DB;
  } catch { /* abaikan */ }
  const db = buildSeed();
  saveDB(db);
  return db;
}

function saveDB(db: DB) {
  try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch { /* abaikan */ }
}

export function resetDemoData() {
  localStorage.removeItem(DB_KEY);
  const db = buildSeed();
  saveDB(db);
}

// ---------- Mesin query tiruan (API identik dengan Supabase) ----------
type Row = Record<string, any>;

class MockTable implements PromiseLike<{ data: any; error: null }> {
  private filters: Array<(r: Row) => boolean> = [];
  private sortCol: string | null = null;
  private sortAsc = true;
  private limitN: number | null = null;
  private singleMode = false;
  private staged: Row[] | null = null;
  private op: 'insert' | 'upsert' | 'update' | 'delete' | null = null;
  private payload: any = null;

  constructor(private table: string, private db: DB) {}

  select(_cols?: string) { return this; }
  eq(col: string, v: any) { this.filters.push((r) => r[col] === v); return this; }
  neq(col: string, v: any) { this.filters.push((r) => r[col] !== v); return this; }
  in(col: string, vals: any[]) { this.filters.push((r) => vals.includes(r[col])); return this; }
  gte(col: string, v: any) { this.filters.push((r) => r[col] >= v); return this; }
  lte(col: string, v: any) { this.filters.push((r) => r[col] <= v); return this; }
  contains(col: string, v: any) { this.filters.push((r) => String(r[col] ?? '').toLowerCase().includes(String(v).toLowerCase())); return this; }
  order(col: string, opts?: { ascending?: boolean }) { this.sortCol = col; this.sortAsc = opts?.ascending ?? true; return this; }
  limit(n: number) { this.limitN = n; return this; }
  maybeSingle() { this.singleMode = true; return this; }
  single() { this.singleMode = true; return this; }

  insert(rows: any | any[]) { this.op = 'insert'; this.payload = rows; return this; }
  upsert(rows: any | any[]) { this.op = 'upsert'; this.payload = rows; return this; }
  update(payload: any) { this.op = 'update'; this.payload = payload; return this; }
  delete() { this.op = 'delete'; return this; }

  private execute(): { data: any; error: null } {
    const tbl: Row[] = (this.db as any)[this.table] ?? [];

    if (this.op === 'insert') {
      const arr = (Array.isArray(this.payload) ? this.payload : [this.payload]).map((r: Row) => ({ ...r, id: r.id ?? uid() }));
      (this.db as any)[this.table] = [...tbl, ...arr];
      saveDB(this.db);
      this.staged = arr;
    } else if (this.op === 'upsert') {
      const arr = Array.isArray(this.payload) ? this.payload : [this.payload];
      arr.forEach((r: Row) => {
        const idx = tbl.findIndex((x) => x.id === r.id);
        const row = { ...r, id: r.id ?? uid() };
        if (idx >= 0) tbl[idx] = row; else tbl.push(row);
      });
      saveDB(this.db);
      this.staged = arr;
    } else if (this.op === 'update') {
      const matched = tbl.filter((r) => this.filters.every((f) => f(r)));
      matched.forEach((r) => Object.assign(r, this.payload));
      saveDB(this.db);
      this.staged = matched;
    } else if (this.op === 'delete') {
      const keep = tbl.filter((r) => !this.filters.some((f) => f(r)));
      (this.db as any)[this.table] = keep;
      saveDB(this.db);
      return { data: [], error: null };
    }

    let rows: Row[] = this.staged ? [...this.staged] : tbl;
    for (const f of this.filters) rows = rows.filter(f);
    if (this.sortCol) {
      rows = [...rows].sort((a, b) => {
        const av = a[this.sortCol!]; const bv = b[this.sortCol!];
        if (av == null && bv == null) return 0;
        if (av == null) return 1; if (bv == null) return -1;
        const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
        return this.sortAsc ? cmp : -cmp;
      });
    }
    if (this.limitN != null) rows = rows.slice(0, this.limitN);
    if (this.singleMode) return { data: rows[0] ?? null, error: null };
    return { data: rows, error: null };
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((v: any) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((r: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }
}

// ---------- Auth tiruan ----------
const AUTH_USERS = [
  { id: 'u-kader', email: 'kader@posyandu.id', password: 'kader123', full_name: 'Siti Aminah', role: 'kader' },
  { id: 'u-kader2', email: 'kader2@posyandu.id', password: 'kader123', full_name: 'Nur Halimah', role: 'kader' },
  { id: 'u-bidan', email: 'bidan@posyandu.id', password: 'bidan123', full_name: 'Bidan Dewi Lestari', role: 'bidan' },
  { id: 'u-admin', email: 'admin@dinkes.id', password: 'admin123', full_name: 'dr. Andi Pratama, MKM', role: 'admin' },
];

interface MockSession { access_token: string; user: { id: string; email: string; user_metadata: any }; expires_at: number; }

function readSession(): MockSession | null {
  try {
    const raw = localStorage.getItem(SES_KEY);
    if (raw) {
      const s = JSON.parse(raw) as MockSession;
      if (s.expires_at > Date.now() / 1000) return s;
    }
  } catch { /* abaikan */ }
  return null;
}

const authListeners = new Set<(event: string, session: MockSession | null) => void>();
function emitAuth(session: MockSession | null) { authListeners.forEach((l) => l('SIGNED_IN', session)); }

const mockAuth = {
  async signInWithPassword({ email, password }: { email: string; password: string }) {
    const found = AUTH_USERS.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!found || found.password !== password) {
      return { data: { user: null, session: null }, error: { message: 'Email atau kata sandi salah. Coba lagi ya!' } };
    }
    const session: MockSession = {
      access_token: 'mock-token-' + found.id,
      user: { id: found.id, email: found.email, user_metadata: { full_name: found.full_name, role: found.role } },
      expires_at: Date.now() / 1000 + 60 * 60 * 24 * 7,
    };
    localStorage.setItem(SES_KEY, JSON.stringify(session));
    emitAuth(session);
    return { data: { user: session.user, session }, error: null };
  },
  async signOut() {
    localStorage.removeItem(SES_KEY);
    emitAuth(null);
    return { error: null };
  },
  async getSession() {
    return { data: { session: readSession() }, error: null };
  },
  onAuthStateChange(cb: (event: string, session: MockSession | null) => void) {
    authListeners.add(cb);
    const s = readSession();
    if (s) cb('INITIAL_SESSION', s);
    return { data: { subscription: { unsubscribe: () => authListeners.delete(cb) } } };
  },
};

// ---------- Realtime tiruan ----------
function mockChannel() {
  return {
    on() { return this as any; },
    subscribe(cb?: (status: string) => void) { cb?.('SUBSCRIBED'); return this as any; },
    unsubscribe() { return this as any; },
  };
}

function createMockSupabase() {
  const db = loadDB();
  return {
    auth: mockAuth,
    from(table: string) {
      return new MockTable(table, db);
    },
    channel() { return mockChannel(); },
    removeChannel() { return Promise.resolve(); },
  };
}

// ============================================================
// 2. EKSPOR KLIEN
// ============================================================
export const supabase: any = isDemoMode
  ? createMockSupabase()
  : createClient(URL!, KEY!, { auth: { persistSession: true, autoRefreshToken: true } });
