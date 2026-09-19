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