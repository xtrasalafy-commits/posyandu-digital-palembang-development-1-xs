// ============================================================
// LAPORAN BULANAN — rekap per kelurahan + ekspor PDF & Excel
// ============================================================
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Download, FileSpreadsheet, FileText, Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAnakSemua, useStatistik } from '../lib/api';
import { Badge, Button, Card, EmptyState, Input, useToast } from '../components/ui';
import { fmtBulanTahun } from '../lib/utils';
import type { AntropometriLog } from '../lib/types';

interface BarisLaporan {
  kelurahan: string;
  kecamatan: string;
  ditimbang: number;
  naik: number;
  tidakNaik: number;
  normal: number;
  risiko: number;
  bahaya: number;
}

export default function Laporan() {
  const now = new Date();
  const [bulan, setBulan] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const { data: anakSemua } = useAnakSemua();
  const { data: stats } = useStatistik();
  const { toast } = useToast();

  const { data: logs, isLoading } = useQuery({
    queryKey: ['laporan-logs', bulan],
    queryFn: async () => {
      const awal = bulan + '-01';
      const akhir = bulan + '-31';
      const { data } = await supabase.from('antropometri_logs').select('*').gte('tanggal', awal).lte('tanggal', akhir);
      return (data ?? []) as AntropometriLog[];
    },
  });

  const baris = useMemo<BarisLaporan[]>(() => {
    const anakList = anakSemua ?? [];
    const byKel = new Map<string, BarisLaporan>();
    const statusTerakhir = new Map<string, AntropometriLog>();

    (logs ?? []).forEach((l) => {
      const prev = statusTerakhir.get(l.anak_id);
      if (!prev || l.tanggal > prev.tanggal) statusTerakhir.set(l.anak_id, l);
    });

    // Inisialisasi semua kelurahan (agar kelurahan tanpa kunjungan tetap muncul)
    anakList.forEach((a) => {
      if (!byKel.has(a.kelurahan)) {
        byKel.set(a.kelurahan, { kelurahan: a.kelurahan, kecamatan: a.kecamatan, ditimbang: 0, naik: 0, tidakNaik: 0, normal: 0, risiko: 0, bahaya: 0 });
      }
    });

    statusTerakhir.forEach((l, anakId) => {
      const anak = anakList.find((a) => a.id === anakId);
      const kel = anak?.kelurahan ?? 'Lainnya';
      const r = byKel.get(kel) ?? { kelurahan: kel, kecamatan: anak?.kecamatan ?? '-', ditimbang: 0, naik: 0, tidakNaik: 0, normal: 0, risiko: 0, bahaya: 0 };
      r.ditimbang++;
      if (l.kenaikan === 'T') r.tidakNaik++; else r.naik++;
      if (['Stunting', 'Wasting', 'Gizi Buruk'].includes(l.status)) r.bahaya++;
      else if (l.status === 'Risiko' || l.status === 'Berat Lebih') r.risiko++;
      else if (l.status === 'Normal') r.normal++;
      byKel.set(kel, r);
    });

    return [...byKel.values()].sort((a, b) => b.ditimbang - a.ditimbang);
  }, [logs, anakSemua]);

  const total = baris.reduce(
    (acc, r) => ({ ditimbang: acc.ditimbang + r.ditimbang, naik: acc.naik + r.naik, tidakNaik: acc.tidakNaik + r.tidakNaik, bahaya: acc.bahaya + r.bahaya }),
    { ditimbang: 0, naik: 0, tidakNaik: 0, bahaya: 0 }
  );
  const cakupan = stats?.totalBayi ? Math.round((total.ditimbang / stats.totalBayi) * 100) : 0;

  async function eksporPDF() {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setFillColor(13, 148, 136);
    doc.rect(0, 0, 297, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('LAPORAN BULANAN POSYANDU DIGITAL PALEMBANG', 14, 12);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Periode: ${fmtBulanTahun(bulan + '-01')} · Dinas Kesehatan Kota Palembang`, 14, 20);
    doc.setTextColor(30, 41, 59);

    const hasilTabel: any = autoTable(doc, {
      startY: 34,
      head: [['No', 'Kelurahan', 'Kecamatan', 'Ditimbang', 'Naik (N)', 'Tidak Naik (T)', 'Normal', 'Risiko', 'Stunting/Gizi Buruk']],
      body: baris.map((r, i) => [i + 1, r.kelurahan, r.kecamatan, r.ditimbang, r.naik, r.tidakNaik, r.normal, r.risiko, r.bahaya]),
      foot: [['', 'TOTAL', '', total.ditimbang, total.naik, total.tidakNaik, '', '', total.bahaya]],
      theme: 'grid',
      headStyles: { fillColor: [13, 148, 136], fontSize: 8.5 },
      footStyles: { fillColor: [241, 250, 247], textColor: [13, 148, 136], fontStyle: 'bold', fontSize: 8.5 },
      bodyStyles: { fontSize: 8.5 },
      alternateRowStyles: { fillColor: [241, 250, 247] },
    });
    const finalY = hasilTabel?.finalY ?? (doc as any).lastAutoTable?.finalY ?? 260;

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Dokumen ini dihasilkan otomatis oleh sistem Posyandu Digital Palembang pada ${new Date().toLocaleString('id-ID')}.`, 14, finalY + 8);
    doc.save(`laporan-posyandu-${bulan}.pdf`);
    toast({ title: 'Laporan PDF berhasil diunduh! 📄', variant: 'success' });
  }

  function eksporExcel() {
    const rows = [
      { 'No': 1, 'Kelurahan': 'TOTAL', 'Kecamatan': '', 'Ditimbang': total.ditimbang, 'Naik (N)': total.naik, 'Tidak Naik (T)': total.tidakNaik, 'Normal': '', 'Risiko': '', 'Stunting/Gizi Buruk': total.bahaya },
      ...baris.map((r, i) => ({
        'No': i + 2,
        'Kelurahan': r.kelurahan,
        'Kecamatan': r.kecamatan,
        'Ditimbang': r.ditimbang,
        'Naik (N)': r.naik,
        'Tidak Naik (T)': r.tidakNaik,
        'Normal': r.normal,
        'Risiko': r.risiko,
        'Stunting/Gizi Buruk': r.bahaya,
      })),
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 5 }, { wch: 22 }, { wch: 16 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Laporan ${fmtBulanTahun(bulan + '-01')}`);
    XLSX.writeFile(wb, `laporan-posyandu-${bulan}.xlsx`);
    toast({ title: 'Laporan Excel berhasil diunduh! 📊', variant: 'success' });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">Laporan Bulanan</h1>
          <p className="text-sm font-medium text-slate-500">Rekap kegiatan Posyandu untuk Dinas Kesehatan Kota Palembang.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="soft" onClick={eksporExcel}>
            <FileSpreadsheet className="h-4.5 w-4.5" /> Excel
          </Button>
          <Button onClick={eksporPDF}>
            <FileText className="h-4.5 w-4.5" /> Export PDF
          </Button>
        </div>
      </div>

      <Card className="flex flex-wrap items-center gap-4 p-4">
        <div>
          <p className="mb-1.5 text-sm font-bold text-slate-600">Pilih periode laporan</p>
          <Input type="month" value={bulan} max={`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`} onChange={(e) => setBulan(e.target.value)} className="h-12 w-52" />
        </div>
        <div className="ml-auto flex flex-wrap gap-3">
          <div className="rounded-2xl bg-teal-50 px-4 py-2.5 text-center">
            <p className="text-lg font-extrabold text-teal-700">{total.ditimbang}</p>
            <p className="text-[10px] font-bold text-slate-400">Balita ditimbang</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 px-4 py-2.5 text-center">
            <p className="text-lg font-extrabold text-emerald-600">{total.naik}</p>
            <p className="text-[10px] font-bold text-slate-400">Naik (N)</p>
          </div>
          <div className="rounded-2xl bg-red-50 px-4 py-2.5 text-center">
            <p className="text-lg font-extrabold text-red-500">{total.tidakNaik}</p>
            <p className="text-[10px] font-bold text-slate-400">Tidak Naik (T)</p>
          </div>
          <div className="rounded-2xl bg-amber-50 px-4 py-2.5 text-center">
            <p className="text-lg font-extrabold text-amber-600">{total.bahaya}</p>
            <p className="text-[10px] font-bold text-slate-400">Stunting/Buruk</p>
          </div>
        </div>
      </Card>

      <Card className="flex items-center gap-3 border-teal-200 bg-teal-50/60 p-4">
        <ShieldCheck className="h-7 w-7 shrink-0 text-teal-600" />
        <p className="text-sm font-bold text-teal-800">
          Cakupan penimbangan {fmtBulanTahun(bulan + '-01')}: {cakupan}% dari {stats?.totalBayi ?? 0} balita terdaftar.
          {cakupan < 80 && ' Target nasional ≥ 80% — tingkatkan kehadiran bulan depan!'}
        </p>
      </Card>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="space-y-3 p-5">
            <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
          </div>
        ) : baris.length === 0 ? (
          <div className="p-5">
            <EmptyState icon={<Download className="h-7 w-7" />} title="Belum ada data untuk periode ini" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="bg-teal-600 text-left text-xs font-extrabold text-white">
                  <th className="px-4 py-3">Kelurahan</th>
                  <th className="px-4 py-3">Kecamatan</th>
                  <th className="px-3 py-3 text-center">Ditimbang</th>
                  <th className="px-3 py-3 text-center">Naik (N)</th>
                  <th className="px-3 py-3 text-center">Tidak Naik (T)</th>
                  <th className="px-3 py-3 text-center">Normal</th>
                  <th className="px-3 py-3 text-center">Risiko</th>
                  <th className="px-3 py-3 text-center">Stunting/Buruk</th>
                </tr>
              </thead>
              <tbody>
                {baris.map((r, i) => (
                  <tr key={r.kelurahan} className={i % 2 ? 'bg-teal-50/40' : 'bg-white'}>
                    <td className="px-4 py-2.5 font-extrabold text-slate-700">{r.kelurahan}</td>
                    <td className="px-4 py-2.5 text-xs font-semibold text-slate-400">{r.kecamatan}</td>
                    <td className="px-3 py-2.5 text-center font-bold text-slate-600">{r.ditimbang}</td>
                    <td className="px-3 py-2.5 text-center font-bold text-emerald-600">{r.naik}</td>
                    <td className="px-3 py-2.5 text-center font-bold text-red-500">{r.tidakNaik}</td>
                    <td className="px-3 py-2.5 text-center font-bold text-slate-600">{r.normal}</td>
                    <td className="px-3 py-2.5 text-center font-bold text-amber-500">{r.risiko}</td>
                    <td className="px-3 py-2.5 text-center">
                      <Badge warna={r.bahaya > 0 ? 'red' : 'green'}>{r.bahaya}</Badge>
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-teal-200 bg-teal-50 font-extrabold text-teal-800">
                  <td className="px-4 py-3" colSpan={3}>TOTAL</td>
                  <td className="px-3 py-3 text-center">{total.ditimbang}</td>
                  <td className="px-3 py-3 text-center text-emerald-700">{total.naik}</td>
                  <td className="px-3 py-3 text-center text-red-600">{total.tidakNaik}</td>
                  <td className="px-3 py-3 text-center">-</td>
                  <td className="px-3 py-3 text-center">{total.bahaya}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="text-center text-[11px] font-semibold text-slate-400">
        Ekspor PDF & Excel — siap kirim ke Dinas Kesehatan. <Loader2 className="ml-1 inline h-3 w-3" />
      </p>
    </div>
  );
}
