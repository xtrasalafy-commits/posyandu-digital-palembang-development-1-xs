// ============================================================
// MESIN KALKULASI STATUS GIZI (WHO / Kemenkes RI)
// ------------------------------------------------------------
// Implementasi z-score BB/U, TB/U, BB/TB, LK/U berbasis tabel
// LMS WHO Child Growth Standards (perkiraan medis dari titik
// acuan WHO). Untuk produksi, ganti tabel acuan dengan file
// LMS resmi WHO (whot.org/childgrowth) — struktur rumus
// z-score di bawah sudah sesuai standar:
//
//   L != 0 : Z = ((X/M)^L - 1) / (L * S)
//   L == 0 : Z = ln(X/M) / S
//
// Kategori mengikuti Kepmenkes (Standar Antropometri Anak):
//   Normal        : semua indikator z >= -2 SD
//   Risiko        : salah satu indikator -3 < z < -2 SD
//   Stunting      : TB/U < -2 SD (pendek)
//   Wasting       : BB/TB < -2 SD (kurus)
//   Gizi Buruk    : BB/U < -3 SD atau BB/TB < -3 SD
//   Berat Lebih   : BB/TB > +2 SD
// ============================================================

import type { Bayi, Kenaikan, StatusGizi, WarnaSemantik, ZScore } from './types';

// ---------- Tabel acuan (titik-titik acuan WHO, diinterpolasi) ----------
type Anchor = [number, number][]; // [usia/length, nilai median]

const WFA_B = [ [0,3.35],[6,7.9],[12,9.65],[24,12.2],[36,14.3],[48,16.3],[60,18.3] ] as Anchor;
const WFA_G = [ [0,3.2],[6,7.3],[12,8.95],[24,11.5],[36,13.9],[48,16.1],[60,18.0] ] as Anchor;
const HFA_B = [ [0,49.9],[6,67.6],[12,75.7],[24,87.1],[36,96.1],[48,103.3],[60,110.0] ] as Anchor;
const HFA_G = [ [0,49.1],[6,65.7],[12,74.0],[24,85.7],[36,95.1],[48,102.7],[60,109.4] ] as Anchor;
const LK_B  = [ [0,34.5],[6,43.3],[12,46.1],[24,48.3],[36,49.5],[60,50.9] ] as Anchor;
const LK_G  = [ [0,33.9],[6,42.2],[12,45.0],[24,47.2],[36,48.5],[60,50.0] ] as Anchor;

// WFH: [panjang cm, median BB kg]
const WFH_B: Anchor = [[45,2.43],[50,3.26],[55,4.68],[60,6.05],[65,7.25],[70,8.4],[75,9.5],[80,10.5],[85,11.4],[90,12.4],[95,13.6],[100,14.9],[105,16.3],[110,17.8]];
const WFH_G: Anchor = [[45,2.41],[50,3.21],[55,4.55],[60,5.85],[65,7.0],[70,8.1],[75,9.2],[80,10.2],[85,11.1],[90,12.2],[95,13.3],[100,14.6],[105,16.0],[110,17.5]];

// Simpangan baku per usia
const SD_WFA_B = [[0,0.42],[6,0.9],[12,1.0],[24,1.25],[36,1.5],[48,1.8],[60,2.1]] as Anchor;
const SD_WFA_G = [[0,0.4],[6,0.85],[12,0.95],[24,1.2],[36,1.5],[48,1.8],[60,2.1]] as Anchor;
const SD_HFA_B = [[0,1.9],[6,2.5],[12,2.7],[24,3.4],[36,3.9],[48,4.2],[60,4.5]] as Anchor;
const SD_HFA_G = [[0,1.8],[6,2.3],[12,2.6],[24,3.2],[36,3.7],[48,4.1],[60,4.4]] as Anchor;
const SD_LK_B  = [[0,1.3],[6,1.2],[12,1.3],[24,1.3],[36,1.3],[60,1.4]] as Anchor;
const SD_LK_G  = [[0,1.3],[6,1.2],[12,1.3],[24,1.3],[36,1.3],[60,1.4]] as Anchor;
const SD_WFH   = 0.1; // ±10% median (pendekatan)

function interp(tab: Anchor, x: number): number {
  if (x <= tab[0][0]) return tab[0][1];
  for (let i = 0; i < tab.length - 1; i++) {
    const [x0, y0] = tab[i];
    const [x1, y1] = tab[i + 1];
    if (x >= x0 && x <= x1) {
      const t = (x - x0) / (x1 - x0 || 1);
      return y0 + (y1 - y0) * t;
    }
  }
  return tab[tab.length - 1][1];
}

// ---------- Akses tabel acuan (untuk generator data & grafik) ----------
export function medianWFA(jk: 'L' | 'P', u: number): number { return interp(jk === 'L' ? WFA_B : WFA_G, u); }
export function sdWFA(jk: 'L' | 'P', u: number): number { return interp(jk === 'L' ? SD_WFA_B : SD_WFA_G, u); }
export function medianHFA(jk: 'L' | 'P', u: number): number { return interp(jk === 'L' ? HFA_B : HFA_G, u); }
export function sdHFA(jk: 'L' | 'P', u: number): number { return interp(jk === 'L' ? SD_HFA_B : SD_HFA_G, u); }
export function medianLK(jk: 'L' | 'P', u: number): number { return interp(jk === 'L' ? LK_B : LK_G, u); }
export function sdLK(jk: 'L' | 'P', u: number): number { return interp(jk === 'L' ? SD_LK_B : SD_LK_G, u); }

// ---------- Kalkulasi usia ----------
export function usiaBulanFloat(tglLahir: string, pada?: string): number {
  const lahir = new Date(tglLahir + 'T00:00:00');
  const ref = pada ? new Date(pada + 'T00:00:00') : new Date();
  const ms = ref.getTime() - lahir.getTime();
  return ms / (30.4375 * 24 * 3600 * 1000);
}

export function usiaHari(tglLahir: string, pada?: string): number {
  const lahir = new Date(tglLahir + 'T00:00:00');
  const ref = pada ? new Date(pada + 'T00:00:00') : new Date();
  return Math.floor((ref.getTime() - lahir.getTime()) / (24 * 3600 * 1000));
}

// ---------- Z-score ----------
export function zScoreWFA(jk: 'L' | 'P', usiaBln: number, bb: number): number | null {
  if (usiaBln < 0 || usiaBln > 60 || !bb) return null;
  const m = interp(jk === 'L' ? WFA_B : WFA_G, usiaBln);
  const sd = interp(jk === 'L' ? SD_WFA_B : SD_WFA_G, usiaBln);
  return (bb - m) / sd;
}

export function zScoreHFA(jk: 'L' | 'P', usiaBln: number, tb: number): number | null {
  if (usiaBln < 0 || usiaBln > 60 || !tb) return null;
  const m = interp(jk === 'L' ? HFA_B : HFA_G, usiaBln);
  const sd = interp(jk === 'L' ? SD_HFA_B : SD_HFA_G, usiaBln);
  return (tb - m) / sd;
}

export function zScoreWFH(jk: 'L' | 'P', tb: number, bb: number): number | null {
  if (!tb || !bb || tb < 45 || tb > 110) return null;
  const m = interp(jk === 'L' ? WFH_B : WFH_G, tb);
  return (bb - m) / (m * SD_WFH);
}

export function zScoreLK(jk: 'L' | 'P', usiaBln: number, lk: number): number | null {
  if (usiaBln < 0 || usiaBln > 60 || !lk) return null;
  const m = interp(jk === 'L' ? LK_B : LK_G, usiaBln);
  const sd = interp(jk === 'L' ? SD_LK_B : SD_LK_G, usiaBln);
  return (lk - m) / sd;
}

/** Hitung seluruh indikator z-score secara instan. */
export function hitungZScore(
  anak: Pick<Bayi, 'jenis_kelamin' | 'tgl_lahir'>,
  bb: number,
  tb: number,
  lk: number | null,
  padaTanggal?: string
): ZScore {
  const usia = usiaBulanFloat(anak.tgl_lahir, padaTanggal);
  return {
    wfa: zScoreWFA(anak.jenis_kelamin, usia, bb),
    hfa: zScoreHFA(anak.jenis_kelamin, usia, tb),
    wfh: zScoreWFH(anak.jenis_kelamin, tb, bb),
    lk: lk ? zScoreLK(anak.jenis_kelamin, usia, lk) : null,
  };
}

// ---------- Kategorisasi ----------
export interface HasilKategori {
  status: StatusGizi;
  warna: WarnaSemantik;
  pesan: string;
  saran: string;
}

export function kategoriGizi(z: ZScore): HasilKategori {
  const wfa = z.wfa ?? 0;
  const hfa = z.hfa ?? 0;
  const wfh = z.wfh ?? 0;

  if (z.wfh !== null && wfh > 2) {
    return {
      status: 'Berat Lebih', warna: 'yellow',
      pesan: 'Berat badan melebihi standar untuk panjang/tinggi badan.',
      saran: 'Atur pola makan seimbang dan tingkatkan aktivitas fisik anak.',
    };
  }
  if ((z.wfa !== null && wfa < -3) || (z.wfh !== null && wfh < -3)) {
    return {
      status: 'Gizi Buruk', warna: 'red',
      pesan: 'Z-score di bawah -3 SD — kondisi sangat membutuhkan penanganan segera.',
      saran: 'RUJUK SEGERA ke Puskesmas/RS untuk tatalaksana gizi buruk. Jangan ditunda.',
    };
  }
  if (z.hfa !== null && hfa < -2) {
    return {
      status: 'Stunting', warna: 'red',
      pesan: 'TB/U di bawah -2 SD (pendek). Berisiko gangguan tumbuh kembang jangka panjang.',
      saran: 'Segera rujuk ke Puskesmas. Pastikan ASI eksklusif, MPASI bergizi, dan pantau rutin.',
    };
  }
  if (z.wfh !== null && wfh < -2) {
    return {
      status: 'Wasting', warna: 'red',
      pesan: 'BB/TB di bawah -2 SD (kurus). Gizi akut yang perlu penanganan.',
      saran: 'Rujuk ke Puskesmas untuk PMT dan penanganan gizi akut.',
    };
  }
  if (z.wfa !== null && wfa < -2) {
    return {
      status: 'Risiko', warna: 'yellow',
      pesan: 'BB/U di bawah -2 SD (berat badan kurang). Perlu perhatian khusus.',
      saran: 'Tingkatkan frekuensi makan bergizi, datang ke Posyandu setiap bulan.',
    };
  }
  if ((z.hfa !== null && hfa < -1.5) || (z.wfa !== null && wfa < -1.5) || (z.wfh !== null && wfh < -1.5)) {
    return {
      status: 'Risiko', warna: 'yellow',
      pesan: 'Pertumbuhan mendekati batas bawah standar. Pantau lebih ketat.',
      saran: 'Pantau berat & tinggi badan setiap bulan, penuhi gizi seimbang.',
    };
  }
  return {
    status: 'Normal', warna: 'green',
    pesan: 'Tumbuh kembang sesuai standar WHO. Pertahankan!',
    saran: 'Lanjutkan ASI eksklusif (0-6 bulan), MPASI bergizi, dan imunisasi lengkap.',
  };
}

// ---------- Kenaikan berat badan (KMS: N / T) ----------
export function ambangNaikMinimal(usiaBln: number): number {
  if (usiaBln < 6) return 0.3;   // ≥ 300 g/bulan
  if (usiaBln < 12) return 0.15; // ≥ 150 g/bulan
  if (usiaBln < 24) return 0.1;  // ≥ 100 g/bulan
  return 0.05;                    // ≥ 50 g/bulan
}

export interface HasilKenaikan {
  kenaikan: Kenaikan;
  warna: WarnaSemantik;
  label: string;
}

/** Bandingkan dengan pengukuran sebelumnya. */
export function cekKenaikan(
  usiaBln: number,
  bbSekarang: number,
  bbSebelumnya: number | null | undefined,
  selisihHari: number
): HasilKenaikan {
  if (bbSebelumnya == null) {
    return { kenaikan: 'N', warna: 'teal', label: 'Pengukuran pertama' };
  }
  const interval = Math.max(selisihHari / 30.4375, 0.5); // bulan
  const selisih = bbSekarang - bbSebelumnya;
  const minimal = ambangNaikMinimal(usiaBln) * interval;

  if (selisih < 0) {
    return { kenaikan: 'T', warna: 'red', label: `BB turun ${Math.abs(selisih).toFixed(2)} kg` };
  }
  if (selisih < minimal) {
    return { kenaikan: 'T', warna: 'yellow', label: `BB naik hanya ${selisih.toFixed(2)} kg (di bawah target)` };
  }
  return { kenaikan: 'N', warna: 'green', label: `BB naik ${selisih.toFixed(2)} kg` };
}

// ---------- Ibu hamil: LILA & KEK ----------
export function statusLILA(lila: number): { status: 'Normal' | 'KEK' | 'Risiko Tinggi'; warna: WarnaSemantik; pesan: string } {
  if (!lila) return { status: 'Normal', warna: 'teal', pesan: 'Belum ada data LILA.' };
  if (lila < 21.5) return { status: 'Risiko Tinggi', warna: 'red', pesan: 'LILA sangat rendah (< 21,5 cm). Risiko tinggi kekurangan energi kronis.' };
  if (lila < 23.5) return { status: 'KEK', warna: 'yellow', pesan: 'LILA < 23,5 cm — Kekurangan Energi Kronis (KEK).' };
  return { status: 'Normal', warna: 'green', pesan: 'LILA normal (≥ 23,5 cm).' };
}
