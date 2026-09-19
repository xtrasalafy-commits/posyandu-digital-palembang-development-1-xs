// ============================================================
// MODUL ANTROPOMETRI — input BB/TB/LK/LILA + kalkulasi z-score
// instan berdasarkan standar WHO/Kemenkes + validasi bidan
// ============================================================
import { useMemo, useState } from 'react';
import {
  AlertTriangle, Baby, CheckCircle2, Ruler, Scale, ShieldCheck, Sparkles, Stethoscope, Weight,
} from 'lucide-react';
import { cekKenaikan, hitungZScore, kategoriGizi, usiaBulanFloat } from '../lib/antropometri';
import { useAnakSemua, useHapusLog, useLogsAnak, useProfile, useStatistik, useValidasiLog, useAddLog } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Avatar, Badge, Button, Card, EmptyState, Field, Input, Select, Tabs, useToast } from '../components/ui';
import { cn, fmtAngka, fmtTanggal, fmtZ, tanggalISO, umurLabel, WARNA_BG_SOFT, WARNA_TEKS } from '../lib/utils';
import type { AntropometriLog } from '../lib/types';
import { STATUS_META } from '../lib/utils';

export default function Antropometri({ tabAwal, anakAwal }: { tabAwal?: string; anakAwal?: string }) {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { data: anakSemua } = useAnakSemua();
  const { data: stats } = useStatistik();
  const [tab, setTab] = useState(tabAwal === 'validasi' ? 'validasi' : 'ukur');

  const daftarAnak = useMemo(() => {
    let list = anakSemua ?? [];
    if (profile?.role === 'kader') list = list.filter((a) => a.kader_id === user?.id);
    return [...list].sort((a, b) => a.nama.localeCompare(b.nama));
  }, [anakSemua, profile?.role, user?.id]);

  const bisaValidasi = profile?.role === 'bidan' || profile?.role === 'admin';

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800">Catat Antropometri</h1>
        <p className="text-sm font-medium text-slate-500">Ukur, lihat status gizi langsung, tanpa hitung manual.</p>
      </div>

      <Tabs
        items={[
          { id: 'ukur', label: '📏 Input Pengukuran' },
          { id: 'riwayat', label: '🕒 Riwayat Terakhir' },
          ...(bisaValidasi ? [{ id: 'validasi', label: '🛡️ Validasi Bidan', badge: stats?.pendingValidasi }] : []),
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'ukur' && <FormUkur daftarAnak={daftarAnak} anakAwal={anakAwal} />}
      {tab === 'riwayat' && <Riwayat />}
      {tab === 'validasi' && bisaValidasi && <Validasi />}
    </div>
  );
}

// ================= FORM UTAMA =================
function FormUkur({ daftarAnak, anakAwal }: { daftarAnak: ReturnType<typeof useAnakSemua>['data'] extends (infer T)[] | null | undefined ? NonNullable<T>[] : never; anakAwal?: string }) {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const [anakId, setAnakId] = useState(anakAwal ?? '');
  const [tanggal, setTanggal] = useState(tanggalISO(new Date()));
  const [bb, setBb] = useState('');
  const [tb, setTb] = useState('');
  const [lk, setLk] = useState('');
  const [catatan, setCatatan] = useState('');
  const { toast } = useToast();
  const addLog = useAddLog();

  const anak = daftarAnak.find((a) => a.id === anakId) ?? null;
  const { data: logsAnak } = useLogsAnak(anakId || undefined);
  const prevLog = logsAnak && logsAnak.length > 0 ? logsAnak[logsAnak.length - 1] : null;

  const bbN = parseFloat(bb);
  const tbN = parseFloat(tb);
  const lkN = parseFloat(lk);

  // ⚡ KALKULASI INSTAN
  const hasil = useMemo(() => {
    if (!anak || isNaN(bbN) || isNaN(tbN)) return null;
    const z = hitungZScore(anak, bbN, tbN, isNaN(lkN) ? null : lkN, tanggal);
    const kat = kategoriGizi(z);
    const usia = usiaBulanFloat(anak.tgl_lahir, tanggal);
    const selisihHari = prevLog ? Math.max((new Date(tanggal).getTime() - new Date(prevLog.tanggal).getTime()) / 86400000, 1) : 30;
    const knk = cekKenaikan(usia, bbN, prevLog?.bb, selisihHari);
    return { z, ...kat, knk, usia };
  }, [anak, bbN, tbN, lkN, tanggal, prevLog]);

  const usiaLebih = anak ? usiaBulanFloat(anak.tgl_lahir, tanggal) > 60 : false;

  async function simpan() {
    if (!anak || !hasil) return;
    if (usiaLebih) {
      toast({ title: 'Anak sudah berusia di atas 5 tahun', desc: 'Modul ini khusus balita (0–60 bulan).', variant: 'error' });
      return;
    }
    const log: Partial<AntropometriLog> = {
      anak_id: anak.id,
      tanggal,
      bb: bbN,
      tb: tbN,
      lk: isNaN(lkN) ? null : lkN,
      z: hasil.z,
      status: hasil.status,
      kenaikan: hasil.knk.kenaikan,
      catatan: catatan || undefined,
      created_by: user?.id ?? '',
    };
    try {
      await addLog.mutateAsync(log);
      toast({
        title: 'Data berhasil disimpan! 🎉',
        desc: `${anak.nama} — status ${hasil.status}.`,
        variant: hasil.status === 'Normal' ? 'success' : 'info',
      });
      setBb(''); setTb(''); setLk(''); setCatatan('');
    } catch {
      toast({ title: 'Gagal menyimpan, coba lagi.', variant: 'error' });
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      {/* Form */}
      <Card className="p-5 lg:col-span-3">
        <div className="mb-4 flex items-center gap-2">
          <Scale className="h-5 w-5 text-teal-600" />
          <h3 className="font-extrabold text-slate-800">Form Pengukuran</h3>
        </div>

        <div className="space-y-4">
          <Field label="Pilih Balita" required hint={profile?.role === 'kader' ? 'Hanya balita binaan Anda.' : undefined}>
            <Select value={anakId} onChange={(e) => setAnakId(e.target.value)}>
              <option value="">— Pilih balita —</option>
              {daftarAnak.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nama} ({umurLabel(a.tgl_lahir)}, {a.kelurahan})
                </option>
              ))}
            </Select>
          </Field>

          {anak && (
            <div className={cn('flex items-center gap-3 rounded-2xl border p-3', WARNA_BG_SOFT[anak.status ? STATUS_META[anak.status].warna : 'teal'])}>
              <Avatar nama={anak.nama} warna={anak.status ? STATUS_META[anak.status].warna : 'teal'} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold text-slate-700">{anak.nama}</p>
                <p className="text-xs font-semibold text-slate-500">
                  {anak.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'} · {umurLabel(anak.tgl_lahir)}
                  {prevLog && <> · Pengukuran lalu: {fmtAngka(prevLog.bb)} kg ({fmtTanggal(prevLog.tanggal)})</>}
                </p>
              </div>
              <Badge warna={anak.status ? STATUS_META[anak.status].warna : 'slate'} dot>{anak.status ?? 'Belum diukur'}</Badge>
            </div>
          )}

          <Field label="Tanggal Pengukuran" required>
            <Input type="date" value={tanggal} max={tanggalISO(new Date())} onChange={(e) => setTanggal(e.target.value)} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Berat Badan (kg)" required>
              <div className="relative">
                <Weight className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />
                <Input
                  type="number" step="0.01" min="0.5" max="40" inputMode="decimal"
                  placeholder="cth: 9.8" className="pl-12 text-lg font-extrabold"
                  value={bb} onChange={(e) => setBb(e.target.value)}
                />
              </div>
            </Field>
            <Field label="TB / PB (cm)" required>
              <div className="relative">
                <Ruler className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />
                <Input
                  type="number" step="0.1" min="30" max="130" inputMode="decimal"
                  placeholder="cth: 76.4" className="pl-12 text-lg font-extrabold"
                  value={tb} onChange={(e) => setTb(e.target.value)}
                />
              </div>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Lingkar Kepala (cm)" hint="Opsional, tapi disarankan.">
              <Input type="number" step="0.1" min="25" max="60" inputMode="decimal" placeholder="cth: 44.5" value={lk} onChange={(e) => setLk(e.target.value)} />
            </Field>
            <Field label="Catatan">
              <Input placeholder="cth: sudah imunisasi MR" value={catatan} onChange={(e) => setCatatan(e.target.value)} />
            </Field>
          </div>

          {usiaLebih && (
            <p className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-700 ring-1 ring-amber-200">
              <AlertTriangle className="h-4 w-4" /> Anak berusia &gt; 5 tahun — modul ini khusus balita.
            </p>
          )}

          <Button size="lg" full onClick={simpan} disabled={!anak || !hasil || usiaLebih}>
            <CheckCircle2 className="h-5 w-5" /> Simpan Pengukuran
          </Button>
          <p className="text-center text-[11px] font-semibold text-slate-400">
            Status gizi dihitung otomatis dengan standar WHO & Kemenkes RI
          </p>
        </div>
      </Card>

      {/* Pratinjau instan */}
      <div className="lg:col-span-2">
        <div className="sticky top-20 space-y-3">
          <Card className={cn('p-5', hasil && hasil.warna === 'red' ? 'border-red-300 ring-2 ring-red-200' : hasil?.warna === 'yellow' ? 'border-amber-300 ring-2 ring-amber-200' : 'border-teal-200')}>
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-teal-600" />
              <h3 className="font-extrabold text-slate-800">Hasil Instan</h3>
              {hasil && <Badge warna="teal" className="ml-auto">LIVE</Badge>}
            </div>

            {!hasil ? (
              <EmptyState
                icon={<Scale className="h-7 w-7" />}
                title="Tunggu hasil di sini"
                desc="Pilih balita, isi BB & TB — status gizi langsung muncul."
              />
            ) : (
              <div className="space-y-3">
                <div className={cn('rounded-2xl border-2 p-4 text-center', WARNA_BG_SOFT[hasil.warna])}>
                  <p className="text-3xl font-extrabold">{hasil.status === 'Normal' ? '😊' : hasil.warna === 'yellow' ? '⚠️' : '🚨'} {hasil.status}</p>
                  <p className={cn('mt-1 text-sm font-bold', WARNA_TEKS[hasil.warna])}>{hasil.pesan}</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'BB/U (Berat)', v: hasil.z.wfa },
                    { label: 'TB/U (Tinggi)', v: hasil.z.hfa },
                    { label: 'BB/TB (Kurus)', v: hasil.z.wfh },
                    { label: 'LK/U (Kepala)', v: hasil.z.lk },
                  ].map((i) => (
                    <div key={i.label} className={cn('rounded-2xl border p-3 text-center', (i.v ?? 0) < -2 ? 'border-red-200 bg-red-50' : (i.v ?? 0) < -1.5 ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50')}>
                      <p className="text-[11px] font-bold text-slate-400">{i.label}</p>
                      <p className={cn('text-lg font-extrabold', (i.v ?? 0) < -2 ? 'text-red-600' : (i.v ?? 0) < -1.5 ? 'text-amber-600' : 'text-emerald-600')}>
                        {fmtZ(i.v)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className={cn('flex items-center gap-2 rounded-2xl border p-3', hasil.knk.warna === 'red' ? 'border-red-200 bg-red-50' : hasil.knk.warna === 'yellow' ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50')}>
                  <span className="text-xl">{hasil.knk.kenaikan === 'N' ? '📈' : '📉'}</span>
                  <div>
                    <p className={cn('text-sm font-extrabold', WARNA_TEKS[hasil.knk.warna])}>
                      {hasil.knk.kenaikan === 'N' ? 'Berat badan naik (N)' : 'Berat badan TIDAK NAIK (T)'}
                    </p>
                    <p className="text-xs font-semibold text-slate-500">{hasil.knk.label} · dibanding pengukuran lalu</p>
                  </div>
                </div>

                <p className="rounded-xl bg-teal-50 px-3.5 py-2.5 text-xs font-semibold leading-relaxed text-teal-800">
                  💡 <b>Saran:</b> {hasil.saran}
                </p>
              </div>
            )}
          </Card>

          {profile?.role === 'kader' && (
            <Card className="flex items-center gap-3 bg-gradient-to-r from-teal-600 to-emerald-600 p-4 text-white">
              <Baby className="h-8 w-8 shrink-0 text-teal-100" />
              <p className="text-xs font-bold leading-relaxed">
                Tips: ukur di waktu yang sama setiap bulan, gunakan timbangan yang sama, dan pastikan anak tidak memakai baju tebal. 💚
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ================= RIWAYAT =================
function Riwayat() {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { data: anakSemua } = useAnakSemua();
  const [anakId, setAnakId] = useState('');
  const { data: logs } = useLogsAnak(anakId || undefined);

  const daftar = (anakSemua ?? []).filter((a) => profile?.role !== 'kader' || a.kader_id === user?.id);

  return (
    <Card className="p-5">
      <Field label="Pilih Balita">
        <Select value={anakId} onChange={(e) => setAnakId(e.target.value)}>
          <option value="">— Pilih balita —</option>
          {daftar.map((a) => <option key={a.id} value={a.id}>{a.nama} ({umurLabel(a.tgl_lahir)})</option>)}
        </Select>
      </Field>
      <div className="mt-4">
        {!anakId ? (
          <EmptyState icon={<Scale className="h-7 w-7" />} title="Pilih balita untuk melihat riwayat" />
        ) : !logs || logs.length === 0 ? (
          <EmptyState icon={<Scale className="h-7 w-7" />} title="Belum ada pengukuran" />
        ) : (
          <div className="space-y-2">
            {[...logs].reverse().map((l) => (
              <div key={l.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 p-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-extrabold text-slate-700">{fmtTanggal(l.tanggal)}</p>
                    <Badge warna={STATUS_META[l.status].warna} dot>{l.status}</Badge>
                    <Badge warna={l.kenaikan === 'N' ? 'green' : 'red'}>{l.kenaikan === 'N' ? 'N' : 'T'}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs font-semibold text-slate-400">
                    BB {fmtAngka(l.bb)} kg · TB {fmtAngka(l.tb, 1)} cm · LK {l.lk ? fmtAngka(l.lk, 1) + ' cm' : '-'} · Z BB/U {fmtZ(l.z.wfa)}
                  </p>
                </div>
                {!l.validated_by && (
                  <Badge warna="yellow" className="text-[10px]">Menunggu validasi</Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

// ================= VALIDASI BIDAN =================
function Validasi() {
  const { user } = useAuth();
  const { data: anakSemua } = useAnakSemua();
  const { data: stats } = useStatistik();
  const validasi = useValidasiLog();
  const hapusLog = useHapusLog();
  const { toast } = useToast();

  const pending = useMemo(() => {
    const logsAll = anakSemua?.flatMap((a) => (a.logTerakhir && !a.logTerakhir.validated_by ? [a.logTerakhir] : [])) ?? [];
    return logsAll;
  }, [anakSemua]);

  const namaAnak = (id: string) => anakSemua?.find((a) => a.id === id)?.nama ?? 'Unknown';

  return (
    <div className="space-y-3">
      <Card className="flex items-center gap-3 border-teal-200 bg-teal-50/60 p-4">
        <ShieldCheck className="h-8 w-8 text-teal-600" />
        <p className="text-sm font-bold text-teal-800">
          {stats?.pendingValidasi ?? 0} pengukuran menunggu persetujuan bidan. Validasi memastikan data yang masuk ke Dinas Kesehatan akurat.
        </p>
      </Card>
      {pending.length === 0 ? (
        <EmptyState icon={<CheckCircle2 className="h-7 w-7" />} title="Semua data sudah divalidasi 🎉" desc="Tidak ada antrean validasi saat ini." />
      ) : (
        pending.map((l) => {
          const kat = STATUS_META[l.status];
          return (
            <Card key={l.id} className={cn('p-4', kat.warna === 'red' ? 'border-red-200 bg-red-50/40' : kat.warna === 'yellow' ? 'border-amber-200 bg-amber-50/40' : 'border-slate-200')}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <Avatar nama={namaAnak(l.anak_id)} warna={kat.warna} />
                  <div>
                    <p className="font-extrabold text-slate-800">{namaAnak(l.anak_id)}</p>
                    <p className="text-xs font-semibold text-slate-400">{fmtTanggal(l.tanggal)} · oleh Kader</p>
                  </div>
                </div>
                <Badge warna={kat.warna} dot>{l.status}</Badge>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-xl bg-white py-2 ring-1 ring-slate-100"><p className="font-bold text-slate-400">BB</p><p className="font-extrabold text-slate-700">{fmtAngka(l.bb)} kg</p></div>
                <div className="rounded-xl bg-white py-2 ring-1 ring-slate-100"><p className="font-bold text-slate-400">TB</p><p className="font-extrabold text-slate-700">{fmtAngka(l.tb, 1)} cm</p></div>
                <div className="rounded-xl bg-white py-2 ring-1 ring-slate-100"><p className="font-bold text-slate-400">Z BB/U</p><p className="font-extrabold text-slate-700">{fmtZ(l.z.wfa)}</p></div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="soft" className="flex-1" onClick={async () => {
                  await validasi.mutateAsync({ id: l.id, bidanId: user?.id ?? '' });
                  toast({ title: 'Data disetujui ✓', desc: `${namaAnak(l.anak_id)} — pengukuran valid.`, variant: 'success' });
                }}>
                  <Stethoscope className="h-4 w-4" /> Setujui
                </Button>
                <Button size="sm" variant="secondary" onClick={async () => {
                  if (confirm('Tolak & hapus pengukuran ini?')) {
                    await hapusLog.mutateAsync(l.id);
                    toast({ title: 'Pengukuran ditolak & dihapus', variant: 'info' });
                  }
                }}>
                  Tolak
                </Button>
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}
