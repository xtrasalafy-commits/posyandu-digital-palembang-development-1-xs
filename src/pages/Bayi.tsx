// ============================================================
// MANAJEMEN BAYI & BALITA — daftar + pendaftaran baru
// ============================================================
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Baby, ChevronRight, Filter, MapPin, Plus, Scale, Search, TrendingDown, UserPlus } from 'lucide-react';
import { useAddBayi, useAnakSemua, useProfile } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Avatar, Badge, Button, Card, Dialog, EmptyState, Field, Input, Segmented, Select, useToast } from '../components/ui';
import { cn, fmtAngka, nav, umurLabel } from '../lib/utils';
import type { Bayi as BayiT } from '../lib/types';
import { STATUS_META } from '../lib/utils';

const FILTER_STATUS = [
  { id: 'semua', label: 'Semua' },
  { id: 'Normal', label: 'Normal' },
  { id: 'Risiko', label: 'Perlu Perhatian' },
  { id: 'bahaya', label: 'Stunting/Gizi Buruk' },
  { id: 'tidakNaik', label: 'BB Tidak Naik' },
];

export default function Bayi() {
  const { user } = useAuth();
  const { data: anakSemua, isLoading } = useAnakSemua();
  const { data: profile } = useProfile(user?.id);
  const [cari, setCari] = useState('');
  const [filterStatus, setFilterStatus] = useState('semua');
  const [filterKel, setFilterKel] = useState('semua');
  const [dialogBuka, setDialogBuka] = useState(false);
  const { toast } = useToast();
  const addBayi = useAddBayi();

  const daftar = useMemo(() => {
    let list = anakSemua ?? [];
    if (profile?.role === 'kader') list = list.filter((a) => a.kader_id === user?.id);
    if (cari) {
      const q = cari.toLowerCase();
      list = list.filter((a) => a.nama.toLowerCase().includes(q) || a.nama_ortu.toLowerCase().includes(q));
    }
    if (filterKel !== 'semua') list = list.filter((a) => a.kelurahan === filterKel);
    if (filterStatus === 'bahaya') list = list.filter((a) => ['Stunting', 'Wasting', 'Gizi Buruk'].includes(a.status ?? ''));
    else if (filterStatus === 'tidakNaik') list = list.filter((a) => a.tidakNaik);
    else if (filterStatus !== 'semua') list = list.filter((a) => a.status === filterStatus);
    return list.sort((a, b) => a.nama.localeCompare(b.nama));
  }, [anakSemua, cari, filterStatus, filterKel, profile?.role, user?.id]);

  const kelurahanList = useMemo(() => {
    const set = new Set<string>();
    (anakSemua ?? []).forEach((a) => set.add(a.kelurahan));
    return [...set].sort();
  }, [anakSemua]);

  const jumlah = (st: string) => {
    let list = anakSemua ?? [];
    if (profile?.role === 'kader') list = list.filter((a) => a.kader_id === user?.id);
    if (st === 'bahaya') return list.filter((a) => ['Stunting', 'Wasting', 'Gizi Buruk'].includes(a.status ?? '')).length;
    if (st === 'tidakNaik') return list.filter((a) => a.tidakNaik).length;
    return list.filter((a) => a.status === st).length;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">Bayi & Balita</h1>
          <p className="text-sm font-medium text-slate-500">Pantau tumbuh kembang balita binaan.</p>
        </div>
        <Button onClick={() => setDialogBuka(true)}>
          <UserPlus className="h-4.5 w-4.5" /> Daftarkan Balita
        </Button>
      </div>

      {/* Filter status */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {FILTER_STATUS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilterStatus(f.id)}
            className={cn(
              'flex items-center gap-1.5 whitespace-nowrap rounded-full border-2 px-4 py-2 text-sm font-bold transition-all',
              filterStatus === f.id
                ? f.id === 'bahaya' ? 'border-red-500 bg-red-50 text-red-600'
                  : f.id === 'Risiko' ? 'border-amber-400 bg-amber-50 text-amber-600'
                  : f.id === 'tidakNaik' ? 'border-rose-400 bg-rose-50 text-rose-600'
                  : 'border-teal-500 bg-teal-50 text-teal-700'
                : 'border-slate-200 bg-white text-slate-500'
            )}
          >
            {f.label}
            <span className={cn('rounded-full px-1.5 text-[11px] font-extrabold', filterStatus === f.id ? 'bg-white/70' : 'bg-slate-100')}>
              {f.id === 'semua' ? (anakSemua ?? []).length : jumlah(f.id)}
            </span>
          </button>
        ))}
      </div>

      {/* Pencarian */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />
          <Input placeholder="Cari nama balita atau ibu..." value={cari} onChange={(e) => setCari(e.target.value)} className="pl-12" />
        </div>
        <div className="relative sm:w-56">
          <Filter className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-300" />
          <Select value={filterKel} onChange={(e) => setFilterKel(e.target.value)} className="pl-11">
            <option value="semua">Semua Kelurahan</option>
            {kelurahanList.map((k) => <option key={k} value={k}>{k}</option>)}
          </Select>
        </div>
      </div>

      {/* Daftar */}
      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="card-soft h-28 animate-pulse bg-slate-100" />)}
        </div>
      ) : daftar.length === 0 ? (
        <EmptyState
          icon={<Baby className="h-7 w-7" />}
          title="Tidak ada balita ditemukan"
          desc="Coba ubah kata kunci atau filter, atau daftarkan balita baru."
          action={<Button onClick={() => setDialogBuka(true)}><Plus className="h-4 w-4" /> Daftarkan Balita</Button>}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {daftar.map((a) => {
            const meta = a.status ? STATUS_META[a.status] : null;
            return (
              <Card key={a.id} onClick={() => nav(`/bayi/${a.id}`)} className="flex items-center gap-3.5 p-4">
                <Avatar nama={a.nama} warna={meta?.warna ?? 'teal'} className="h-13 w-13 rounded-2xl text-base" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="font-extrabold text-slate-800">{a.nama}</p>
                    {a.status && <Badge warna={meta!.warna} dot>{a.status}</Badge>}
                  </div>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs font-semibold text-slate-500">
                    <span>{a.jenis_kelamin === 'L' ? '👦 Laki-laki' : '👧 Perempuan'} · {umurLabel(a.tgl_lahir)}</span>
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {a.kelurahan}</span>
                    {a.logTerakhir && (
                      <>
                        <span>BB {fmtAngka(a.logTerakhir.bb)} kg</span>
                        <span>TB {fmtAngka(a.logTerakhir.tb, 1)} cm</span>
                        {a.tidakNaik && (
                          <span className="flex items-center gap-0.5 font-extrabold text-red-500">
                            <TrendingDown className="h-3 w-3" /> T
                          </span>
                        )}
                      </>
                    )}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); nav(`/antropometri?anak=${a.id}`); }}
                    className="flex items-center gap-1 rounded-xl bg-teal-600 px-3 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-teal-700"
                  >
                    <Scale className="h-3.5 w-3.5" /> Ukur
                  </button>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <FormDaftarBalita
        open={dialogBuka}
        onClose={() => setDialogBuka(false)}
        onSimpan={async (data) => {
          try {
            await addBayi.mutateAsync({ ...data, kader_id: user?.id });
            toast({ title: 'Balita berhasil didaftarkan! 🎉', desc: 'Sekarang catat pengukuran pertama.', variant: 'success' });
            setDialogBuka(false);
          } catch {
            toast({ title: 'Gagal menyimpan, coba lagi.', variant: 'error' });
          }
        }}
      />
    </div>
  );
}

// ================= Form Pendaftaran Balita =================
function FormDaftarBalita({ open, onClose, onSimpan }: {
  open: boolean;
  onClose: () => void;
  onSimpan: (d: Partial<BayiT>) => Promise<void>;
}) {
  const [nama, setNama] = useState('');
  const [namaOrtu, setNamaOrtu] = useState('');
  const [jk, setJk] = useState<'L' | 'P'>('L');
  const [tglLahir, setTglLahir] = useState('');
  const [bbLahir, setBbLahir] = useState('');
  const [tbLahir, setTbLahir] = useState('');
  const [kelurahan, setKelurahan] = useState('');
  const [alamat, setAlamat] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const kelDefault = profile?.kelurahan ?? '';

  async function simpan(e: FormEvent) {
    e.preventDefault();
    setErr('');
    if (!nama || !tglLahir || !bbLahir || !tbLahir) {
      setErr('Lengkapi nama, tanggal lahir, BB & TB lahir ya.');
      return;
    }
    setLoading(true);
    await onSimpan({
      nama, nama_ortu: namaOrtu || '-', jenis_kelamin: jk,
      tgl_lahir: tglLahir,
      bb_lahir: parseFloat(bbLahir), tb_lahir: parseFloat(tbLahir),
      kelurahan: kelurahan || kelDefault || '30 Ilir',
      alamat,
    });
    setLoading(false);
    setNama(''); setNamaOrtu(''); setBbLahir(''); setTbLahir(''); setAlamat('');
  }

  return (
    <Dialog open={open} onClose={onClose} title="Daftarkan Balita Baru" subtitle="Lengkapi data kelahiran — minim ketik, pilih saja.">
      <form onSubmit={simpan} className="space-y-4">
        <Field label="Nama Lengkap Balita" required>
          <Input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="cth: Muhammad Rafa" />
        </Field>
        <Field label="Nama Ibu / Orang Tua">
          <Input value={namaOrtu} onChange={(e) => setNamaOrtu(e.target.value)} placeholder="cth: Rina Marlina" />
        </Field>
        <Field label="Jenis Kelamin" required>
          <Segmented<'L' | 'P'>
            options={[{ value: 'L', label: '👦 Laki-laki' }, { value: 'P', label: '👧 Perempuan' }]}
            value={jk}
            onChange={setJk}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tanggal Lahir" required>
            <Input type="date" value={tglLahir} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setTglLahir(e.target.value)} />
          </Field>
          <Field label="Kelurahan">
            <Input value={kelurahan || kelDefault} onChange={(e) => setKelurahan(e.target.value)} placeholder="cth: 30 Ilir" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="BB Lahir (kg)" required>
            <Input type="number" step="0.01" min="0.5" max="6" inputMode="decimal" value={bbLahir} onChange={(e) => setBbLahir(e.target.value)} placeholder="3.2" />
          </Field>
          <Field label="TB Lahir (cm)" required>
            <Input type="number" step="0.1" min="30" max="60" inputMode="decimal" value={tbLahir} onChange={(e) => setTbLahir(e.target.value)} placeholder="49" />
          </Field>
        </div>
        <Field label="Alamat (RT/RW)">
          <Input value={alamat} onChange={(e) => setAlamat(e.target.value)} placeholder="RT 05 / RW 02" />
        </Field>
        {err && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600">{err}</p>}
        <Button type="submit" size="lg" full disabled={loading}>
          {loading ? 'Menyimpan...' : 'Simpan Data Balita'}
        </Button>
      </form>
    </Dialog>
  );
}


