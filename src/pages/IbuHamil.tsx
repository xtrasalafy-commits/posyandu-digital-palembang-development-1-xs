// ============================================================
// MANAJEMEN IBU HAMIL — profil, ANC, LILA & deteksi KEK
// ============================================================
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { CalendarCheck, HeartPulse, MapPin, Plus, Ruler, Stethoscope, UserPlus } from 'lucide-react';
import { statusLILA } from '../lib/antropometri';
import { useAddIbu, useIbuHamil, useProfile } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Avatar, Badge, Button, Card, Dialog, EmptyState, Field, Input, StatCard, useToast } from '../components/ui';
import { cn, fmtAngka, fmtTanggal, nav, WARNA_BG_SOFT, WARNA_TEKS } from '../lib/utils';
import type { IbuHamil as IbuT } from '../lib/types';

export default function IbuHamil() {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { data: ibu, isLoading } = useIbuHamil();
  const [dialogBuka, setDialogBuka] = useState(false);
  const [detail, setDetail] = useState<IbuT | null>(null);
  const { toast } = useToast();
  const addIbu = useAddIbu();

  const daftar = useMemo(() => {
    let list = ibu ?? [];
    if (profile?.role === 'kader') list = list.filter((i) => i.kader_id === user?.id);
    return [...list].sort((a, b) => b.usia_kehamilan - a.usia_kehamilan);
  }, [ibu, profile?.role, user?.id]);

  const kek = daftar.filter((i) => i.status !== 'Normal').length;
  const trimester3 = daftar.filter((i) => i.usia_kehamilan >= 28).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">Ibu Hamil</h1>
          <p className="text-sm font-medium text-slate-500">Cegah stunting sejak dalam kandungan — pantau LILA & ANC.</p>
        </div>
        <Button onClick={() => setDialogBuka(true)}>
          <UserPlus className="h-4.5 w-4.5" /> Daftarkan Ibu Hamil
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={<HeartPulse className="h-6 w-6" />} label="Total Terpantau" value={daftar.length} warna="teal" />
        <StatCard icon={<Ruler className="h-6 w-6" />} label="KEK / Risiko" value={kek} warna={kek > 0 ? 'yellow' : 'green'} />
        <StatCard icon={<CalendarCheck className="h-6 w-6" />} label="TM 3 (≥28 mg)" value={trimester3} warna="teal" />
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[1, 2, 3].map((i) => <div key={i} className="card-soft h-32 animate-pulse bg-slate-100" />)}
        </div>
      ) : daftar.length === 0 ? (
        <EmptyState
          icon={<HeartPulse className="h-7 w-7" />}
          title="Belum ada ibu hamil terdaftar"
          desc="Daftarkan ibu hamil untuk mulai pemantauan."
          action={<Button onClick={() => setDialogBuka(true)}><Plus className="h-4 w-4" /> Daftarkan</Button>}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {daftar.map((i) => {
            const lila = statusLILA(i.lila);
            const tm = i.usia_kehamilan < 14 ? 'TM 1' : i.usia_kehamilan < 28 ? 'TM 2' : 'TM 3';
            return (
              <Card key={i.id} onClick={() => setDetail(i)} className="p-4">
                <div className="flex items-start gap-3.5">
                  <Avatar nama={i.nama} warna={i.status === 'Normal' ? 'green' : i.status === 'KEK' ? 'yellow' : 'red'} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-extrabold text-slate-800">{i.nama}</p>
                      {i.status !== 'Normal' && <Badge warna={i.status === 'KEK' ? 'yellow' : 'red'} dot>{i.status}</Badge>}
                    </div>
                    <p className="mt-0.5 text-xs font-semibold text-slate-500">
                      Hamil {i.usia_kehamilan} minggu · {tm} · ANC {i.anc_count}x
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                      <MapPin className="h-3 w-3" /> {i.kelurahan} · Periksa terakhir {fmtTanggal(i.tgl_periksa)}
                    </p>
                  </div>
                  <div className={cn('flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl', WARNA_BG_SOFT[lila.warna])}>
                    <Ruler className={cn('h-4 w-4', WARNA_TEKS[lila.warna])} />
                    <span className={cn('text-xs font-extrabold', WARNA_TEKS[lila.warna])}>{fmtAngka(i.lila)}</span>
                  </div>
                </div>
                <p className={cn('mt-3 rounded-xl px-3 py-2 text-xs font-bold', WARNA_BG_SOFT[lila.warna], WARNA_TEKS[lila.warna])}>
                  {lila.pesan}
                </p>
              </Card>
            );
          })}
        </div>
      )}

      <FormIbu open={dialogBuka} onClose={() => setDialogBuka(false)} onSimpan={async (d) => {
        try {
          await addIbu.mutateAsync({ ...d, kader_id: user?.id });
          toast({ title: 'Ibu hamil berhasil didaftarkan! 🎉', variant: 'success' });
          setDialogBuka(false);
        } catch {
          toast({ title: 'Gagal menyimpan, coba lagi.', variant: 'error' });
        }
      }} />

      <DialogDetail ibu={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

function FormIbu({ open, onClose, onSimpan }: { open: boolean; onClose: () => void; onSimpan: (d: Partial<IbuT>) => Promise<void> }) {
  const [nama, setNama] = useState('');
  const [usia, setUsia] = useState('');
  const [lila, setLila] = useState('');
  const [kelurahan, setKelurahan] = useState('');
  const [alamat, setAlamat] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const lilaN = parseFloat(lila);
  const preview = !isNaN(lilaN) ? statusLILA(lilaN) : null;

  async function simpan(e: FormEvent) {
    e.preventDefault();
    if (!nama || !usia) { setErr('Nama dan usia kehamilan wajib diisi.'); return; }
    setLoading(true);
    await onSimpan({
      nama,
      usia_kehamilan: parseInt(usia),
      lila: isNaN(lilaN) ? 0 : lilaN,
      status: preview?.status ?? 'Normal',
      anc_count: 0,
      tgl_periksa: new Date().toISOString().slice(0, 10),
      kelurahan: kelurahan || profile?.kelurahan || '30 Ilir',
      alamat,
    });
    setLoading(false);
    setNama(''); setUsia(''); setLila(''); setAlamat('');
  }

  return (
    <Dialog open={open} onClose={onClose} title="Daftarkan Ibu Hamil" subtitle="Data awal — lengkapi saat pemeriksaan berikutnya.">
      <form onSubmit={simpan} className="space-y-4">
        <Field label="Nama Lengkap" required>
          <Input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="cth: Rina Marlina" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Usia Kehamilan (minggu)" required>
            <Input type="number" min="4" max="42" inputMode="numeric" value={usia} onChange={(e) => setUsia(e.target.value)} placeholder="cth: 24" />
          </Field>
          <Field label="LILA (cm)" hint="Ukur lengan atas. < 23,5 = KEK">
            <Input type="number" step="0.1" min="15" max="40" inputMode="decimal" value={lila} onChange={(e) => setLila(e.target.value)} placeholder="cth: 24.5" />
          </Field>
        </div>
        {preview && (
          <p className={cn('rounded-xl px-4 py-2.5 text-sm font-bold', WARNA_BG_SOFT[preview.warna], WARNA_TEKS[preview.warna])}>
            {preview.pesan}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Kelurahan">
            <Input value={kelurahan} onChange={(e) => setKelurahan(e.target.value)} placeholder="cth: 30 Ilir" />
          </Field>
          <Field label="Alamat (RT/RW)">
            <Input value={alamat} onChange={(e) => setAlamat(e.target.value)} placeholder="RT 03 / RW 01" />
          </Field>
        </div>
        {err && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600">{err}</p>}
        <Button type="submit" size="lg" full disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan Data'}</Button>
      </form>
    </Dialog>
  );
}

function DialogDetail({ ibu, onClose }: { ibu: IbuT | null; onClose: () => void }) {
  if (!ibu) return null;
  const lila = statusLILA(ibu.lila);
  const tm = ibu.usia_kehamilan < 14 ? 'Trimester 1' : ibu.usia_kehamilan < 28 ? 'Trimester 2' : 'Trimester 3';
  const taksiran = (() => {
    if (!ibu.usia_kehamilan) return '-';
    const d = new Date();
    d.setDate(d.getDate() + (40 - ibu.usia_kehamilan) * 7);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  })();
  return (
    <Dialog open={!!ibu} onClose={onClose} title={ibu.nama} subtitle={`${tm} · Hamil ${ibu.usia_kehamilan} minggu`}>
      <div className="space-y-4">
        <div className={cn('rounded-2xl border-2 p-4', WARNA_BG_SOFT[lila.warna])}>
          <p className={cn('font-extrabold', WARNA_TEKS[lila.warna])}>{lila.pesan}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">LILA {fmtAngka(ibu.lila)} cm — ambang normal ≥ 23,5 cm</p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-slate-50 p-3.5">
            <p className="text-xs font-bold text-slate-400">Perkiraan lahir</p>
            <p className="font-extrabold text-slate-700">{taksiran}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3.5">
            <p className="text-xs font-bold text-slate-400">Kunjungan ANC</p>
            <p className="font-extrabold text-slate-700">{ibu.anc_count}x</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3.5">
            <p className="text-xs font-bold text-slate-400">Periksa terakhir</p>
            <p className="font-extrabold text-slate-700">{fmtTanggal(ibu.tgl_periksa)}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3.5">
            <p className="text-xs font-bold text-slate-400">Wilayah</p>
            <p className="font-extrabold text-slate-700">{ibu.kelurahan}</p>
          </div>
        </div>
        <div className="rounded-2xl bg-teal-50 p-4">
          <p className="flex items-center gap-2 text-sm font-extrabold text-teal-800"><Stethoscope className="h-4 w-4" /> Rekomendasi</p>
          <p className="mt-1 text-xs font-semibold leading-relaxed text-teal-700">
            {ibu.status === 'Normal'
              ? 'Lanjutkan tablet tambah darah (Fe) 90 butir selama hamil, periksa ANC minimal 6x, dan konsumsi gizi seimbang.'
              : 'Segera konsultasi ke bidan/Puskesmas: PMT ibu hamil, tablet Fe, dan edukasi gizi. Pantau LILA setiap bulan.'}
          </p>
        </div>
        <Button full variant="soft" onClick={() => nav('/ibu')}>Kembali</Button>
      </div>
    </Dialog>
  );
}
