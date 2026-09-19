import type { Role, StatusGizi, WarnaSemantik } from './types';

export function cn(...xs: Array<string | false | null | undefined>): string {
  return xs.filter(Boolean).join(' ');
}

// ---------- Format tanggal & angka (id-ID) ----------
export function fmtTanggal(iso?: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function fmtTanggalLengkap(iso?: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function fmtBulanTahun(iso?: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

export function fmtAngka(n: number | null | undefined, desimal = 1): string {
  if (n == null || isNaN(n)) return '-';
  return n.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: desimal });
}

export function fmtZ(z: number | null | undefined): string {
  if (z == null || isNaN(z)) return '—';
  return (z > 0 ? '+' : '') + z.toFixed(2) + ' SD';
}

// ---------- Navigasi hash ----------
export function nav(to: string) {
  if (location.hash === to) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    location.hash = to;
  }
}

// ---------- Metadata status ----------
export const STATUS_META: Record<StatusGizi, { warna: WarnaSemantik; deskripsi: string }> = {
  Normal: { warna: 'green', deskripsi: 'Tumbuh kembang sesuai standar' },
  Risiko: { warna: 'yellow', deskripsi: 'Butuh perhatian & pemantauan' },
  Stunting: { warna: 'red', deskripsi: 'TB/U < -2 SD — perlu intervensi' },
  Wasting: { warna: 'red', deskripsi: 'BB/TB < -2 SD — gizi akut' },
  'Gizi Buruk': { warna: 'red', deskripsi: 'Z-score < -3 SD — rujuk segera' },
  'Berat Lebih': { warna: 'yellow', deskripsi: 'BB/TB > +2 SD' },
};

export const WARNA_BADGE: Record<WarnaSemantik, string> = {
  green: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
  yellow: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
  red: 'bg-red-100 text-red-700 ring-1 ring-red-200',
  teal: 'bg-teal-100 text-teal-700 ring-1 ring-teal-200',
  slate: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
};

export const WARNA_DOT: Record<WarnaSemantik, string> = {
  green: 'bg-emerald-500',
  yellow: 'bg-amber-400',
  red: 'bg-red-500',
  teal: 'bg-teal-500',
  slate: 'bg-slate-400',
};

export const WARNA_BG_SOFT: Record<WarnaSemantik, string> = {
  green: 'bg-emerald-50 border-emerald-200',
  yellow: 'bg-amber-50 border-amber-200',
  red: 'bg-red-50 border-red-200',
  teal: 'bg-teal-50 border-teal-200',
  slate: 'bg-slate-50 border-slate-200',
};

export const WARNA_TEKS: Record<WarnaSemantik, string> = {
  green: 'text-emerald-700',
  yellow: 'text-amber-700',
  red: 'text-red-700',
  teal: 'text-teal-700',
  slate: 'text-slate-600',
};

export const ROLE_LABEL: Record<Role, string> = {
  kader: 'Kader Posyandu',
  bidan: 'Bidan / Puskesmas',
  admin: 'Dinas Kesehatan',
};

export function umurLabel(tglLahir: string, pada?: string): string {
  const lahir = new Date(tglLahir + 'T00:00:00');
  const ref = pada ? new Date(pada + 'T00:00:00') : new Date();
  const hari = Math.floor((ref.getTime() - lahir.getTime()) / (24 * 3600 * 1000));
  if (hari < 60) return `${hari} hari`;
  const bulan = Math.floor(hari / 30.4375);
  if (bulan < 24) return `${bulan} bulan`;
  const th = Math.floor(bulan / 12);
  return `${th} th ${bulan % 12} bln`;
}

export function inisial(nama: string): string {
  return nama
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();
}

export function tanggalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Tanggal n bulan lalu (tanggal 5) — untuk seed & laporan. */
export function nBulanLalu(n: number, hari = 5): string {
  const d = new Date();
  return tanggalISO(new Date(d.getFullYear(), d.getMonth() - n, hari));
}
