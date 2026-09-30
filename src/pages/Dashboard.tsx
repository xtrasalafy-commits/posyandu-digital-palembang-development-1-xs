// ============================================================
// DASHBOARD UTAMA — ringkasan visual & sistem peringatan dini
// ============================================================
import {
  AlertTriangle, ArrowRight, Baby, CheckCircle2, HeartPulse, MapPin,
  Scale, ShieldAlert, TrendingDown, TrendingUp, Users, Syringe, Activity,
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useAnakSemua, useProfile, useStatistik } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Badge, Button, Card, EmptyState, Skeleton, StatCard } from '../components/ui';
import { cn, fmtAngka, nav, umurLabel } from '../lib/utils';

function KartuPeringatan({ anak, onKlik }: { anak: any; onKlik: () => void }) {
  const bahaya = ['Stunting', 'Wasting', 'Gizi Buruk'].includes(anak.status);
  const log = anak.logTerakhir;
  return (
    <Card
      onClick={onKlik}
      className={cn(
        'flex items-center gap-3.5 p-4',
        bahaya
          ? 'border-red-300 bg-gradient-to-r from-red-50 to-rose-50/50 ring-1 ring-red-200'
          : 'border-amber-200 bg-amber-50/50'
      )}
    >
      <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-md', bahaya ? 'bg-red-500 shadow-red-500/30' : 'bg-amber-400 shadow-amber-400/30')}>
        {bahaya ? <ShieldAlert className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-extrabold text-slate-800">{anak.nama}</p>
          <Badge warna={bahaya ? 'red' : 'yellow'} dot>{anak.status}</Badge>
          {anak.tidakNaik && <Badge warna="red">Tidak Naik (T)</Badge>}
        </div>
        <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-slate-500">
          <MapPin className="h-3 w-3" /> {anak.kelurahan} · {umurLabel(anak.tgl_lahir)}
          {log && <> · BB {fmtAngka(log.bb)} kg</>}
        </p>
      </div>
      <ArrowRight className="h-5 w-5 shrink-0 text-slate-300" />
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { data: anakSemua, isLoading } = useAnakSemua();
  const role = profile?.role ?? 'kader';
  const scope = role === 'kader' ? { kader_id: user?.id } : undefined;
  const { data: stats } = useStatistik(scope);

  if (isLoading || !stats) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  const daftarPeringatan = (anakSemua ?? [])
    .filter((a) => a.status === 'Stunting' || a.status === 'Wasting' || a.status === 'Gizi Buruk' || a.status === 'Risiko' || a.tidakNaik)
    .sort((a, b) => {
      const rank = { 'Gizi Buruk': 0, Stunting: 1, Wasting: 2, Risiko: 3 } as Record<string, number>;
      return (rank[a.status ?? ''] ?? 4) - (rank[b.status ?? ''] ?? 4);
    })
    .slice(0, 6);

  const sebaranKec = Object.entries(stats.perKecamatan)
    .map(([nama, v]) => ({ nama, bahaya: v.bahaya, risiko: v.risiko, total: v.total }))
    .sort((a, b) => b.bahaya - a.bahaya);

  const pieData = [
    { name: 'Normal', value: stats.sehat, color: '#10b981' },
    { name: 'Risiko', value: stats.risiko, color: '#f59e0b' },
    { name: 'Stunting', value: Object.values(stats.perKecamatan).reduce((s, v) => s + v.bahaya, 0), color: '#ef4444' },
  ].filter((d) => d.value > 0);

  const prevalensi = stats.totalBayi ? Math.round((stats.bahaya / stats.totalBayi) * 1000) / 10 : 0;
  const trenTurun = stats.trenZ.length > 1 && stats.trenZ[stats.trenZ.length - 1].wfa >= stats.trenZ[0].wfa;

  return (
    <div className="space-y-5">
      {/* Sapaan */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">
            Halo, selamat datang! 👋
          </h1>
          <p className="text-sm font-medium text-slate-500">
            {role === 'admin' && 'Ringkasan pencegahan stunting se-Kota Palembang.'}
            {role === 'bidan' && 'Pantau validasi data dan kondisi balita di wilayah Anda.'}
            {role === 'kader' && 'Catat pengukuran bulanan dan pantau balita binaan Anda.'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="soft" onClick={() => nav('/bayi')}>
            <Baby className="h-4.5 w-4.5" /> Balita
          </Button>
          <Button onClick={() => nav('/antropometri')}>
            <Scale className="h-4.5 w-4.5" /> Catat Ukur
          </Button>
        </div>
      </div>

      {/* Kartu statistik */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<Users className="h-6 w-6" />} label="Balita Terdaftar" value={stats.totalBayi} warna="teal" sub={`${stats.totalIbu} ibu hamil terpantau`} onClick={() => nav('/bayi')} />
        <StatCard icon={<CheckCircle2 className="h-6 w-6" />} label="Status Normal" value={stats.sehat} warna="green" sub="Tumbuh kembang baik" onClick={() => nav('/bayi')} />
        <StatCard icon={<AlertTriangle className="h-6 w-6" />} label="Perlu Perhatian" value={stats.risiko} warna="yellow" sub={`${stats.tidakNaik} anak BB tidak naik`} onClick={() => nav('/bayi')} />
        <StatCard
          icon={<ShieldAlert className="h-6 w-6" />}
          label="Stunting / Gizi Buruk" value={stats.bahaya} warna="red"
          sub={`Prevalensi ${fmtAngka(prevalensi, 1)}%`}
          onClick={() => nav('/peta')}
        />
      </div>

      {/* Banner peringatan */}
      {(stats.bahaya > 0 || stats.tidakNaik > 0) && (
        <div className={cn('flex items-center gap-3 rounded-2xl border px-4 py-3.5 anim-pulse-soft', stats.bahaya > 0 ? 'border-red-300 bg-red-50' : 'border-amber-300 bg-amber-50')}>
          <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white', stats.bahaya > 0 ? 'bg-red-500' : 'bg-amber-400')}>
            <AlertTriangle className="h-5 w-5" />
          </span>
          <p className={cn('text-sm font-bold', stats.bahaya > 0 ? 'text-red-700' : 'text-amber-700')}>
            {stats.bahaya > 0
              ? `⚠️ ${stats.bahaya} balita membutuhkan intervensi segera — cek daftar peringatan di bawah!`
              : `⚠️ ${stats.tidakNaik} balita berat badannya tidak naik bulan ini.`}
          </p>
        </div>
      )}

      {/* Grafik */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-800">Tren Z-Score Rata-rata</h3>
              <p className="text-xs font-semibold text-slate-400">6 bulan terakhir · garis -2 SD = batas risiko</p>
            </div>
            <span className={cn('flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold', trenTurun ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600')}>
              {trenTurun ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {trenTurun ? 'Membaik' : 'Waspada'}
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.trenZ} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="bulan" tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis domain={[-4, 2]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v: any, nama: any) => [Number(v).toFixed(2) + ' SD', nama === 'wfa' ? 'BB/U' : 'TB/U']}
                  contentStyle={{ borderRadius: 16, border: '1px solid #e2e8f0', fontWeight: 600, fontSize: 12 }}
                />
                <ReferenceLine y={-2} stroke="#f59e0b" strokeDasharray="6 4" label={{ value: '-2 SD', position: 'insideBottomRight', fontSize: 10, fill: '#d97706', fontWeight: 700 }} />
                <ReferenceLine y={-3} stroke="#ef4444" strokeDasharray="6 4" label={{ value: '-3 SD', position: 'insideBottomLeft', fontSize: 10, fill: '#dc2626', fontWeight: 700 }} />
                <Line type="monotone" dataKey="wfa" name="BB/U" stroke="#0d9488" strokeWidth={3} dot={{ r: 4, fill: '#0d9488' }} />
                <Line type="monotone" dataKey="hfa" name="TB/U" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: '#6366f1' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex gap-4 text-xs font-bold text-slate-500">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-teal-600" /> BB/U (Berat)</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-indigo-500" /> TB/U (Tinggi)</span>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-extrabold text-slate-800">Distribusi Status Gizi</h3>
          <p className="mb-2 text-xs font-semibold text-slate-400">Berdasarkan pengukuran terakhir</p>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={3} strokeWidth={2}>
                  {pieData.map((d) => <Cell key={d.name} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(v: any, n: any) => [`${v} balita`, n]} contentStyle={{ borderRadius: 16, border: '1px solid #e2e8f0', fontWeight: 600, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5">
            {pieData.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-semibold text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} /> {d.name}
                </span>
                <span className="font-extrabold text-slate-700">{d.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Sebaran kecamatan + Peringatan */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-800">Sebaran Risiko per Kecamatan</h3>
              <p className="text-xs font-semibold text-slate-400">Jumlah balita berstatus stunting / gizi buruk</p>
            </div>
            <Button variant="soft" size="sm" onClick={() => nav('/peta')}>
              <MapPin className="h-4 w-4" /> Peta
            </Button>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sebaranKec} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="nama" tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} interval={0} angle={-18} textAnchor="end" height={44} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: any, n: any) => [v + ' balita', n === 'bahaya' ? 'Stunting/Gizi Buruk' : n === 'risiko' ? 'Risiko' : 'Total']} contentStyle={{ borderRadius: 16, border: '1px solid #e2e8f0', fontWeight: 600, fontSize: 12 }} />
                <Bar dataKey="bahaya" name="Bahaya" fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={26} />
                <Bar dataKey="risiko" name="Risiko" fill="#fbbf24" radius={[6, 6, 0, 0]} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <HeartPulse className="h-5 w-5 text-red-500" />
            <h3 className="font-extrabold text-slate-800">Ibu Hamil</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-2xl bg-teal-50 px-4 py-3">
              <span className="text-sm font-bold text-slate-600">Total terpantau</span>
              <span className="text-xl font-extrabold text-teal-700">{stats.totalIbu}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-amber-50 px-4 py-3">
              <span className="text-sm font-bold text-slate-600">KEK / Risiko</span>
              <span className="text-xl font-extrabold text-amber-600">{stats.ibuKEK}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-red-50 px-4 py-3">
              <span className="text-sm font-bold text-slate-600">Menunggu validasi</span>
              <span className="text-xl font-extrabold text-red-500">{stats.pendingValidasi}</span>
            </div>
            <Button full variant="soft" onClick={() => nav('/ibu')}>
              Kelola Ibu Hamil <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>

      {/* Peringatan dini */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-extrabold text-slate-800">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
            </span>
            Peringatan Dini
          </h3>
          <Button variant="ghost" size="sm" onClick={() => nav('/bayi')}>
            Lihat semua <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
        {daftarPeringatan.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="h-7 w-7" />}
            title="Tidak ada peringatan aktif 🎉"
            desc="Semua balita dalam kondisi terpantau. Pertahankan!"
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {daftarPeringatan.map((a) => (
              <KartuPeringatan key={a.id} anak={a} onKlik={() => nav(`/bayi/${a.id}`)} />
            ))}
          </div>
        )}
      </div>

      {/* Aksi cepat kader */}
      <Card className="bg-gradient-to-br from-teal-600 to-emerald-600 p-5 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Activity className="h-8 w-8 text-teal-100" />
            <div>
              <h3 className="font-extrabold">Jadwal Posyandu Bulan Ini</h3>
              <p className="text-sm text-teal-100">
                {role === 'kader' ? `Binaan Anda: ${stats.totalBayi} balita, ${stats.totalIbu} ibu hamil.` : 'Semua kegiatan terpantau digital, data real-time.'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => nav('/imunisasi')}>
              <Syringe className="h-4 w-4 text-teal-600" /> Imunisasi
            </Button>
            <Button className="bg-white text-teal-700 hover:bg-teal-50" onClick={() => nav('/antropometri')}>
              <Scale className="h-4 w-4" /> Ukur Sekarang
            </Button>
          </div>
        </div>
      </Card>

      <p className="pb-2 text-center text-[11px] font-semibold text-slate-400">
        Data tersimpan aman di Neon PostgreSQL · Posyandu Digital Palembang
      </p>
    </div>
  );
}
