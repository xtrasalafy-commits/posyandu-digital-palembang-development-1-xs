// ============================================================
// DETAIL BAYI — riwayat lengkap, grafik tumbuh kembang,
// validasi bidan, dan intervensi
// ============================================================
import { ArrowLeft, Baby, CalendarCheck, CheckCircle2, Info, MapPin, Scale, ShieldCheck, Stethoscope, Syringe, TrendingDown, UserRound } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAnakDetail, useHapusLog, useImunisasi, useLogsAnak, useProfile, useValidasiLog } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Badge, Button, Card, EmptyState, Progress, Skeleton, useToast } from '../components/ui';
import { cn, fmtAngka, fmtTanggal, fmtZ, nav, umurLabel, WARNA_BG_SOFT, WARNA_TEKS } from '../lib/utils';
import { JADWAL_IMUNISASI } from '../lib/types';
import { STATUS_META } from '../lib/utils';

export default function DetailBayi({ id }: { id: string }) {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { data: anak, isLoading } = useAnakDetail(id);
  const { data: logs } = useLogsAnak(id);
  const { data: imunisasi } = useImunisasi(id);
  const validasi = useValidasiLog();
  const hapusLog = useHapusLog();
  const { toast } = useToast();

  if (isLoading || !anak) {
    return <div className="space-y-4"><Skeleton className="h-40" /><Skeleton className="h-80" /></div>;
  }

  const meta = anak.status ? STATUS_META[anak.status] : null;
  const log = anak.logTerakhir;
  const bahaya = ['Stunting', 'Wasting', 'Gizi Buruk'].includes(anak.status ?? '');
  const chartData = (logs ?? []).map((l) => ({
    tanggal: fmtTanggal(l.tanggal).split(' ').slice(0, 2).join(' '),
    wfa: l.z.wfa, hfa: l.z.hfa,
  }));
  const selesai = imunisasi?.filter((i) => i.status === 'completed').length ?? 0;
  const persenImunisasi = Math.round((selesai / JADWAL_IMUNISASI.length) * 100);

  const bisaValidasi = profile?.role === 'bidan' || profile?.role === 'admin';

  return (
    <div className="space-y-4">
      <button onClick={() => nav('/bayi')} className="flex items-center gap-1.5 text-sm font-bold text-teal-600 hover:text-teal-700">
        <ArrowLeft className="h-4 w-4" /> Kembali ke daftar balita
      </button>

      {/* Profil */}
      <Card className="overflow-hidden">
        <div className="h-2 w-full bg-gradient-to-r from-teal-500 via-emerald-400 to-teal-500" />
        <div className="flex flex-wrap items-center gap-4 p-5">
          <div className={cn('flex h-16 w-16 items-center justify-center rounded-3xl text-xl font-extrabold', meta ? WARNA_BG_SOFT[meta.warna] : WARNA_BG_SOFT.teal)}>
            <span className={meta ? WARNA_TEKS[meta.warna] : WARNA_TEKS.teal}>
              {anak.nama.split(' ').slice(0, 2).map((s) => s[0]).join('').toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-800">{anak.nama}</h1>
              {anak.status && <Badge warna={meta!.warna} dot className="text-sm px-3 py-1">{anak.status}</Badge>}
              {anak.tidakNaik && <Badge warna="red"><TrendingDown className="h-3 w-3" /> BB Tidak Naik</Badge>}
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-slate-500">
              <span>{anak.jenis_kelamin === 'L' ? '👦 Laki-laki' : '👧 Perempuan'} · {umurLabel(anak.tgl_lahir)}</span>
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {anak.kelurahan}, {anak.kecamatan}</span>
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
              <span className="flex items-center gap-1"><UserRound className="h-3 w-3" /> Ibu: {anak.nama_ortu}</span>
              <span className="flex items-center gap-1"><Baby className="h-3 w-3" /> Lahir {fmtTanggal(anak.tgl_lahir)} · BB {fmtAngka(anak.bb_lahir)} kg · TB {fmtAngka(anak.tb_lahir, 1)} cm</span>
            </p>
          </div>
          <Button onClick={() => nav(`/antropometri?anak=${anak.id}`)}>
            <Scale className="h-4.5 w-4.5" /> Catat Pengukuran
          </Button>
        </div>
      </Card>

      {/* Banner status */}
      {meta && (
        <div className={cn('rounded-2xl border-2 p-4', WARNA_BG_SOFT[meta.warna], bahaya && 'anim-pulse-soft')}>
          <div className="flex items-start gap-3">
            <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white', meta.warna === 'red' ? 'bg-red-500' : meta.warna === 'yellow' ? 'bg-amber-400' : 'bg-emerald-500')}>
              {bahaya ? <ShieldCheck className="h-5 w-5" /> : meta.warna === 'yellow' ? <Info className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
            </span>
            <div className="min-w-0">
              <p className={cn('font-extrabold', WARNA_TEKS[meta.warna])}>
                Status Gizi: {anak.status} — {meta.deskripsi}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-600">{log ? `Pengukuran terakhir ${fmtTanggal(log.tanggal)}. ` : ''}{STATUS_META[anak.status!].deskripsi}</p>
              {bahaya && (
                <p className="mt-2 rounded-xl bg-white/70 px-3 py-2 text-sm font-bold text-red-700">
                  🏥 Segera rujuk ke Puskesmas terdekat untuk penanganan lebih lanjut.
                </p>
              )}
            </div>
          </div>
          {log && (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: 'BB/U', v: log.z.wfa },
                { label: 'TB/U', v: log.z.hfa },
                { label: 'BB/TB', v: log.z.wfh },
                { label: 'LK/U', v: log.z.lk },
              ].map((i) => (
                <div key={i.label} className="rounded-xl bg-white/80 px-3 py-2 text-center">
                  <p className="text-[11px] font-bold text-slate-400">{i.label}</p>
                  <p className={cn('text-sm font-extrabold', (i.v ?? 0) < -2 ? 'text-red-500' : (i.v ?? 0) < -1.5 ? 'text-amber-500' : 'text-emerald-600')}>
                    {fmtZ(i.v)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Grafik tumbuh kembang */}
      <Card className="p-5">
        <div className="mb-3">
          <h3 className="font-extrabold text-slate-800">Kurva Pertumbuhan (Z-Score)</h3>
          <p className="text-xs font-semibold text-slate-400">BB/U & TB/U — garis putus-putus = batas -2 SD & -3 SD</p>
        </div>
        {chartData.length < 2 ? (
          <EmptyState icon={<Scale className="h-7 w-7" />} title="Belum cukup data untuk grafik" desc="Catat pengukuran minimal 2 kali agar kurva pertumbuhan muncul." />
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="tanggal" tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis domain={[-4, 3]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: any, n: any) => [Number(v).toFixed(2) + ' SD', n === 'wfa' ? 'BB/U' : 'TB/U']} contentStyle={{ borderRadius: 16, border: '1px solid #e2e8f0', fontWeight: 600, fontSize: 12 }} />
                <ReferenceLine y={-2} stroke="#f59e0b" strokeDasharray="6 4" />
                <ReferenceLine y={-3} stroke="#ef4444" strokeDasharray="6 4" />
                <Line type="monotone" dataKey="wfa" name="BB/U" stroke="#0d9488" strokeWidth={3} dot={{ r: 4, fill: '#0d9488' }} />
                <Line type="monotone" dataKey="hfa" name="TB/U" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: '#6366f1' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Riwayat pengukuran */}
        <Card className="p-5">
          <h3 className="mb-3 font-extrabold text-slate-800">Riwayat Pengukuran</h3>
          {(!logs || logs.length === 0) ? (
            <EmptyState icon={<Scale className="h-7 w-7" />} title="Belum ada pengukuran" />
          ) : (
            <div className="space-y-2">
              {[...logs].reverse().map((l) => {
                const m = STATUS_META[l.status];
                return (
                  <div key={l.id} className={cn('rounded-2xl border p-3.5', l.validated_by ? 'border-slate-100 bg-white' : 'border-amber-200 bg-amber-50/60')}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-extrabold text-slate-700">{fmtTanggal(l.tanggal)}</p>
                      <div className="flex items-center gap-1.5">
                        <Badge warna={m.warna} dot>{l.status}</Badge>
                        <Badge warna={l.kenaikan === 'N' ? 'green' : 'red'}>{l.kenaikan === 'N' ? 'Naik (N)' : 'Tidak Naik (T)'}</Badge>
                        {l.validated_by
                          ? <Badge warna="teal"><CheckCircle2 className="h-3 w-3" /> Valid</Badge>
                          : <Badge warna="yellow">Menunggu validasi</Badge>}
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-4 gap-2 text-center text-xs">
                      <div className="rounded-lg bg-slate-50 py-1.5"><p className="font-bold text-slate-400">BB</p><p className="font-extrabold text-slate-700">{fmtAngka(l.bb)} kg</p></div>
                      <div className="rounded-lg bg-slate-50 py-1.5"><p className="font-bold text-slate-400">TB</p><p className="font-extrabold text-slate-700">{fmtAngka(l.tb, 1)} cm</p></div>
                      <div className="rounded-lg bg-slate-50 py-1.5"><p className="font-bold text-slate-400">LK</p><p className="font-extrabold text-slate-700">{l.lk ? fmtAngka(l.lk, 1) + ' cm' : '-'}</p></div>
                      <div className="rounded-lg bg-slate-50 py-1.5"><p className="font-bold text-slate-400">Z BB/U</p><p className="font-extrabold text-slate-700">{fmtZ(l.z.wfa)}</p></div>
                    </div>
                    {bisaValidasi && !l.validated_by && (
                      <div className="mt-2.5 flex gap-2">
                        <Button size="sm" variant="soft" onClick={async () => {
                          await validasi.mutateAsync({ id: l.id, bidanId: user?.id ?? '' });
                          toast({ title: 'Data divalidasi ✓', desc: 'Pengukuran ini resmi disetujui bidan.', variant: 'success' });
                        }}>
                          <Stethoscope className="h-4 w-4" /> Setujui
                        </Button>
                        <Button size="sm" variant="secondary" onClick={async () => {
                          if (confirm('Hapus pengukuran ini? Tindakan tidak dapat dibatalkan.')) {
                            await hapusLog.mutateAsync(l.id);
                            toast({ title: 'Data dihapus', variant: 'info' });
                          }
                        }}>
                          Tolak & Hapus
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Imunisasi */}
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-extrabold text-slate-800"><Syringe className="h-5 w-5 text-teal-600" /> Imunisasi</h3>
            <Badge warna={persenImunisasi >= 90 ? 'green' : persenImunisasi >= 60 ? 'yellow' : 'red'}>{selesai}/{JADWAL_IMUNISASI.length} lengkap</Badge>
          </div>
          <div className="mb-4">
            <Progress value={persenImunisasi} warna={persenImunisasi >= 90 ? 'green' : persenImunisasi >= 60 ? 'yellow' : 'red'} />
            <p className="mt-1 text-xs font-semibold text-slate-400">Cakupan {persenImunisasi}% sesuai jadwal Kemenkes</p>
          </div>
          <div className="space-y-1.5">
            {JADWAL_IMUNISASI.map((v) => {
              const rec = imunisasi?.find((i) => i.vaksin === v.nama);
              const done = rec?.status === 'completed';
              return (
                <div key={v.nama} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5">
                  <span className={cn('flex h-8 w-8 items-center justify-center rounded-full text-xs font-extrabold', done ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400')}>
                    {done ? <CheckCircle2 className="h-4.5 w-4.5" /> : v.bulan}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm font-bold', done ? 'text-slate-700' : 'text-slate-400')}>{v.nama}</p>
                    <p className="text-[11px] font-semibold text-slate-400">{done && rec?.tanggal ? `Diberikan ${fmtTanggal(rec.tanggal)}` : `Usia ${v.bulan} bulan`}</p>
                  </div>
                  {done && <Badge warna="green">Selesai</Badge>}
                </div>
              );
            })}
          </div>
          <Button full variant="soft" className="mt-4" onClick={() => nav(`/imunisasi?anak=${anak.id}`)}>
            <CalendarCheck className="h-4 w-4" /> Kelola Imunisasi
          </Button>
        </Card>
      </div>
    </div>
  );
}
