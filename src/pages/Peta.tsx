// ============================================================
// PETA SEBARAN — distribusi balita berisiko per wilayah
// ============================================================
import { useMemo, useState } from 'react';
import { ArrowLeft, Baby, MapPin, ShieldAlert, TrendingDown } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAnakSemua, useStatistik } from '../lib/api';
import { Avatar, Badge, Card, EmptyState } from '../components/ui';
import { cn, fmtAngka, nav, umurLabel } from '../lib/utils';
import { STATUS_META } from '../lib/utils';

export default function Peta() {
  const { data: anakSemua } = useAnakSemua();
  const { data: stats } = useStatistik();
  const [kelTerpilih, setKelTerpilih] = useState<string | null>(null);

  const kelData = useMemo(() => {
    return Object.entries(stats?.perKelurahan ?? {})
      .map(([nama, v]) => ({ nama, ...v, bahaya: v.bahaya, prevalensi: v.total ? Math.round((v.bahaya / v.total) * 100) : 0 }))
      .sort((a, b) => b.bahaya - a.bahaya || b.prevalensi - a.prevalensi);
  }, [stats]);

  const totalBahaya = kelData.reduce((s, k) => s + k.bahaya, 0);

  const anakKel = useMemo(() => {
    if (!kelTerpilih) return [];
    let list = anakSemua ?? [];
    list = list.filter((a) => a.kelurahan === kelTerpilih);
    return list.sort((a, b) => {
      const rank = { 'Gizi Buruk': 0, Stunting: 1, Wasting: 2, Risiko: 3, Normal: 4 } as Record<string, number>;
      return (rank[a.status ?? 'Normal'] ?? 5) - (rank[b.status ?? 'Normal'] ?? 5);
    });
  }, [anakSemua, kelTerpilih]);

  const warnaKel = (bahaya: number, total: number) => {
    if (total === 0) return 'slate';
    const pct = bahaya / total;
    if (bahaya === 0) return 'green';
    if (pct < 0.25) return 'yellow';
    return 'red';
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800">Peta Sebaran Risiko</h1>
        <p className="text-sm font-medium text-slate-500">Sebaran balita stunting/gizi buruk per kelurahan se-Kota Palembang.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <p className="text-2xl font-extrabold text-slate-800">{kelData.length}</p>
          <p className="text-[11px] font-bold text-slate-400">Kelurahan</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-extrabold text-red-500">{totalBahaya}</p>
          <p className="text-[11px] font-bold text-slate-400">Balita Berisiko</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-extrabold text-teal-600">{stats?.totalBayi ?? 0}</p>
          <p className="text-[11px] font-bold text-slate-400">Total Balita</p>
        </Card>
      </div>

      {/* Grafik per kelurahan */}
      <Card className="p-5">
        <h3 className="font-extrabold text-slate-800">Jumlah Balita Berisiko per Kelurahan</h3>
        <p className="mb-3 text-xs font-semibold text-slate-400">Merah = stunting/wasting/gizi buruk · Kuning = risiko</p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={kelData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="nama" tick={{ fontSize: 9.5, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} interval={0} angle={-30} textAnchor="end" height={54} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(v: any, n: any) => [v + ' balita', n === 'bahaya' ? 'Stunting/Gizi Buruk' : n === 'risiko' ? 'Risiko' : 'Total']}
                contentStyle={{ borderRadius: 16, border: '1px solid #e2e8f0', fontWeight: 600, fontSize: 12 }}
              />
              <Bar dataKey="bahaya" name="Bahaya" radius={[6, 6, 0, 0]} maxBarSize={22}>
                {kelData.map((k) => (
                  <Cell key={k.nama} fill={k.bahaya > 0 ? '#ef4444' : '#a7f3d0'} />
                ))}
              </Bar>
              <Bar dataKey="risiko" name="Risiko" fill="#fbbf24" radius={[6, 6, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Grid kelurahan */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 font-extrabold text-slate-800">
          <MapPin className="h-5 w-5 text-teal-600" /> Peta Kelurahan — ketuk untuk lihat balita
        </h3>
        {kelData.length === 0 ? (
          <EmptyState icon={<MapPin className="h-7 w-7" />} title="Belum ada data wilayah" />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {kelData.map((k) => {
              const w = warnaKel(k.bahaya, k.total);
              return (
                <button
                  key={k.nama}
                  onClick={() => setKelTerpilih(kelTerpilih === k.nama ? null : k.nama)}
                  className={cn(
                    'rounded-2xl border-2 p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md',
                    kelTerpilih === k.nama ? 'border-teal-500 ring-4 ring-teal-500/15' : '',
                    w === 'red' ? 'border-red-200 bg-red-50' : w === 'yellow' ? 'border-amber-200 bg-amber-50' : w === 'green' ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-extrabold text-slate-700">{k.nama}</p>
                    <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg text-xs font-extrabold text-white', w === 'red' ? 'bg-red-500' : w === 'yellow' ? 'bg-amber-400' : w === 'green' ? 'bg-emerald-500' : 'bg-slate-400')}>
                      {k.total}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] font-semibold text-slate-400">{k.kecamatan}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge warna={w} dot>{k.bahaya > 0 ? `${k.bahaya} berisiko` : 'Aman'}</Badge>
                    {k.bahaya > 0 && <span className="text-[11px] font-extrabold text-red-500">{k.prevalensi}%</span>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Daftar anak per kelurahan */}
      {kelTerpilih && (
        <div className="space-y-3">
          <button onClick={() => setKelTerpilih(null)} className="flex items-center gap-1.5 text-sm font-bold text-teal-600">
            <ArrowLeft className="h-4 w-4" /> Tutup daftar {kelTerpilih}
          </button>
          {anakKel.length === 0 ? (
            <EmptyState icon={<Baby className="h-7 w-7" />} title="Tidak ada balita di kelurahan ini" />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {anakKel.map((a) => {
                const meta = a.status ? STATUS_META[a.status] : null;
                return (
                  <Card key={a.id} onClick={() => nav(`/bayi/${a.id}`)} className={cn('flex items-center gap-3.5 p-4', meta?.warna === 'red' && 'border-red-200 bg-red-50/50')}>
                    <Avatar nama={a.nama} warna={meta?.warna ?? 'teal'} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="font-extrabold text-slate-800">{a.nama}</p>
                        {a.status && <Badge warna={meta!.warna} dot>{a.status}</Badge>}
                      </div>
                      <p className="mt-0.5 text-xs font-semibold text-slate-500">
                        {a.jenis_kelamin === 'L' ? '👦' : '👧'} {umurLabel(a.tgl_lahir)}
                        {a.logTerakhir && <> · BB {fmtAngka(a.logTerakhir.bb)} kg</>}
                      </p>
                      {a.tidakNaik && (
                        <p className="mt-1 flex items-center gap-1 text-[11px] font-extrabold text-red-500">
                          <TrendingDown className="h-3 w-3" /> Berat badan tidak naik bulan ini
                        </p>
                      )}
                    </div>
                    {meta?.warna === 'red' && <ShieldAlert className="h-5 w-5 shrink-0 text-red-500" />}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
