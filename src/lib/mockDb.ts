// ============================================================
// MOCK DATABASE (untuk development tanpa server)
// ------------------------------------------------------------
// Database in-memory dengan API identik dengan server API
// (/api/query). Dipakai oleh vite dev plugin (devServer.ts)
// agar `npm run dev` langsung jalan tanpa DATABASE_URL.
// ============================================================

import {
  hitungZScore, kategoriGizi, cekKenaikan, medianWFA, sdWFA,
  medianHFA, sdHFA, medianLK, sdLK,
} from './antropometri';
import { tanggalISO, nBulanLalu } from './utils';
import { JADWAL_IMUNISASI } from './types';
import type { AntropometriLog, Bayi, IbuHamil, Imunisasi, Profile } from './types';

// ---------- Tipe data ----------
export interface DB {
  profiles: Profile[];
  ibu_hamil: IbuHamil[];
  bayi: Bayi[];
  antropometri_logs: AntropometriLog[];
  imunisasi: Imunisasi[];
}

export type FilterOp =
  | { t: 'eq' | 'neq' | 'gte' | 'lte' | 'contains'; col: string; v: any }
  | { t: 'in'; col: string; v: any[] };

export type Op =
  | { t: 'select'; cols?: string }
  | FilterOp
  | { t: 'order'; col: string; ascending: boolean }
  | { t: 'limit'; n: number }
  | { t: 'single' } | { t: 'maybeSingle' }
  | { t: 'insert' | 'upsert' | 'update'; payload: any }
  | { t: 'delete' };

export interface QueryResult { data: any; error: any }

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

export function uid(): string {
  return 'id-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function buildSeed(): DB {
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
      if (traj.stagnan && m === 0) bb = bb - rand(0.3, 0.6);
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
    const pendingLatest = rnd() < 0.34;
    logsAnak.forEach((lg, idx) => {
      const isLatest = idx === logsAnak.length - 1;
      if (!(isLatest && pendingLatest)) {
        lg.validated_by = 'u-bidan';
        lg.validated_at = lg.tanggal + 'T09:00:00';
      }
    });
    logs.push(...logsAnak);

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

// ---------- Eksekutor query (API identik dengan /api/query) ----------
function applyFilter(f: FilterOp, r: Record<string, any>): boolean {
  switch (f.t) {
    case 'eq': return r[f.col] === f.v;
    case 'neq': return r[f.col] !== f.v;
    case 'in': return f.v.includes(r[f.col]);
    case 'gte': return r[f.col] >= f.v;
    case 'lte': return r[f.col] <= f.v;
    case 'contains': return String(r[f.col] ?? '').toLowerCase().includes(String(f.v).toLowerCase());
  }
}

export function executeOps(db: DB, table: string, ops: Op[]): QueryResult {
  const tbl: Record<string, any>[] = (db as any)[table] ?? [];

  let opKind: 'insert' | 'upsert' | 'update' | 'delete' | null = null;
  let payload: any = null;
  const filters: FilterOp[] = [];
  let sortCol: string | null = null;
  let sortAsc = true;
  let limitN: number | null = null;
  let singleMode = false;

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

  const match = (r: Record<string, any>) => filters.every((f) => applyFilter(f, r));
  let staged: any[] | null = null;

  if (opKind === 'insert') {
    const arr = (Array.isArray(payload) ? payload : [payload]).map((r: any) => ({ ...r, id: r.id ?? uid() }));
    (db as any)[table] = [...tbl, ...arr];
    staged = arr;
  } else if (opKind === 'upsert') {
    const arr = Array.isArray(payload) ? payload : [payload];
    arr.forEach((r: any) => {
      const idx = tbl.findIndex((x) => x.id === r.id);
      const row = { ...r, id: r.id ?? uid() };
      if (idx >= 0) tbl[idx] = row; else tbl.push(row);
    });
    staged = arr;
  } else if (opKind === 'update') {
    const matched = tbl.filter(match);
    matched.forEach((r) => Object.assign(r, payload));
    staged = matched;
  } else if (opKind === 'delete') {
    const keep = tbl.filter((r) => !filters.some((f) => applyFilter(f, r)));
    (db as any)[table] = keep;
    staged = tbl.filter((r) => !keep.includes(r));
  }

  let rows: any[] = staged ? [...staged] : tbl;
  for (const f of filters) rows = rows.filter((r) => applyFilter(f, r));
  if (sortCol) {
    rows = [...rows].sort((a, b) => {
      const av = a[sortCol!]; const bv = b[sortCol!];
      if (av == null && bv == null) return 0;
      if (av == null) return 1; if (bv == null) return -1;
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sortAsc ? cmp : -cmp;
    });
  }
  if (limitN != null) rows = rows.slice(0, limitN);
  if (singleMode) return { data: rows[0] ?? null, error: null };
  return { data: rows, error: null };
}
