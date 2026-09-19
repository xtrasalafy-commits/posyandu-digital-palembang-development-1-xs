// ============================================================
// LAYOUT — Sidebar (Desktop) + Bottom Navigation (Mobile)
// ============================================================
import { useState } from 'react';
import {
  Baby, FileText, HeartPulse, LayoutDashboard, LogOut,
  Map, Scale, ShieldCheck, Syringe, Menu, X, Baby as BabyLogo,
} from 'lucide-react';
import { cn, nav, ROLE_LABEL } from '../lib/utils';
import { useProfile, useStatistik } from '../lib/api';
import { useAuth, logout } from '../lib/auth';
import { Sheet, Avatar } from './ui';
import type { Role } from '../lib/types';

interface NavItem { id: string; label: string; icon: any; roles: Role[]; badge?: number }

function useNavItems(role: Role | undefined, pendingCount: number): NavItem[] {
  const items: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['kader', 'bidan', 'admin'] },
    { id: 'bayi', label: 'Bayi & Balita', icon: Baby, roles: ['kader', 'bidan', 'admin'] },
    { id: 'antropometri', label: 'Catat Antropometri', icon: Scale, roles: ['kader', 'bidan', 'admin'] },
    { id: 'ibu', label: 'Ibu Hamil', icon: HeartPulse, roles: ['kader', 'bidan', 'admin'] },
    { id: 'imunisasi', label: 'Imunisasi', icon: Syringe, roles: ['kader', 'bidan', 'admin'] },
    { id: 'validasi', label: 'Validasi Data', icon: ShieldCheck, roles: ['bidan', 'admin'], badge: pendingCount },
    { id: 'peta', label: 'Peta Sebaran', icon: Map, roles: ['bidan', 'admin'] },
    { id: 'laporan', label: 'Laporan', icon: FileText, roles: ['bidan', 'admin'] },
  ];
  return items.filter((i) => role && i.roles.includes(role));
}

export default function Layout({ route, children }: { route: string; children: React.ReactNode }) {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { data: stats } = useStatistik();
  const [menuOpen, setMenuOpen] = useState(false);

  const role = profile?.role;
  const items = useNavItems(role, stats?.pendingValidasi ?? 0);
  const activeId = route === 'bayi-detail' ? 'bayi' : route;

  const primary: NavItem[] = items.filter((i) => ['dashboard', 'bayi', 'antropometri', 'ibu'].includes(i.id));
  const menuItems: NavItem[] = items.filter((i) => !primary.some((p) => p.id === i.id));

  const handleLogout = async () => {
    await logout();
    nav('/login');
  };

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* ===== Sidebar desktop ===== */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-teal-100 bg-white lg:flex">
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-md shadow-teal-500/30">
            <BabyLogo className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[15px] font-extrabold leading-tight text-slate-800">Posyandu Digital</p>
            <p className="text-xs font-bold text-teal-600">Kota Palembang</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2 no-scrollbar">
          {items.map((i) => (
            <button
              key={i.id}
              onClick={() => nav('/' + i.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-bold transition-all',
                activeId === i.id ? 'bg-teal-600 text-white shadow-md shadow-teal-600/25' : 'text-slate-500 hover:bg-teal-50 hover:text-teal-700'
              )}
            >
              <i.icon className="h-5 w-5 shrink-0" />
              <span className="flex-1 text-left">{i.label}</span>
              {!!i.badge && (
                <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-extrabold', activeId === i.id ? 'bg-white/20 text-white' : 'bg-red-500 text-white')}>
                  {i.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="border-t border-slate-100 p-4">
          <div className="flex items-center gap-3">
            <Avatar nama={profile?.full_name ?? '?'} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-700">{profile?.full_name}</p>
              <p className="truncate text-xs font-semibold text-teal-600">{role ? ROLE_LABEL[role] : '...'}</p>
            </div>
            <button onClick={handleLogout} title="Keluar" className="rounded-xl p-2 text-slate-400 hover:bg-red-50 hover:text-red-500">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ===== Topbar mobile ===== */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-teal-100/70 bg-white/85 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white">
          <BabyLogo className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold text-slate-800">Posyandu Digital Palembang</p>
          <p className="truncate text-[11px] font-semibold text-teal-600">
            {profile?.full_name} · {role ? ROLE_LABEL[role] : ''}
          </p>
        </div>
        <button onClick={() => setMenuOpen(true)} className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600">
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* ===== Konten ===== */}
      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-4 lg:px-8 lg:pb-10 lg:pt-6">
        {children}
      </main>

      {/* ===== Bottom navigation mobile ===== */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-teal-100 bg-white/95 backdrop-blur lg:hidden pb-safe">
        <div className="mx-auto grid max-w-md grid-cols-5 items-end px-2 pb-1.5 pt-1.5">
          {primary.map((i) => {
            const active = activeId === i.id;
            const isCenter = i.id === 'antropometri';
            if (isCenter) {
              return (
                <button key={i.id} onClick={() => nav('/' + i.id)} className="flex flex-col items-center gap-0.5">
                  <span className={cn('-mt-5 flex h-14 w-14 items-center justify-center rounded-full border-4 border-white shadow-lg shadow-teal-600/30', active ? 'bg-teal-700' : 'bg-teal-500')}>
                    <i.icon className="h-6 w-6 text-white" />
                  </span>
                  <span className="text-[10px] font-bold text-teal-700">Ukur</span>
                </button>
              );
            }
            return (
              <button key={i.id} onClick={() => nav('/' + i.id)} className="flex flex-col items-center gap-0.5 rounded-xl py-1.5">
                <span className={cn('relative rounded-xl p-1.5', active ? 'bg-teal-50 text-teal-600' : 'text-slate-400')}>
                  <i.icon className="h-5.5 w-5.5" />
                  {!!i.badge && i.badge > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
                  )}
                </span>
                <span className={cn('text-[10px] font-bold', active ? 'text-teal-700' : 'text-slate-400')}>{i.label.split(' ')[0]}</span>
              </button>
            );
          })}
          <button onClick={() => setMenuOpen(true)} className="flex flex-col items-center gap-0.5 rounded-xl py-1.5">
            <span className="rounded-xl p-1.5 text-slate-400"><Menu className="h-5.5 w-5.5" /></span>
            <span className="text-[10px] font-bold text-slate-400">Menu</span>
          </button>
        </div>
      </nav>

      {/* ===== Sheet menu mobile ===== */}
      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)}>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar nama={profile?.full_name ?? '?'} />
            <div>
              <p className="text-sm font-extrabold text-slate-800">{profile?.full_name}</p>
              <p className="text-xs font-semibold text-teal-600">{role ? ROLE_LABEL[role] : ''}</p>
            </div>
          </div>
          <button onClick={() => setMenuOpen(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-1">
          {menuItems.map((i) => (
            <button
              key={i.id}
              onClick={() => { setMenuOpen(false); nav('/' + i.id); }}
              className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3.5 text-sm font-bold text-slate-600 hover:bg-teal-50 hover:text-teal-700"
            >
              <i.icon className="h-5 w-5 text-teal-500" />
              {i.label}
              {!!i.badge && i.badge > 0 && (
                <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-extrabold text-white">{i.badge}</span>
              )}
            </button>
          ))}
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3.5 text-sm font-bold text-red-500 hover:bg-red-50"
          >
            <LogOut className="h-5 w-5" />
            Keluar
          </button>
        </div>
      </Sheet>
    </div>
  );
}
