-- ============================================================
-- POSYANDU DIGITAL PALEMBANG — DATABASE SCHEMA (Supabase)
-- ------------------------------------------------------------
-- Cara pakai:
--   1. Buka project Supabase → SQL Editor → New query
--   2. Copy-paste seluruh script ini → Run
--   3. Ulangi step ini jika menambah user baru (aman dijalankan
--      ulang, sudah pakai ON CONFLICT / IF NOT EXISTS)
--
-- PRASYARAT: 4 akun demo sudah dibuat di
--   Supabase Dashboard → Authentication → Users → Add user
--     kader@posyandu.id   / kader123
--     kader2@posyandu.id  / kader123
--     bidan@posyandu.id   / bidan123
--     admin@dinkes.id     / admin123
-- ============================================================

-- ================= 1. TABEL =================

-- Data pengguna (role: kader | bidan | admin)
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'kader' CHECK (role IN ('kader', 'bidan', 'admin')),
  phone       TEXT,
  address     TEXT,
  kelurahan   TEXT,
  kecamatan   TEXT,
  puskesmas   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

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
  validated_by UUID,
  validated_at TIMESTAMPTZ,
  created_by   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Imunisasi
CREATE TABLE IF NOT EXISTS public.imunisasi (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anak_id      UUID NOT NULL REFERENCES public.bayi(id) ON DELETE CASCADE,
  vaksin      TEXT NOT NULL,
  tanggal      DATE,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('completed', 'pending')),
  diberikan_oleh TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
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

-- Index untuk performa
CREATE INDEX IF NOT EXISTS idx_antropometri_anak_id ON public.antropometri_logs(anak_id);
CREATE INDEX IF NOT EXISTS idx_antropometri_tanggal ON public.antropometri_logs(tanggal);
CREATE INDEX IF NOT EXISTS idx_imunisasi_anak_id    ON public.imunisasi(anak_id);
CREATE INDEX IF NOT EXISTS idx_bayi_kader_id        ON public.bayi(kader_id);
CREATE INDEX IF NOT EXISTS idx_ibu_kader_id         ON public.ibu_hamil(kader_id);

-- ================= 2. ROW LEVEL SECURITY =================
-- Wajib di-enable agar tabel tidak bisa diakses anon (lewat anon key)
-- tapi tetap bisa dipakai user yang sudah login.

ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bayi              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.antropometri_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imunisasi         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ibu_hamil         ENABLE ROW LEVEL SECURITY;

-- profiles: user hanya bisa baca profil sendiri
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

-- Tabel operasional: semua user login bisa baca semua data
DROP POLICY IF EXISTS "bayi_select_all" ON public.bayi;
CREATE POLICY "bayi_select_all" ON public.bayi
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "logs_select_all" ON public.antropometri_logs;
CREATE POLICY "logs_select_all" ON public.antropometri_logs
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "imunisasi_select_all" ON public.imunisasi;
CREATE POLICY "imunisasi_select_all" ON public.imunisasi
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "ibu_select_all" ON public.ibu_hamil;
CREATE POLICY "ibu_select_all" ON public.ibu_hamil
  FOR SELECT TO authenticated USING (true);

-- Insert / Update / Delete untuk user yang sudah login
DROP POLICY IF EXISTS "bayi_write" ON public.bayi;
CREATE POLICY "bayi_write" ON public.bayi
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "logs_write" ON public.antropometri_logs;
CREATE POLICY "logs_write" ON public.antropometri_logs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "imunisasi_write" ON public.imunisasi;
CREATE POLICY "imunisasi_write" ON public.imunisasi
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "ibu_write" ON public.ibu_hamil;
CREATE POLICY "ibu_write" ON public.ibu_hamil
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ================= 3. SEED PROFILES =================
-- Menghubungkan setiap auth user (berdasarkan email) ke baris profil.
-- Jalankan SETELAH membuat user di Authentication → Users.

INSERT INTO public.profiles (id, full_name, role, phone, kelurahan, kecamatan, puskesmas, address)
SELECT au.id, 'Siti Aminah', 'kader', '0812-7001-2345', '30 Ilir', 'Ilir Barat I',
       'Puskesmas Pembantu 30 Ilir', 'Jl. KH. Ahmad Dahlan No. 12'
FROM auth.users au WHERE au.email = 'kader@posyandu.id'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, full_name, role, phone, kelurahan, kecamatan, puskesmas, address)
SELECT au.id, 'Nur Halimah', 'kader', '0813-7002-8890', 'Plaju Ulu', 'Plaju',
       'Puskesmas Plaju', 'Jl. Kompol H. Bari No. 45'
FROM auth.users au WHERE au.email = 'kader2@posyandu.id'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, full_name, role, phone, kelurahan, kecamatan, puskesmas, address)
SELECT au.id, 'Bidan Dewi Lestari', 'bidan', '0811-7788-1234', 'Talang Betutu', 'Sukarami',
       'Puskesmas Talang Betutu', 'Jl. Letda Mgs. S. Karim No. 8'
FROM auth.users au WHERE au.email = 'bidan@posyandu.id'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, full_name, role, phone, kelurahan, kecamatan, puskesmas, address)
SELECT au.id, 'dr. Andi Pratama, MKM', 'admin', '0711-351-666', 'Demang Lebar Daun', 'Ilir Barat I',
       'Dinas Kesehatan Kota Palembang', 'Jl. Merdeka No. 21 Palembang'
FROM auth.users au WHERE au.email = 'admin@dinkes.id'
ON CONFLICT (id) DO NOTHING;

-- ================= 4. SEED DATA CONTOH (opsional) =================
-- Beberapa data contoh agar dashboard tidak kosong setelah setup.
-- Aman dijalankan ulang (dihapus dulu baris lama milik seed ini).

INSERT INTO public.bayi (id, nama, nama_ortu, jenis_kelamin, tgl_lahir, bb_lahir, tb_lahir, kelurahan, kecamatan, kader_id, alamat)
SELECT 'a1000001-0000-0000-0000-000000000001', 'Muhammad Rafa', 'Rina Marlina', 'L', '2025-03-15', 3.2, 49.5,
       '30 Ilir', 'Ilir Barat I',
       (SELECT id::text FROM auth.users WHERE email = 'kader@posyandu.id'),
       'RT 03 / RW 02'
WHERE NOT EXISTS (SELECT 1 FROM public.bayi WHERE id = 'a1000001-0000-0000-0000-000000000001');

INSERT INTO public.bayi (id, nama, nama_ortu, jenis_kelamin, tgl_lahir, bb_lahir, tb_lahir, kelurahan, kecamatan, kader_id, alamat)
SELECT 'a1000001-0000-0000-0000-000000000002', 'Aisyah Putri', 'Sari Wulandari', 'P', '2024-11-02', 3.0, 48.5,
       'Plaju Ulu', 'Plaju',
       (SELECT id::text FROM auth.users WHERE email = 'kader2@posyandu.id'),
       'RT 05 / RW 01'
WHERE NOT EXISTS (SELECT 1 FROM public.bayi WHERE id = 'a1000001-0000-0000-0000-000000000002');

INSERT INTO public.bayi (id, nama, nama_ortu, jenis_kelamin, tgl_lahir, bb_lahir, tb_lahir, kelurahan, kecamatan, kader_id, alamat)
SELECT 'a1000001-0000-0000-0000-000000000003', 'Bima Ardiansyah', 'Dewi Anggraini', 'L', '2024-06-20', 2.9, 48.0,
       'Talang Betutu', 'Sukarami',
       (SELECT id::text FROM auth.users WHERE email = 'kader@posyandu.id'),
       'RT 02 / RW 04'
WHERE NOT EXISTS (SELECT 1 FROM public.bayi WHERE id = 'a1000001-0000-0000-0000-000000000003');

-- Log antropometri contoh (z-score dihitung manual pendekatan WHO)
INSERT INTO public.antropometri_logs (anak_id, tanggal, bb, tb, lk, z, status, kenaikan, created_by, validated_by, validated_at)
SELECT 'a1000001-0000-0000-0000-000000000001', '2026-08-05', 8.6, 71.5, 43.5,
       '{"wfa":0.15,"hfa":-0.30,"wfh":0.50,"lk":0.20}'::jsonb, 'Normal', 'N',
       (SELECT id::text FROM auth.users WHERE email = 'kader@posyandu.id'),
       (SELECT id FROM auth.users WHERE email = 'bidan@posyandu.id'), '2026-08-06T09:00:00'
WHERE NOT EXISTS (SELECT 1 FROM public.antropometri_logs WHERE anak_id = 'a1000001-0000-0000-0000-000000000001' AND tanggal = '2026-08-05');

INSERT INTO public.antropometri_logs (anak_id, tanggal, bb, tb, lk, z, status, kenaikan, created_by, validated_by, validated_at)
SELECT 'a1000001-0000-0000-0000-000000000001', '2026-09-05', 9.1, 73.0, 44.0,
       '{"wfa":0.20,"hfa":-0.20,"wfh":0.60,"lk":0.25}'::jsonb, 'Normal', 'N',
       (SELECT id::text FROM auth.users WHERE email = 'kader@posyandu.id'),
       (SELECT id FROM auth.users WHERE email = 'bidan@posyandu.id'), '2026-09-06T09:00:00'
WHERE NOT EXISTS (SELECT 1 FROM public.antropometri_logs WHERE anak_id = 'a1000001-0000-0000-0000-000000000001' AND tanggal = '2026-09-05');

INSERT INTO public.antropometri_logs (anak_id, tanggal, bb, tb, lk, z, status, kenaikan, created_by, validated_by, validated_at)
SELECT 'a1000001-0000-0000-0000-000000000003', '2026-09-08', 10.2, 80.5, 47.0,
       '{"wfa":-1.30,"hfa":-1.80,"wfh":-0.90,"lk":-0.40}'::jsonb, 'Risiko', 'T',
       (SELECT id::text FROM auth.users WHERE email = 'kader@posyandu.id'),
       NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.antropometri_logs WHERE anak_id = 'a1000001-0000-0000-0000-000000000003' AND tanggal = '2026-09-08');

-- Imunisasi contoh
INSERT INTO public.imunisasi (anak_id, vaksin, tanggal, status, diberikan_oleh)
SELECT 'a1000001-0000-0000-0000-000000000001', v.vaksin, v.tanggal, 'completed',
       (SELECT id::text FROM auth.users WHERE email = 'bidan@posyandu.id')
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
       '30 Ilir', 'Ilir Barat I',
       (SELECT id::text FROM auth.users WHERE email = 'kader@posyandu.id'),
       'RT 03 / RW 02'
WHERE NOT EXISTS (SELECT 1 FROM public.ibu_hamil WHERE nama = 'Rina Marlina' AND nik = '1671234567890123');

-- ================= SELESAI =================
-- Cek hasil:
--   SELECT email, role FROM auth.users u JOIN public.profiles p ON p.id = u.id;
--   SELECT count(*) FROM public.bayi;