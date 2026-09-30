-- ============================================================
-- POSYANDU DIGITAL PALEMBANG — DATABASE SCHEMA (Neon / PostgreSQL)
-- ------------------------------------------------------------
-- Cara pakai:
--   1. Buka project Neon → SQL Editor
--   2. Copy-paste seluruh script ini → Run
--   Aman dijalankan ulang (IF NOT EXISTS / ON CONFLICT).
--
-- Akun demo (dibuat di bawah, password sudah di-hash bcrypt):
--   kader@posyandu.id  / kader123   (Kader Posyandu)
--   kader2@posyandu.id / kader123   (Kader Posyandu)
--   bidan@posyandu.id  / bidan123   (Bidan / Puskesmas)
--   admin@dinkes.id    / admin123   (Dinas Kesehatan)
-- ============================================================

-- ================= 1. USERS (autentikasi) =================
CREATE TABLE IF NOT EXISTS public.users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================= 2. PROFILES (data aplikasi) =================
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'kader' CHECK (role IN ('kader', 'bidan', 'admin')),
  phone       TEXT,
  address     TEXT,
  kelurahan   TEXT,
  kecamatan   TEXT,
  puskesmas   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================= 3. TABEL OPERASIONAL =================

-- Bayi / balita
CREATE TABLE IF NOT EXISTS public.bayi (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama          TEXT NOT NULL,
  nama_ortu     TEXT NOT NULL,
  jenis_kelamin TEXT NOT NULL CHECK (jenis_kelamin IN ('L', 'P')),
  tgl_lahir     DATE NOT NULL,
  bb_lahir      NUMERIC(5,2),
  tb_lahir      NUMERIC(5,1),
  kelurahan     TEXT NOT NULL,
  kecamatan     TEXT NOT NULL,
  kader_id      TEXT,
  alamat        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Log antropometri (pengukuran bulanan)
CREATE TABLE IF NOT EXISTS public.antropometri_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anak_id      UUID NOT NULL REFERENCES public.bayi(id) ON DELETE CASCADE,
  tanggal      DATE NOT NULL,
  bb           NUMERIC(6,2) NOT NULL,
  tb           NUMERIC(6,1) NOT NULL,
  lk           NUMERIC(6,1),
  z            JSONB NOT NULL DEFAULT '{}',
  status       TEXT NOT NULL,
  kenaikan     TEXT NOT NULL DEFAULT 'N' CHECK (kenaikan IN ('N', 'T')),
  catatan      TEXT,
  validated_by TEXT,
  validated_at TIMESTAMPTZ,
  created_by   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Imunisasi
CREATE TABLE IF NOT EXISTS public.imunisasi (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anak_id        UUID NOT NULL REFERENCES public.bayi(id) ON DELETE CASCADE,
  vaksin         TEXT NOT NULL,
  tanggal        DATE,
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('completed', 'pending')),
  diberikan_oleh TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (anak_id, vaksin)
);

-- Ibu hamil
CREATE TABLE IF NOT EXISTS public.ibu_hamil (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama           TEXT NOT NULL,
  nik            TEXT,
  usia_kehamilan INT NOT NULL,
  tgl_periksa    DATE NOT NULL,
  lila           NUMERIC(5,1) NOT NULL,
  status         TEXT NOT NULL DEFAULT 'Normal' CHECK (status IN ('Normal', 'KEK', 'Risiko Tinggi')),
  anc_count      INT NOT NULL DEFAULT 0,
  kelurahan      TEXT NOT NULL,
  kecamatan      TEXT NOT NULL,
  kader_id       TEXT,
  alamat         TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_antropometri_anak_id ON public.antropometri_logs(anak_id);
CREATE INDEX IF NOT EXISTS idx_antropometri_tanggal ON public.antropometri_logs(tanggal);
CREATE INDEX IF NOT EXISTS idx_imunisasi_anak_id    ON public.imunisasi(anak_id);
CREATE INDEX IF NOT EXISTS idx_bayi_kader_id        ON public.bayi(kader_id);
CREATE INDEX IF NOT EXISTS idx_ibu_kader_id         ON public.ibu_hamil(kader_id);

-- ================= 4. SEED USERS + PROFILES =================
-- Password: kader123 / bidan123 / admin123 (bcrypt hash)

INSERT INTO public.users (id, email, password_hash) VALUES
  ('11111111-1111-1111-1111-111111111111', 'kader@posyandu.id',  '$2b$10$hesE4d4vPK1hvgAuL0GTv.MaA04oB9heDY15.5WRTpT665AngI.GS'),
  ('22222222-2222-2222-2222-222222222222', 'kader2@posyandu.id', '$2b$10$hesE4d4vPK1hvgAuL0GTv.MaA04oB9heDY15.5WRTpT665AngI.GS'),
  ('33333333-3333-3333-3333-333333333333', 'bidan@posyandu.id',  '$2b$10$cHu3xzNhbhJeB5pQYQS4Je2bDfJczrYKZoANMg6K.egp8v0p01A4G'),
  ('44444444-4444-4444-4444-444444444444', 'admin@dinkes.id',    '$2b$10$47xxyw1KPcabPTINZEerx.MZJDSuII3aJsbsFlYFJNUBLLpj13n9O')
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.profiles (id, full_name, role, phone, kelurahan, kecamatan, puskesmas, address) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Siti Aminah', 'kader', '0812-7001-2345', '30 Ilir', 'Ilir Barat I', 'Puskesmas Pembantu 30 Ilir', 'Jl. KH. Ahmad Dahlan No. 12'),
  ('22222222-2222-2222-2222-222222222222', 'Nur Halimah', 'kader', '0813-7002-8890', 'Plaju Ulu', 'Plaju', 'Puskesmas Plaju', 'Jl. Kompol H. Bari No. 45'),
  ('33333333-3333-3333-3333-333333333333', 'Bidan Dewi Lestari', 'bidan', '0811-7788-1234', 'Talang Betutu', 'Sukarami', 'Puskesmas Talang Betutu', 'Jl. Letda Mgs. S. Karim No. 8'),
  ('44444444-4444-4444-4444-444444444444', 'dr. Andi Pratama, MKM', 'admin', '0711-351-666', 'Demang Lebar Daun', 'Ilir Barat I', 'Dinas Kesehatan Kota Palembang', 'Jl. Merdeka No. 21 Palembang')
ON CONFLICT (id) DO NOTHING;

-- ================= 5. SEED DATA CONTOH =================

INSERT INTO public.bayi (id, nama, nama_ortu, jenis_kelamin, tgl_lahir, bb_lahir, tb_lahir, kelurahan, kecamatan, kader_id, alamat)
SELECT 'a1000001-0000-0000-0000-000000000001', 'Muhammad Rafa', 'Rina Marlina', 'L', '2025-03-15', 3.2, 49.5,
       '30 Ilir', 'Ilir Barat I', '11111111-1111-1111-1111-111111111111', 'RT 03 / RW 02'
WHERE NOT EXISTS (SELECT 1 FROM public.bayi WHERE id = 'a1000001-0000-0000-0000-000000000001');

INSERT INTO public.bayi (id, nama, nama_ortu, jenis_kelamin, tgl_lahir, bb_lahir, tb_lahir, kelurahan, kecamatan, kader_id, alamat)
SELECT 'a1000001-0000-0000-0000-000000000002', 'Aisyah Putri', 'Sari Wulandari', 'P', '2024-11-02', 3.0, 48.5,
       'Plaju Ulu', 'Plaju', '22222222-2222-2222-2222-222222222222', 'RT 05 / RW 01'
WHERE NOT EXISTS (SELECT 1 FROM public.bayi WHERE id = 'a1000001-0000-0000-0000-000000000002');

INSERT INTO public.bayi (id, nama, nama_ortu, jenis_kelamin, tgl_lahir, bb_lahir, tb_lahir, kelurahan, kecamatan, kader_id, alamat)
SELECT 'a1000001-0000-0000-0000-000000000003', 'Bima Ardiansyah', 'Dewi Anggraini', 'L', '2024-06-20', 2.9, 48.0,
       'Talang Betutu', 'Sukarami', '11111111-1111-1111-1111-111111111111', 'RT 02 / RW 04'
WHERE NOT EXISTS (SELECT 1 FROM public.bayi WHERE id = 'a1000001-0000-0000-0000-000000000003');

-- Log antropometri contoh
INSERT INTO public.antropometri_logs (anak_id, tanggal, bb, tb, lk, z, status, kenaikan, created_by, validated_by, validated_at)
SELECT 'a1000001-0000-0000-0000-000000000001', '2026-08-05', 8.6, 71.5, 43.5,
       '{"wfa":0.15,"hfa":-0.30,"wfh":0.50,"lk":0.20}'::jsonb, 'Normal', 'N',
       '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', '2026-08-06T09:00:00'
WHERE NOT EXISTS (SELECT 1 FROM public.antropometri_logs WHERE anak_id = 'a1000001-0000-0000-0000-000000000001' AND tanggal = '2026-08-05');

INSERT INTO public.antropometri_logs (anak_id, tanggal, bb, tb, lk, z, status, kenaikan, created_by, validated_by, validated_at)
SELECT 'a1000001-0000-0000-0000-000000000001', '2026-09-05', 9.1, 73.0, 44.0,
       '{"wfa":0.20,"hfa":-0.20,"wfh":0.60,"lk":0.25}'::jsonb, 'Normal', 'N',
       '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', '2026-09-06T09:00:00'
WHERE NOT EXISTS (SELECT 1 FROM public.antropometri_logs WHERE anak_id = 'a1000001-0000-0000-0000-000000000001' AND tanggal = '2026-09-05');

INSERT INTO public.antropometri_logs (anak_id, tanggal, bb, tb, lk, z, status, kenaikan, created_by, validated_by, validated_at)
SELECT 'a1000001-0000-0000-0000-000000000003', '2026-09-08', 10.2, 80.5, 47.0,
       '{"wfa":-1.30,"hfa":-1.80,"wfh":-0.90,"lk":-0.40}'::jsonb, 'Risiko', 'T',
       '11111111-1111-1111-1111-111111111111', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.antropometri_logs WHERE anak_id = 'a1000001-0000-0000-0000-000000000003' AND tanggal = '2026-09-08');

-- Imunisasi contoh
INSERT INTO public.imunisasi (anak_id, vaksin, tanggal, status, diberikan_oleh)
SELECT 'a1000001-0000-0000-0000-000000000001', v.vaksin, v.tanggal, 'completed', '33333333-3333-3333-3333-333333333333'
FROM (VALUES
  ('HB-0', '2025-03-15'::date),
  ('BCG', '2025-04-14'::date),
  ('Polio 1', '2025-04-14'::date),
  ('DPT-HB-Hib 1', '2025-05-15'::date),
  ('Polio 2', '2025-05-15'::date)
) AS v(vaksin, tanggal)
WHERE NOT EXISTS (
  SELECT 1 FROM public.imunisasi i
  WHERE i.anak_id = 'a1000001-0000-0000-0000-000000000001' AND i.vaksin = v.vaksin
);

-- Ibu hamil contoh
INSERT INTO public.ibu_hamil (nama, nik, usia_kehamilan, tgl_periksa, lila, status, anc_count, kelurahan, kecamatan, kader_id, alamat)
SELECT 'Rina Marlina', '1671234567890123', 24, '2026-09-10', 22.5, 'KEK', 3,
       '30 Ilir', 'Ilir Barat I', '11111111-1111-1111-1111-111111111111', 'RT 03 / RW 02'
WHERE NOT EXISTS (SELECT 1 FROM public.ibu_hamil WHERE nama = 'Rina Marlina' AND nik = '1671234567890123');

-- ================= SELESAI =================
-- Cek hasil:
--   SELECT u.email, p.role, p.full_name FROM public.users u JOIN public.profiles p ON p.id = u.id;
--   SELECT count(*) FROM public.bayi;