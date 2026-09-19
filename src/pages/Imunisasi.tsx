// ============================================================
// MODUL IMUNISASI — ceklis jadwal vaksin Kemenkes (1 ketukan)
// ============================================================
import { useMemo, useState } from 'react';
import { CheckCircle2, Circle, PlusCircle, Syringe } from 'lucide-react';
import { useAnakSemua, useImunisasi, useProfile, useSetImunisasi } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Avatar, Badge, Button, Card, EmptyState, Field, Progress, Select, useToast } from '../components/ui';
import { cn, fmtTanggal, nav, umurLabel } from '../lib/utils';
import { JADWAL_IMUNISASI } from '../lib/types';
import { usiaBulanFloat } from '../lib/antropometri';

export default function Imunisasi({ anakAwal }: { anakAwal?: string }) {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { data: anakSemua } = useAnakSemua();
  const [anakId, setAnakId] = useState(anakAwal ?? '');
  const { data: imunisasi } = useImunisasi(anakId || undefined);
  const setImun = useSetImunisasi();
  const { toast } = useToast();

  const daftar = useMemo(() => {
    let list = anakSemua ?? [];
    if (profile?.role === 'kader') list = list.filter((a) => a.kader_id === user?.id);
    return [...list].sort((a, b) => a.nama.localeCompare(b.nama));
  }, [anakSemua, profile?.role, user?.id]);

  const anak = daftar.find((a) => a.id === anakId);
  const usia = anak ? usiaBulanFloat(anak.tgl_lahir) : 0;
  const selesai = imunisasi?.filter((i) => i.status === 'completed').length ?? 0;
  const persen = Math.round((selesai / JADWAL_IMUNISASI.length) * 100);
  const tertunda = imunisasi?.filter((i) => i.status === 'pending' && usiaBulanFloat(anak?.tgl_lahir ?? '') >= JADWAL_IMUNISASI.find((v) => v.nama === i.vaksin)?.bulan!) ?? [];

  async function toggle(vaksin: string, done: boolean) {
    try {
      await setImun.mutateAsync({ anakId, vaksin, status: done ? 'pending' : 'completed', oleh: user?.id ?? '' });
      toast({
        title: done ? 'Vaksin dibatalkan' : 'Imunisasi dicatat! 💉',
        desc: done ? undefined : `${vaksin} selesai diberikan.`,
        variant: done ? 'info' : 'success',
      });
    } catch {
      toast({ title: 'Gagal menyimpan, coba lagi.', variant: 'error' });
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800">Imunisasi</h1>
        <p className="text-sm font-medium text-slate-500">Ceklis jadwal imunisasi sesuai rekomendasi Kemenkes RI.</p>
      </div>

      <Card className="p-5">
        <Field label="Pilih Balita" required>
          <Select value={anakId} onChange={(e) => setAnakId(e.target.value)}>
            <option value="">— Pilih balita —</option>
            {daftar.map((a) => (
              <option key={a.id} value={a.id}>{a.nama} ({umurLabel(a.tgl_lahir)})</option>
            ))}
          </Select>
        </Field>

        {!anak ? (
          <div className="mt-4">
            <EmptyState icon={<Syringe className="h-7 w-7" />} title="Pilih balita untuk mulai" desc="Ceklis vaksin yang sudah diberikan." />
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-teal-50/70 p-4">
              <Avatar nama={anak.nama} />
              <div className="min-w-0 flex-1">
                <p className="font-extrabold text-slate-800">{anak.nama}</p>
                <p className="text-xs font-semibold text-slate-500">Usia {umurLabel(anak.tgl_lahir)} · {anak.kelurahan}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-extrabold text-teal-700">{persen}%</p>
                <p className="text-[11px] font-bold text-slate-400">lengkap</p>
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-xs font-bold">
                <span className="text-slate-500">Progres imunisasi</span>
                <span className="text-slate-400">{selesai} dari {JADWAL_IMUNISASI.length} vaksin</span>
              </div>
              <Progress value={persen} warna={persen >= 90 ? 'green' : persen >= 60 ? 'yellow' : 'red'} />
            </div>

            {tertunda.length > 0 && (
              <p className="rounded-xl bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-700 ring-1 ring-amber-200">
                ⚠️ {tertunda.length} vaksin sudah waktunya tetapi belum diberikan!
              </p>
            )}

            <div className="space-y-2">
              {JADWAL_IMUNISASI.map((v) => {
                const rec = imunisasi?.find((i) => i.vaksin === v.nama);
                const done = rec?.status === 'completed';
                const sudahWaktunya = usia >= v.bulan;
                return (
                  <button
                    key={v.nama}
                    onClick={() => toggle(v.nama, done)}
                    disabled={!sudahWaktunya && !done}
                    className={cn(
                      'flex w-full items-center gap-3.5 rounded-2xl border-2 p-3.5 text-left transition-all',
                      done ? 'border-emerald-200 bg-emerald-50/70' : sudahWaktunya ? 'border-teal-200 bg-white hover:border-teal-400 hover:shadow-sm' : 'border-slate-100 bg-slate-50/60 opacity-60'
                    )}
                  >
                    <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', done ? 'bg-emerald-500 text-white' : sudahWaktunya ? 'bg-white text-teal-500 ring-2 ring-teal-200' : 'bg-slate-200 text-slate-400')}>
                      {done ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn('block text-sm font-extrabold', done ? 'text-emerald-800' : 'text-slate-700')}>{v.nama}</span>
                      <span className="block text-[11px] font-semibold text-slate-400">
                        {done && rec?.tanggal ? `✅ Diberikan ${fmtTanggal(rec.tanggal)}` : sudahWaktunya ? `Sudah waktunya (usia ${v.bulan} bln) — ketuk untuk mencatat` : `Belum waktunya (usia ${v.bulan} bln)`}
                      </span>
                    </span>
                    {done ? <Badge warna="green">Selesai</Badge> : sudahWaktunya ? <Badge warna="yellow">Belum</Badge> : <Badge warna="slate">Jadwal</Badge>}
                  </button>
                );
              })}
            </div>

            <Button full variant="soft" onClick={() => nav(`/bayi/${anak.id}`)}>
              <PlusCircle className="h-4 w-4" /> Lihat Detail Balita
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
