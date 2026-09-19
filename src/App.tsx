// ============================================================
// POSYANDU DIGITAL PALEMBANG — Aplikasi Utama
// Router hash, guard peran, providers (React Query + Toast)
// ============================================================
import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Baby } from 'lucide-react';
import { initAuth, useAuth } from './lib/auth';
import { useProfile, ROLE_AKSES } from './lib/api';
import { ToastProvider } from './components/ui';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Bayi from './pages/Bayi';
import DetailBayi from './pages/DetailBayi';
import Antropometri from './pages/Antropometri';
import IbuHamil from './pages/IbuHamil';
import Imunisasi from './pages/Imunisasi';
import Peta from './pages/Peta';
import Laporan from './pages/Laporan';
import TrakteerWidget from './components/TrakteerWidget';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
});

interface Route { name: string; id?: string }

function parseRoute(hash: string): Route {
  const h = hash.replace(/^#/, '') || '/dashboard';
  const [path, query] = h.split('?');
  const segs = path.split('/').filter(Boolean);
  const params = new URLSearchParams(query ?? '');
  if (segs[0] === 'bayi' && segs[1]) return { name: 'bayi-detail', id: segs[1] };
  if (segs[0] === 'antropometri' && params.get('anak')) return { name: 'antropometri', id: params.get('anak') ?? undefined };
  if (segs[0] === 'imunisasi' && params.get('anak')) return { name: 'imunisasi', id: params.get('anak') ?? undefined };
  if (segs[0] === 'validasi') return { name: 'validasi' };
  return { name: segs[0] || 'dashboard' };
}

function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseRoute(location.hash));
  useEffect(() => {
    const f = () => setRoute(parseRoute(location.hash));
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  return route;
}

function Splash() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-gradient-to-br from-teal-600 to-emerald-500">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white shadow-2xl anim-pulse-soft">
        <Baby className="h-11 w-11 text-teal-600" />
      </div>
      <p className="text-lg font-extrabold text-white">Posyandu Digital Palembang</p>
      <p className="text-xs font-bold text-teal-100">Memuat data... sebentar ya 🙏</p>
    </div>
  );
}

function Router({ route }: { route: Route }) {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const role = profile?.role;

  if (!user) return <Login />;
  if (!role) return <Splash />;

  // Guard peran
  const akses = ROLE_AKSES[role] ?? [];
  const name = akses.includes(route.name) ? route.name : 'dashboard';
  const routeKey = name + (route.id ? '-' + route.id : '');

  let page: React.ReactNode = null;
  switch (name) {
    case 'dashboard': page = <Dashboard />; break;
    case 'bayi': page = <Bayi />; break;
    case 'bayi-detail': page = <DetailBayi key={routeKey} id={route.id ?? ''} />; break;
    case 'antropometri': page = <Antropometri key={routeKey} anakAwal={route.id} />; break;
    case 'validasi': page = <Antropometri key="validasi" tabAwal="validasi" />; break;
    case 'ibu': page = <IbuHamil />; break;
    case 'imunisasi': page = <Imunisasi key={routeKey} anakAwal={route.id} />; break;
    case 'peta': page = <Peta />; break;
    case 'laporan': page = <Laporan />; break;
    default: page = <Dashboard />;
  }

  return <Layout route={name}>{page}</Layout>;
}

export default function App() {
  const { loading, user } = useAuth();
  const route = useHashRoute();

  useEffect(() => { void initAuth(); }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        {loading ? <Splash /> : <Router route={route} />}
        {user && <TrakteerWidget />}
      </ToastProvider>
    </QueryClientProvider>
  );
}
