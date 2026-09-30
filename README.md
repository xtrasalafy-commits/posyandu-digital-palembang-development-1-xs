# Posyandu Digital Palembang

> Aplikasi pemantauan tumbuh kembang balita & pencegahan stunting untuk kader, bidan, dan Dinas Kesehatan Kota Palembang.

[![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-7-646cff?logo=vite&logoColor=white)](https://vite.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06b6d4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%2B%20DB%20%2B%20Realtime-3ecf8e?logo=supabase&logoColor=white)](https://supabase.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## ✨ Fitur Utama

| Modul | Deskripsi |
|-------|-----------|
| **📊 Dashboard** | Ringkasan visual, tren z-score 6 bulan, sebaran risiko per kecamatan, sistem peringatan dini |
| **👶 Bayi & Balita** | Daftar balita terdaftar dengan status gizi real-time (Normal / Risiko / Stunting / Wasting / Gizi Buruk / Berat Lebih) |
| **📏 Catat Antropometri** | Input BB/TB/LK → kalkulasi z-score WHO instan + kategori gizi otomatis (Kemenkes RI) |
| **🛡️ Validasi Bidan** | Persetujuan pengukuran kader sebelum masuk laporan Dinas |
| **🤰 Ibu Hamil** | Pantau LILA, deteksi KEK, ANC count |
| **💉 Imunisasi** | Jadwal lengkap 0–18 bulan, status completed/pending |
| **🗺️ Peta Sebaran** | Visualisasi risiko stunting per kelurahan/kecamatan |
| **📄 Laporan** | Export PDF/Excel untuk Dinas Kesehatan |

---

## 🏗️ Tech Stack

- **Frontend**: React 19 + TypeScript + Vite 7
- **Styling**: Tailwind CSS 4 (CSS-first config)
- **State & Data**: TanStack Query (React Query) + Supabase Realtime
- **Auth**: Supabase Auth (email/password + demo mode)
- **Database**: Supabase PostgreSQL (demo mode: localStorage)
- **Charts**: Recharts
- **Export**: jsPDF + AutoTable, SheetJS (xlsx)
- **Icons**: Lucide React

---

## 🚀 Quick Start

### Prasyarat
- Node.js 20+
- npm / pnpm / yarn
- Akun [Supabase](https://supabase.com) (untuk production)

### Instalasi

```bash
# Clone repository
git clone https://github.com/mzf/posyandu-digital-palembang.git
cd posyandu-digital-palembang

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Isi .env.local dengan kredensial Supabase Anda
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=your-anon-key

# Jalankan development server
npm run dev
```

Buka `http://localhost:5173`

### Demo Mode (Tanpa Supabase)
Tanpa `VITE_SUPABASE_URL` & `VITE_SUPABASE_ANON_KEY`, aplikasi otomatis berjalan dalam **Demo Mode** dengan:
- Data contoh 32 balita, 14 ibu hamil, riwayat antropometri & imunisasi realistis Kota Palembang
- 4 akun demo 1-klik (Kader, Bidan, Admin, Kader 2)
- Penyimpanan lokal via localStorage (persisten antar reload)

**Akun Demo:**
| Peran | Email | Password |
|-------|-------|----------|
| Kader | `kader@posyandu.id` | `kader123` |
| Kader 2 | `kader2@posyandu.id` | `kader123` |
| Bidan | `bidan@posyandu.id` | `bidan123` |
| Admin | `admin@dinkes.id` | `admin123` |

> ⚠️ **Penting:** Akun demo di atas HANYA berfungsi dalam **Mode Demo** (tanpa env Supabase).
> Kalau aplikasi sudah terhubung ke Supabase (env `VITE_SUPABASE_URL` terpasang), akun-akun
> ini harus dibuat secara manual di Supabase — lihat **🔧 Setup Supabase** di bawah.

---

## 🔧 Setup Supabase (untuk data persisten di server)

Supabase menyediakan Auth + PostgreSQL yang aman untuk aplikasi client-side ini.
Ikuti 3 langkah berikut agar akun demo bisa dipakai di produksi.

### Langkah 1 — Buat Project Supabase
1. Daftar / login di [supabase.com](https://supabase.com) (gratis)
2. **New Project** → isi nama, password DB, region (pilih `Singapore` untuk Indonesia)
3. Tunggu provisioning selesai (±2 menit)

### Langkah 2 — Buat 4 Akun Demo
1. Buka **Dashboard → Authentication → Users**
2. Klik **Add user → Create new user**
3. Buat keempat akun ini (aktifkan "Auto Confirm User"):

   | Email | Password |
   |-------|----------|
   | `kader@posyandu.id` | `kader123` |
   | `kader2@posyandu.id` | `kader123` |
   | `bidan@posyandu.id` | `bidan123` |
   | `admin@dinkes.id` | `admin123` |

### Langkah 3 — Jalankan SQL Schema
1. Buka **Dashboard → SQL Editor → New query**
2. Copy-paste seluruh isi file [`supabase/schema.sql`](supabase/schema.sql)
3. Klik **Run** (butuh ±5 detik)

Script ini akan otomatis:
- Membuat 5 tabel: `profiles`, `bayi`, `antropometri_logs`, `imunisasi`, `ibu_hamil`
- Mengaktifkan **Row Level Security** + policy (hanya user login yang bisa akses data)
- Menghubungkan setiap akun demo (berdasarkan email) ke baris `profiles` dengan role masing-masing
- Menambahkan beberapa data contoh (3 balita, log antropometri, imunisasi, 1 ibu hamil)

Verifikasi dengan query cek di akhir file SQL:
```sql
SELECT email, role FROM auth.users u JOIN public.profiles p ON p.id = u.id;
```

### Langkah 4 — Set Environment Variables
Di **Vercel** (Settings → Environment Variables) atau file `.env.local`:

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` (Project Settings → API → Project URL) |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` (Project Settings → API → anon public) |

> ⚠️ Jangan pakai `service_role` key — itu untuk server only.

Setelah itu **Redeploy** di Vercel, lalu login pakai akun demo di atas.

---

## 📦 Build Production

```bash
# Build standar (multi-chunk, optimal untuk Vercel)
npm run build

# Build single-file HTML (offline / embed)
SINGLE_FILE=1 npm run build
```

Output di folder `dist/`.

---

## 🌐 Deploy ke Vercel

1. Push ke GitHub
2. Import project di [Vercel Dashboard](https://vercel.com/dashboard)
3. Framework preset: **Vite** (auto-detect)
4. Set Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy

`vercel.json` sudah dikonfigurasi untuk:
- Hash router (SPA fallback ke `index.html`)
- Chunk splitting & caching optimal
- Asset fingerprinting

### ⚠️ Troubleshooting: `404 DEPLOYMENT_NOT_FOUND`

Error ini berarti **deployment gagal / belum ada deployment yang sukses**, BUKAN error dari aplikasi. Penyebab umum:

1. **Build gagal di Vercel** → cek **Build Logs** di tab Deployments, atau jalankan `npm run build` lokal dulu untuk memastikan tidak ada error.
2. **Environment Variable di `vercel.json` belum dibuat** → jangan pakai referensi `@nama-var` di `vercel.json` jika variabelnya belum ada di Settings → Environment Variables. Lebih aman: set env var langsung lewat **dashboard Vercel** saja.
3. **Kunjungi URL project utama** (misal `nama-project.vercel.app`), bukan URL deployment spesifik (`nama-project-abc123.vercel.app`) yang gagal.

### ⚠️ Troubleshooting: `Invalid login credentials` saat login demo

Error ini datang langsung dari **Supabase Auth**. Artinya aplikasi **sudah** terhubung ke Supabase (env terbaca), tapi akun yang kamu coba belum terdaftar di server Supabase.

**Solusi:** ikuti **🔧 Setup Supabase** di atas — khususnya:
- **Langkah 2** (buat 4 user di Authentication → Users), dan
- **Langkah 3** (jalankan `supabase/schema.sql` di SQL Editor) supaya setiap user punya baris `profiles` + role.

Kalau setelah login berhasil layar hanya menampilkan **"Memuat data..."** tanpa henti → user tersebut belum punya baris di tabel `profiles`. Jalankan ulang Langkah 3 (scriptnya aman di-run berulang).

### ⚠️ Alternatif: jalankan tanpa Supabase (Mode Demo murni)

Kalau cuma mau mencoba aplikasi tanpa setup database apa pun:
- **Hapus / kosongkan** env `VITE_SUPABASE_URL` & `VITE_SUPABASE_ANON_KEY` di Vercel
- Redeploy → aplikasi otomatis masuk **Mode Demo** (data di localStorage, 4 akun demo 1-klik langsung jalan)

### 🗄️ Tentang DATABASE_URL (Neon / PostgreSQL)

Aplikasi ini adalah **client-side app murni (Vite SPA)** — tidak ada server runtime di Vercel.

- Vite **hanya membaca** env var dengan prefix `VITE_` (seperti `VITE_SUPABASE_URL`).
- `DATABASE_URL` **tidak terbaca** oleh aplikasi, karena (a) tidak ada kode server yang membacanya, dan (b) string koneksi database **tidak boleh** ditaruh di kode client (bisa dilihat semua orang — celah keamanan).
- Aplikasi ini memakai **Supabase** untuk database. Supabase menyediakan REST + Auth yang aman untuk client-side.

**Pilihan kelanjutan database:**
- **Paling gampang**: pakai PostgreSQL bawaan Supabase (gratis, langsung jalan).
- **Pakai Neon**: hubungkan Neon sebagai *external database* di project Supabase, atau tulis ulang data layer ke serverless functions (butuh pengembangan tambahan).

> **Tanpa env Supabase pun aplikasi tetap jalan** — otomatis masuk **Mode Demo** (data tersimpan di localStorage browser).

---

## 📁 Struktur Project

```
src/
├── components/
│   ├── ui.tsx              # Design system (Button, Card, Badge, Dialog, Toast, dll)
│   ├── Layout.tsx          # Sidebar desktop + Bottom nav mobile + Sheet menu
│   └── TrakteerWidget.tsx  # Floating support widget (QR inline)
├── lib/
│   ├── api.ts              # TanStack Query hooks (query + mutation)
│   ├── auth.ts             # Reactive auth state (useSyncExternalStore)
│   ├── supabase.ts         # Supabase client + Demo mode (localStorage DB)
│   ├── antropometri.ts     # WHO z-score engine (BB/U, TB/U, BB/TB, LK/U)
│   ├── types.ts            # TypeScript interfaces
│   └── utils.ts            # Helpers (format, nav, constants)
├── pages/
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── Bayi.tsx
│   ├── DetailBayi.tsx
│   ├── Antropometri.tsx
│   ├── IbuHamil.tsx
│   ├── Imunisasi.tsx
│   ├── Peta.tsx
│   └── Laporan.tsx
├── App.tsx                 # Router hash + role guard + providers
├── main.tsx                # Entry point
└── index.css               # Tailwind + custom theme + animations
```

---

## 🔐 Role-Based Access Control

| Fitur | Kader | Bidan | Admin |
|-------|-------|-------|-------|
| Dashboard | ✅ | ✅ | ✅ |
| Bayi & Balita | ✅ (binaan sendiri) | ✅ (semua) | ✅ (semua) |
| Catat Antropometri | ✅ | ✅ | ✅ |
| Validasi Data | ❌ | ✅ | ✅ |
| Ibu Hamil | ✅ (binaan sendiri) | ✅ (semua) | ✅ (semua) |
| Imunisasi | ✅ | ✅ | ✅ |
| Peta Sebaran | ❌ | ✅ | ✅ |
| Laporan | ❌ | ✅ | ✅ |

---

## 🧮 Kalkulasi Status Gizi (WHO / Kemenkes RI)

| Status | Kriteria Z-Score |
|--------|------------------|
| **Normal** | Semua indikator ≥ -2 SD |
| **Risiko** | Satu indikator -3 SD < z < -2 SD |
| **Stunting** | TB/U < -2 SD |
| **Wasting** | BB/TB < -2 SD |
| **Gizi Buruk** | BB/U < -3 SD **atau** BB/TB < -3 SD |
| **Berat Lebih** | BB/TB > +2 SD |

Kenaikan BB (KMS): `N` (Naik) / `T` (Tidak Naik) — ambang minimal per usia.

---

## 💝 Support Development

Web app ini **gratis & bebas iklan**. Server, domain, & waktu development butuh biaya.

Klik tombol **☕ Support** di sudut kanan bawah → pilih nominal → scan QR / bayar via [Trakteer](https://trakteer.id/perpus_opera/).

> **Kopi kecil, server tetap jalan** 💚

---

## 📥 Download Source Code

**Repository:** [github.com/mzf/posyandu-digital-palembang](https://github.com/mzf/posyandu-digital-palembang)

Clone atau download ZIP dari GitHub untuk mendapatkan source code lengkap.

---

## 📄 Lisensi

**MIT License** — bebas digunakan, dimodifikasi, dan didistribusikan.

---

## 👨‍💻 Author

**MZF** — 2026

> *Dibangun dengan ❤️ untuk kader, bidan, & Dinas Kesehatan Kota Palembang dalam upaya pencegahan stunting.*