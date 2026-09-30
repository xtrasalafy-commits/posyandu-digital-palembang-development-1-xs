# Posyandu Digital Palembang

> Aplikasi pemantauan tumbuh kembang balita & pencegahan stunting untuk kader, bidan, dan Dinas Kesehatan Kota Palembang.

[![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-7-646cff?logo=vite&logoColor=white)](https://vite.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06b6d4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Neon](https://img.shields.io/badge/Neon-PostgreSQL-00E599?logo=neon&logoColor=white)](https://neon.tech)
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
- **State & Data**: TanStack Query (React Query)
- **Backend**: Vercel Serverless Functions (Node.js) — folder `api/`
- **Database**: Neon PostgreSQL (via `@neondatabase/serverless`)
- **Auth**: bcrypt (password) + JWT dalam cookie HttpOnly (`jose`)
- **Charts**: Recharts
- **Export**: jsPDF + AutoTable, SheetJS (xlsx)
- **Icons**: Lucide React

### Arsitektur

```
Browser (React SPA)
    │  fetch /api/* (cookie HttpOnly)
    ▼
Vercel Serverless Functions  ← DATABASE_URL, AUTH_SECRET (env server, TIDAK terekspos)
    │
    ▼
Neon PostgreSQL
```

- Saat `npm run dev`: endpoint `/api/*` dilayani oleh Vite plugin (`src/lib/devServer.ts`)
  dengan mock database in-memory — jadi develop tanpa perlu Neon.
- Saat deploy: endpoint dilayani oleh `api/` yang koneksi ke Neon sungguhan.

---

## 🚀 Quick Start

### Prasyarat
- Node.js 20+
- npm / pnpm / yarn
- (Untuk production) Project [Neon](https://neon.tech) + akun Vercel

### Instalasi & Development

```bash
# Clone repository
git clone https://github.com/mzf/posyandu-digital-palembang.git
cd posyandu-digital-palembang

# Install dependencies
npm install

# Jalankan development server
npm run dev
```

Buka `http://localhost:5173` — **langsung jalan tanpa setup apapun**:

- Vite plugin (`src/lib/devServer.ts`) melayani endpoint `/api/*` dengan
  **mock database in-memory** lengkap dengan data contoh Kota Palembang
- Login pakai 4 akun demo (lihat tabel di bawah)
- Data reset otomalis setiap restart dev server; tekan **Reset data** di halaman login untuk re-seed

**Akun Demo** (sama persis di dev & production):
| Peran | Email | Password |
|-------|-------|----------|
| Kader | `kader@posyandu.id` | `kader123` |
| Kader 2 | `kader2@posyandu.id` | `kader123` |
| Bidan | `bidan@posyandu.id` | `bidan123` |
| Admin | `admin@dinkes.id` | `admin123` |

---

## 🗄️ Setup Neon (untuk production)

Agar data tersimpan permanen & bisa diakses dari device mana pun.

### Langkah 1 — Buat Database Neon
1. Daftar / login di [neon.tech](https://neon.tech) (gratis)
2. **Create Project** → pilih region (mis. `AWS ap-southeast-1` untuk Indonesia)
3. Salin **connection string** (format:
   `postgresql://user:pass@ep-host-pooler.region.aws.neon.tech/dbname?sslmode=require`)

### Langkah 2 — Jalankan Schema
1. Buka **Dashboard Neon → SQL Editor**
2. Copy-paste seluruh isi file [`neon/schema.sql`](neon/schema.sql) → **Run**

Script ini otomatis membuat:
- 6 tabel: `users`, `profiles`, `bayi`, `antropometri_logs`, `imunisasi`, `ibu_hamil`
- 4 akun demo dengan password sudah di-hash bcrypt + profil masing-masing
- Data contoh: 3 balita, log antropometri, imunisasi, 1 ibu hamil
- Index untuk performa query

### Langkah 3 — Set Environment Variables di Vercel
Vercel → **Settings → Environment Variables**:

| Key | Value | Scope |
|-----|-------|-------|
| `DATABASE_URL` | connection string Neon | Production & Preview |
| `AUTH_SECRET` | string acak rahasia (mis. `openssl rand -hex 32`) | Production & Preview |

> ⚠️ **PENTING:** JANGAN beri prefix `VITE_` pada kedua variabel di atas.
> Variabel tanpa prefix hanya bisa dibaca oleh Serverless Functions (aman),
> tidak pernah diekspos ke browser. `AUTH_SECRET` dipakai menandatangani cookie session.

### Langkah 4 — Deploy
Push ke GitHub → Vercel auto-deploy. Setelah selesai, langsung login pakai akun demo.

Verifikasi koneksi dengan query ini di Neon SQL Editor:
```sql
SELECT u.email, p.role FROM public.users u JOIN public.profiles p ON p.id = u.id;
```

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
4. Set Environment Variables (lihat **🗄️ Setup Neon** Langkah 3):
   - `DATABASE_URL`
   - `AUTH_SECRET`
5. Deploy

`vercel.json` sudah dikonfigurasi untuk:
- Hash router (SPA fallback ke `index.html`, kecuali route `/api/*`)
- Chunk splitting & caching optimal
- Asset fingerprinting

Serverless Functions di folder `api/` (auto-detect Vercel):
- `POST /api/auth/login` — login, set cookie JWT
- `POST /api/auth/logout` — hapus cookie
- `GET /api/auth/session` — cek session
- `POST /api/query` — query generik ke Neon (butuh auth)

### ⚠️ Troubleshooting: `404 DEPLOYMENT_NOT_FOUND`

Error ini berarti **deployment gagal / belum ada deployment yang sukses**, BUKAN error dari aplikasi. Penyebab umum:

1. **Build gagal di Vercel** → cek **Build Logs** di tab Deployments, atau jalankan `npm run build` lokal dulu.
2. **Kunjungi URL project utama** (misal `nama-project.vercel.app`), bukan URL deployment spesifik yang gagal.

### ⚠️ Troubleshooting: `Invalid login credentials` / login gagal

Pesan ini muncul saat email/password tidak cocok di database. Checklist:

1. **`neon/schema.sql` sudah dijalankan?** — Neon Dashboard → SQL Editor → Run
   (membuat tabel + 4 akun demo). Cek:
   ```sql
   SELECT email FROM public.users;
   ```
2. **`DATABASE_URL` sudah benar & bisa dipakai server?** — Vercel → Settings →
   Environment Variables. Harus berupa connection string Neon lengkap.
3. **`AUTH_SECRET` sudah diset?** — tanpa ini, session hilang saat server cold-start.
4. **Sudah redeploy** setelah set env var? Env var baru berlaku setelah deploy baru.

> 💡 **Mode Demo untuk development:** `npm run dev` tidak butuh DATABASE_URL —
> mock database otomatis aktif. DATABASE_URL hanya dibutuhkan di production (Vercel).

### ⚠️ Troubleshooting: layar mentok di "Memuat data..."

User login berhasil tapi profil belum ada di tabel `profiles`. Solusi:
jalankan ulang `neon/schema.sql` (aman di-run berulang — pakai `ON CONFLICT`).

### 🗄️ Tentang DATABASE_URL & keamanan

- `DATABASE_URL` (Neon) **hanya dibaca oleh Serverless Functions** (`api/`) di server,
  **tidak pernah** diekspos ke browser (tanpa prefix `VITE_`).
- String koneksi database di kode client = celah keamanan (bisa dilihat semua orang);
  itulah sebabnya semua akses data lewat `/api/*` dengan cookie JWT HttpOnly.
- Login memakai bcrypt + JWT — password tidak pernah disimpan plain-text.

> Saat `npm run dev`, aplikasi otomatis pakai **mock database in-memory**
> (`src/lib/devServer.ts`) — tidak butuh DATABASE_URL. DATABASE_URL hanya perlu di Vercel.

---

## 📁 Struktur Project

```
├── api/                          # Vercel Serverless Functions
│   ├── _lib.ts                   # Koneksi Neon + JWT + SQL builder
│   ├── query.ts                  # POST /api/query (semua operasi DB)
│   └── auth/
│       ├── login.ts              # POST /api/auth/login
│       ├── logout.ts             # POST /api/auth/logout
│       └── session.ts            # GET /api/auth/session
├── neon/
│   └── schema.sql                # Schema DB + seed akun demo & data contoh
├── src/
│   ├── components/
│   │   ├── ui.tsx                # Design system (Button, Card, Badge, Dialog, Toast, dll)
│   │   ├── Layout.tsx            # Sidebar desktop + Bottom nav mobile + Sheet menu
│   │   └── TrakteerWidget.tsx    # Floating support widget (QR inline)
│   ├── lib/
│   │   ├── api.ts                # TanStack Query hooks (query + mutation)
│   │   ├── auth.ts               # Reactive auth state (useSyncExternalStore)
│   │   ├── db.ts                 # Client HTTP → /api/*
│   │   ├── devServer.ts          # Vite plugin: mock /api/* saat npm run dev
│   │   ├── mockDb.ts             # In-memory DB + seed data contoh
│   │   ├── antropometri.ts       # WHO z-score engine (BB/U, TB/U, BB/TB, LK/U)
│   │   ├── types.ts              # TypeScript interfaces
│   │   └── utils.ts              # Helpers (format, nav, constants)
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Bayi.tsx
│   │   ├── DetailBayi.tsx
│   │   ├── Antropometri.tsx
│   │   ├── IbuHamil.tsx
│   │   ├── Imunisasi.tsx
│   │   ├── Peta.tsx
│   │   └── Laporan.tsx
│   ├── App.tsx                   # Router hash + role guard + providers
│   ├── main.tsx                  # Entry point
│   └── index.css                 # Tailwind + custom theme + animations
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