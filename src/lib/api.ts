// ============================================================
// HOOKS DATA — TanStack Query (React Query)
// Semua query & mutasi ke Supabase terpusat di sini.
// ============================================================
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, resetDemoData } from './supabase';
import type { AntropometriLog, Bayi, IbuHamil, Imunisasi, Profile, Role } from './types';
import { STATUS_META } from './utils';
import { usiaBulanFloat } from './antropometri';
import type { StatusGizi } from './types';

export const qk = {
  profile: ['profile'] as const,
  bayi: ['bayi'] as const,
  ibu: ['ibu_hamil'] as const,
  logs: (id?: string) => ['logs', id ?? 'all'] as const,
  imunisasi: (id?: string) => ['imunisasi', id ?? 'all'] as const,
  stats: ['stats'] as const,
};

function errMsg(e: any): string {
  return e?.message ?? 'Terjadi kesalahan. Coba lagi.';
}

// ---------- Profil ----------
export function useProfile(userId?: string) {
  return useQuery({
    queryKey: [...qk.profile, userId],
    enabled: !!userId,
    queryFn: async (): Promise<Profile | null> => {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      return data ?? null;
    },
  });
}

// ---------- Balita & log (digabung) ----------
export interface AnakDenganStatus extends Bayi {
  logTerakhir: AntropometriLog | null;
  status: StatusGizi | null;
  warna: 'green' | 'yellow' | 'red' | 'teal' | 'slate';
  tidakNaik: boolean;
  usiaBln: number;
}

async function fetchAnakSemua(): Promise<AnakDenganStatus[]> {
  const [bayiRes, logRes] = await Promise.all([
    supabase.from('bayi').select('*'),
    supabase.from('antropometri_logs').select('*'),
  ]);
  const bayi: Bayi[] = bayiRes.data ?? [];
  const logs: AntropometriLog[] = logRes.data ?? [];
  const perAnak = new Map<string, AntropometriLog[]>();
  logs.forEach((l) => {
    const arr = perAnak.get(l.anak_id) ?? [];
    arr.push(l);
    perAnak.set(l.anak_id, arr);
  });
  const now = new Date().toISOString().slice(0, 10);
  return bayi.map((b) => {
    const riwayat = (perAnak.get(b.id) ?? []).sort((a, c) => a.tanggal.localeCompare(c.tanggal));
    const logTerakhir = riwayat[riwayat.length - 1] ?? null;
    const status = logTerakhir?.status ?? null;
    const meta = status ? STATUS_META[status] : null;
    return {
      ...b,
      logTerakhir,
      status,
      warna: meta?.warna ?? 'slate',
      tidakNaik: logTerakhir?.kenaikan === 'T',
      usiaBln: usiaBulanFloat(b.tgl_lahir, now),
    };
  });
}

export function useAnakSemua() {
  return useQuery({ queryKey: qk.bayi, queryFn: fetchAnakSemua });
}

export function useAnakDetail(id?: string) {
  return useQuery({
    queryKey: qk.bayi,
    enabled: !!id,
    select: (data: AnakDenganStatus[]) => data.find((a) => a.id === id) ?? null,
  });
}

export function useLogsAnak(anakId?: string) {
  return useQuery({
    queryKey: qk.logs(anakId),
    enabled: !!anakId,
    queryFn: async (): Promise<AntropometriLog[]> => {
      const { data } = await supabase.from('antropometri_logs').select('*').eq('anak_id', anakId).order('tanggal', { ascending: true });
      return data ?? [];
    },
  });
}

// ---------- Ibu hamil ----------
export function useIbuHamil() {
  return useQuery({
    queryKey: qk.ibu,
    queryFn: async (): Promise<IbuHamil[]> => {
      const { data } = await supabase.from('ibu_hamil').select('*').order('tgl_periksa', { ascending: false });
      return data ?? [];
    },
  });
}

// ---------- Imunisasi ----------
export function useImunisasi(anakId?: string) {
  return useQuery({
    queryKey: qk.imunisasi(anakId),
    enabled: !!anakId,
    queryFn: async (): Promise<Imunisasi[]> => {
      const { data } = await supabase.from('imunisasi').select('*').eq('anak_id', anakId);
      return data ?? [];
    },
  });
}

// ---------- Statistik ----------
export interface Statistik {
  totalBayi: number;
  totalIbu: number;
  sehat: number;
  risiko: number;
  bahaya: number; // stunting + wasting + gizi buruk
  tidakNaik: number;
  pendingValidasi: number;
  ibuKEK: number;
  perKecamatan: Record<string, { total: number; bahaya: number; risiko: number; sehat: number; tidakNaik: number }>;
  perKelurahan: Record<string, { kecamatan: string; total: number; bahaya: number; risiko: number; sehat: number }>;
  trenZ: { bulan: string; wfa: number; hfa: number }[];
}

export function useStatistik(scope?: { kader_id?: string; kelurahan?: string; kecamatan?: string }) {
  const scopeKey = JSON.stringify(scope ?? {});
  return useQuery({
    queryKey: [...qk.stats, scopeKey],
    queryFn: async (): Promise<Statistik> => {
      const [anak, logs, ibu] = await Promise.all([
        fetchAnakSemua(),
        supabase.from('antropometri_logs').select('*') as Promise<{ data: AntropometriLog[] | null; error: null }>,
        supabase.from('ibu_hamil').select('*') as Promise<{ data: IbuHamil[] | null; error: null }>,
      ]);

      let list = anak;
      if (scope?.kader_id) list = list.filter((a) => a.kader_id === scope.kader_id);
      if (scope?.kelurahan) list = list.filter((a) => a.kelurahan === scope.kelurahan);
      if (scope?.kecamatan) list = list.filter((a) => a.kecamatan === scope.kecamatan);

      const semuaLog: AntropometriLog[] = logs.data ?? [];
      const semuaIbu: IbuHamil[] = ibu.data ?? [];

      const sehat = list.filter((a) => a.status === 'Normal').length;
      const risiko = list.filter((a) => a.status === 'Risiko' || a.status === 'Berat Lebih').length;
      const bahaya = list.filter((a) => ['Stunting', 'Wasting', 'Gizi Buruk'].includes(a.status ?? '')).length;
      const tidakNaik = list.filter((a) => a.tidakNaik).length;

      const pendingValidasi = semuaLog.filter((l) => !l.validated_by).length;

      const perKecamatan: Statistik['perKecamatan'] = {};
      const perKelurahan: Statistik['perKelurahan'] = {};
      list.forEach((a) => {
        const k = (perKecamatan[a.kecamatan] ??= { total: 0, bahaya: 0, risiko: 0, sehat: 0, tidakNaik: 0 });
        k.total++;
        if (['Stunting', 'Wasting', 'Gizi Buruk'].includes(a.status ?? '')) k.bahaya++;
        else if (a.status === 'Risiko' || a.status === 'Berat Lebih') k.risiko++;
        else if (a.status === 'Normal') k.sehat++;
        if (a.tidakNaik) k.tidakNaik++;
        const kel = (perKelurahan[a.kelurahan] ??= { kecamatan: a.kecamatan, total: 0, bahaya: 0, risiko: 0, sehat: 0 });
        kel.total++;
        if (['Stunting', 'Wasting', 'Gizi Buruk'].includes(a.status ?? '')) kel.bahaya++;
        else if (a.status === 'Risiko' || a.status === 'Berat Lebih') kel.risiko++;
        else if (a.status === 'Normal') kel.sehat++;
      });

      // Tren z-score rata-rata 6 bulan terakhir
      const bulanArr: { key: string; label: string }[] = [];
      const nowD = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(nowD.getFullYear(), nowD.getMonth() - i, 1);
        bulanArr.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleDateString('id-ID', { month: 'short' }) });
      }
      const logPerBulan = new Map<string, AntropometriLog[]>();
      semuaLog.forEach((l) => {
        if (l.tanggal) {
          const key = l.tanggal.slice(0, 7);
          if (bulanArr.some((b) => b.key === key)) {
            const arr = logPerBulan.get(key) ?? [];
            arr.push(l);
            logPerBulan.set(key, arr);
          }
        }
      });
      const trenZ = bulanArr.map((b) => {
        const arr = logPerBulan.get(b.key) ?? [];
        const wfa = arr.filter((l) => l.z.wfa != null);
        const hfa = arr.filter((l) => l.z.hfa != null);
        return {
          bulan: b.label,
          wfa: wfa.length ? Math.round((wfa.reduce((s, l) => s + (l.z.wfa ?? 0), 0) / wfa.length) * 100) / 100 : 0,
          hfa: hfa.length ? Math.round((hfa.reduce((s, l) => s + (l.z.hfa ?? 0), 0) / hfa.length) * 100) / 100 : 0,
        };
      });

      const ibuList = scope?.kader_id ? semuaIbu.filter((i) => i.kader_id === scope.kader_id) : semuaIbu;
      const ibuKEK = ibuList.filter((i) => i.status !== 'Normal').length;

      return {
        totalBayi: list.length,
        totalIbu: ibuList.length,
        sehat, risiko, bahaya, tidakNaik,
        pendingValidasi,
        ibuKEK,
        perKecamatan, perKelurahan, trenZ,
      };
    },
  });
}

// ---------- Mutasi ----------
export function useAddLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (log: Partial<AntropometriLog>) => {
      const { data, error } = await supabase.from('antropometri_logs').insert(log).select();
      if (error) throw new Error(errMsg(error));
      return data?.[0] as AntropometriLog;
    },
    onSuccess: (log) => {
      qc.invalidateQueries({ queryKey: qk.bayi });
      qc.invalidateQueries({ queryKey: qk.logs(log?.anak_id) });
      qc.invalidateQueries({ queryKey: qk.logs() });
      qc.invalidateQueries({ queryKey: qk.stats });
    },
  });
}

export function useAddBayi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (bayi: Partial<Bayi>) => {
      const { data, error } = await supabase.from('bayi').insert(bayi).select();
      if (error) throw new Error(errMsg(error));
      return data?.[0] as Bayi;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.bayi });
      qc.invalidateQueries({ queryKey: qk.stats });
    },
  });
}

export function useAddIbu() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ibu: Partial<IbuHamil>) => {
      const { data, error } = await supabase.from('ibu_hamil').insert(ibu).select();
      if (error) throw new Error(errMsg(error));
      return data?.[0] as IbuHamil;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.ibu });
      qc.invalidateQueries({ queryKey: qk.stats });
    },
  });
}

export function useValidasiLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, bidanId }: { id: string; bidanId: string }) => {
      const { error } = await supabase
        .from('antropometri_logs')
        .update({ validated_by: bidanId, validated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw new Error(errMsg(error));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.bayi });
      qc.invalidateQueries({ queryKey: qk.logs() });
      qc.invalidateQueries({ queryKey: qk.stats });
    },
  });
}

export function useHapusLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('antropometri_logs').delete().eq('id', id);
      if (error) throw new Error(errMsg(error));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.bayi });
      qc.invalidateQueries({ queryKey: qk.logs() });
      qc.invalidateQueries({ queryKey: qk.stats });
    },
  });
}

export function useSetImunisasi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ anakId, vaksin, status, oleh }: { anakId: string; vaksin: string; status: 'completed' | 'pending'; oleh: string }) => {
      const { data: existing } = await supabase.from('imunisasi').select('*').eq('anak_id', anakId).eq('vaksin', vaksin).maybeSingle();
      const row = {
        id: existing?.id,
        anak_id: anakId,
        vaksin,
        status,
        tanggal: status === 'completed' ? new Date().toISOString().slice(0, 10) : null,
        diberikan_oleh: status === 'completed' ? oleh : undefined,
      };
      const { error } = await supabase.from('imunisasi').upsert(row);
      if (error) throw new Error(errMsg(error));
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: qk.imunisasi(vars.anakId) });
      qc.invalidateQueries({ queryKey: qk.imunisasi() });
      qc.invalidateQueries({ queryKey: qk.stats });
    },
  });
}

export function useResetDemo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => resetDemoData(),
    onSuccess: () => qc.invalidateQueries(),
  });
}

// ---------- Helper role ----------
export const ROLE_AKSES: Record<Role, string[]> = {
  kader: ['dashboard', 'bayi', 'antropometri', 'ibu', 'imunisasi'],
  bidan: ['dashboard', 'bayi', 'antropometri', 'validasi', 'ibu', 'imunisasi', 'peta', 'laporan'],
  admin: ['dashboard', 'bayi', 'antropometri', 'validasi', 'ibu', 'imunisasi', 'peta', 'laporan'],
};
