// ============================================================
// HALAMAN MASUK — Supabase Auth (dengan akun demo 1-klik)
// ============================================================
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Baby, Eye, EyeOff, HeartHandshake, Lock, Mail, ShieldCheck, UserRound, Stethoscope } from 'lucide-react';
import { login } from '../lib/auth';
import { Button, Field, Input, useToast } from '../components/ui';
import { isDemoMode, resetDemoData } from '../lib/db';
import ilustrasiLogin from '../assets/ilustrasi-login.png';

const AKUN_DEMO = [
  { role: 'Kader Posyandu', nama: 'Siti Aminah', email: 'kader@posyandu.id', sandi: 'kader123', icon: UserRound, warna: 'bg-teal-500' },
  { role: 'Bidan / Puskesmas', nama: 'Bidan Dewi Lestari', email: 'bidan@posyandu.id', sandi: 'bidan123', icon: Stethoscope, warna: 'bg-emerald-500' },
  { role: 'Dinas Kesehatan', nama: 'dr. Andi Pratama', email: 'admin@dinkes.id', sandi: 'admin123', icon: ShieldCheck, warna: 'bg-slate-600' },
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [sandi, setSandi] = useState('');
  const [lihatSandi, setLihatSandi] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  async function masuk(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!email || !sandi) {
      setError('Isi email dan kata sandi dulu ya.');
      return;
    }
    setLoading(true);
    const { error: err } = await login(email, sandi);
    setLoading(false);
    if (err) {
      const msg = String(err.message || 'Gagal masuk. Coba lagi.');
      // Error khas Supabase Auth saat email/password tidak cocok ATAU user belum dibuat
      if (/invalid login credentials/i.test(msg)) {
        setError('Email atau kata sandi salah — ATAU akun ini belum dibuat di server Supabase. Buat user di Supabase Dashboard → Authentication → Users, atau jalankan supabase/schema.sql.');
      } else {
        setError(msg);
      }
    } else {
      toast({ title: 'Selamat datang kembali! 👋', desc: 'Siap bantu cegah stunting hari ini.', variant: 'success' });
    }
  }

  async function masukDemo(demo: (typeof AKUN_DEMO)[number]) {
    setLoading(true);
    setError('');
    const { error: err } = await login(demo.email, demo.sandi);
    setLoading(false);
    if (err) setError(err.message);
    else toast({ title: `Masuk sebagai ${demo.role}`, desc: `Halo, ${demo.nama}!`, variant: 'success' });
  }

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* Panel kiri — brand & ilustrasi */}
      <div className="relative flex flex-col justify-center overflow-hidden bg-gradient-to-br from-teal-600 via-teal-500 to-emerald-500 px-6 py-10 text-white lg:w-[46%] lg:px-14">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10" />
        <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-white/10" />
        <div className="relative mx-auto w-full max-w-md">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-teal-600 shadow-lg">
              <Baby className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold leading-tight">Posyandu Digital</h1>
              <p className="text-sm font-bold text-teal-100">Kota Palembang</p>
            </div>
          </div>
          <img
            src={ilustrasiLogin}
            alt="Ibu dan bayi sehat"
            className="mx-auto mb-6 hidden w-full max-w-sm rounded-3xl bg-white/15 p-3 shadow-2xl backdrop-blur lg:block"
          />
          <h2 className="text-2xl font-extrabold leading-snug lg:text-3xl">
            Cegah Stunting,<br />Pantau Tumbuh Kembang <span className="text-amber-300">Bersama-sama</span>
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-teal-50/90">
            Aplikasi pendamping kader & bidan se-Kota Palembang: catat antropometri, deteksi dini risiko, dan laporkan ke Dinas Kesehatan — semua dari genggaman.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 text-xs font-bold">
            <span className="rounded-full bg-white/15 px-3 py-1.5 backdrop-blur">📏 Deteksi dini z-score WHO</span>
            <span className="rounded-full bg-white/15 px-3 py-1.5 backdrop-blur">🚨 Sistem peringatan dini</span>
            <span className="rounded-full bg-white/15 px-3 py-1.5 backdrop-blur">📊 Laporan otomatis</span>
          </div>
        </div>
      </div>

      {/* Panel kanan — form masuk */}
      <div className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-md anim-slide-up">
          <div className="mb-6 text-center lg:text-left">
            <h3 className="text-2xl font-extrabold text-slate-800">Masuk Aplikasi</h3>
            <p className="mt-1 text-sm text-slate-500">Silakan masuk dengan akun Anda.</p>
          </div>

          <form onSubmit={masuk} className="space-y-4">
            <Field label="Email" required>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />
                <Input
                  type="email" inputMode="email" placeholder="nama@posyandu.id"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className="pl-12"
                />
              </div>
            </Field>
            <Field label="Kata Sandi" required>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />
                <Input
                  type={lihatSandi ? 'text' : 'password'} placeholder="••••••••"
                  value={sandi} onChange={(e) => setSandi(e.target.value)}
                  className="pl-12 pr-12"
                />
                <button
                  type="button" onClick={() => setLihatSandi((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:text-teal-600"
                >
                  {lihatSandi ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </Field>
            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 ring-1 ring-red-100">
                {error}
              </p>
            )}
            <Button type="submit" size="lg" full disabled={loading} className="text-base">
              {loading ? 'Sebentar...' : 'Masuk'}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs font-bold text-slate-400">
            <span className="h-px flex-1 bg-slate-200" /> ATAU COBA AKUN DEMO <span className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="space-y-2.5">
            {AKUN_DEMO.map((d) => (
              <button
                key={d.email}
                onClick={() => masukDemo(d)}
                disabled={loading}
                className="flex w-full items-center gap-3.5 rounded-2xl border-2 border-teal-100 bg-white p-3.5 text-left transition-all hover:border-teal-400 hover:shadow-md disabled:opacity-50"
              >
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl text-white ${d.warna}`}>
                  <d.icon className="h-5.5 w-5.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-extrabold text-slate-700">{d.role}</span>
                  <span className="block truncate text-xs font-semibold text-slate-400">{d.email}</span>
                </span>
                <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-extrabold text-teal-600">1-KLIK</span>
              </button>
            ))}
          </div>

          {isDemoMode ? (
            <div className="mt-6 flex items-center justify-between rounded-2xl border border-dashed border-teal-200 bg-teal-50/60 px-4 py-3 text-xs text-teal-700">
              <span className="flex items-center gap-2 font-semibold">
                <HeartHandshake className="h-4 w-4" /> Mode demo dengan data contoh
              </span>
              <button
                onClick={() => { resetDemoData(); toast({ title: 'Data contoh dimuat ulang', variant: 'info' }); }}
                className="font-extrabold underline underline-offset-2 hover:text-teal-900"
              >
                Reset data
              </button>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs">
              <p className="flex items-center gap-2 font-bold text-slate-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Terhubung ke server database (online)
              </p>
              <p className="mt-1.5 leading-relaxed text-slate-500">
                Login memakai data dari server. Akun demo sudah dibuat otomatis
                oleh <code className="rounded bg-white px-1.5 py-0.5 text-[10px]">neon/schema.sql</code>.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
