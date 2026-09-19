// ===== Tipe data inti POSYANDU DIGITAL PALEMBANG =====

export type Role = 'kader' | 'bidan' | 'admin';

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  phone?: string;
  address?: string;
  kelurahan?: string;
  kecamatan?: string;
  puskesmas?: string;
}

export interface IbuHamil {
  id: string;
  nama: string;
  nik?: string;
  usia_kehamilan: number; // minggu
  tgl_periksa: string; // ISO date
  lila: number; // cm (Lingkar Lengan Atas)
  status: 'Normal' | 'KEK' | 'Risiko Tinggi';
  anc_count: number;
  kelurahan: string;
  kecamatan: string;
  kader_id: string;
  alamat?: string;
}

export interface Bayi {
  id: string;
  nama: string;
  nama_ortu: string;
  jenis_kelamin: 'L' | 'P';
  tgl_lahir: string;
  bb_lahir: number;
  tb_lahir: number;
  kelurahan: string;
  kecamatan: string;
  kader_id: string;
  alamat?: string;
}

export type StatusGizi =
  | 'Normal'
  | 'Risiko'
  | 'Stunting'
  | 'Wasting'
  | 'Gizi Buruk'
  | 'Berat Lebih';

export type WarnaSemantik = 'green' | 'yellow' | 'red' | 'teal' | 'slate';

export interface ZScore {
  wfa: number | null; // BB/U
  hfa: number | null; // TB/U
  wfh: number | null; // BB/TB
  lk: number | null;  // LK/U
}

export type Kenaikan = 'N' | 'T'; // Naik / Tidak Naik

export interface AntropometriLog {
  id: string;
  anak_id: string;
  tanggal: string; // ISO date
  bb: number; // kg
  tb: number; // cm
  lk: number | null;
  z: ZScore;
  status: StatusGizi;
  kenaikan: Kenaikan;
  catatan?: string;
  validated_by: string | null;
  validated_at: string | null;
  created_by: string;
}

export interface Imunisasi {
  id: string;
  anak_id: string;
  vaksin: string;
  tanggal: string | null;
  status: 'completed' | 'pending';
  diberikan_oleh?: string;
}

export interface JadwalVaksin {
  nama: string;
  bulan: number; // usia minimal (bulan)
  keterangan: string;
}

export const JADWAL_IMUNISASI: JadwalVaksin[] = [
  { nama: 'HB-0', bulan: 0, keterangan: 'Hepatitis B, 0–24 jam setelah lahir' },
  { nama: 'BCG', bulan: 1, keterangan: 'Tuberkulosis, usia 1 bulan' },
  { nama: 'Polio 1', bulan: 1, keterangan: 'Polio tetes, usia 1 bulan' },
  { nama: 'DPT-HB-Hib 1', bulan: 2, keterangan: 'Usia 2 bulan' },
  { nama: 'Polio 2', bulan: 2, keterangan: 'Polio tetes, usia 2 bulan' },
  { nama: 'DPT-HB-Hib 2', bulan: 3, keterangan: 'Usia 3 bulan' },
  { nama: 'Polio 3', bulan: 4, keterangan: 'Polio tetes, usia 4 bulan' },
  { nama: 'DPT-HB-Hib 3', bulan: 4, keterangan: 'Usia 4 bulan' },
  { nama: 'IPV / Polio 4', bulan: 4, keterangan: 'Polio suntik, usia 4 bulan' },
  { nama: 'Campak-Rubela 1', bulan: 9, keterangan: 'MR 1, usia 9 bulan' },
  { nama: 'DPT Booster', bulan: 18, keterangan: 'Booster usia 18 bulan' },
  { nama: 'Campak-Rubela 2', bulan: 18, keterangan: 'MR 2, usia 18 bulan' },
];

export interface SessionUser {
  id: string;
  email: string;
}
