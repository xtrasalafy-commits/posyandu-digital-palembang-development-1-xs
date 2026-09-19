// ============================================================
// KOMPONEN UI (gaya Shadcn/UI) — Posyandu Digital Palembang
// Palet: Soft Teal, Mint, Putih. Warna = makna.
// ============================================================
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn, WARNA_BADGE, WARNA_BG_SOFT, WARNA_TEKS } from '../lib/utils';
import type { WarnaSemantik } from '../lib/types';

// ---------------- Button ----------------
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft' | 'warning';
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: 'sm' | 'md' | 'lg' | 'icon';
  full?: boolean;
}

const BTN_VARIANTS: Record<BtnVariant, string> = {
  primary: 'bg-teal-600 text-white hover:bg-teal-700 active:bg-teal-800 shadow-sm shadow-teal-600/20',
  secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-teal-300',
  ghost: 'text-slate-600 hover:bg-teal-50 hover:text-teal-700',
  danger: 'bg-red-500 text-white hover:bg-red-600 shadow-sm shadow-red-500/20',
  soft: 'bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200',
  warning: 'bg-amber-400 text-amber-950 hover:bg-amber-500 shadow-sm shadow-amber-400/30',
};

const BTN_SIZES = {
  sm: 'h-9 px-3 text-sm rounded-xl gap-1.5',
  md: 'h-11 px-4 text-sm rounded-xl gap-2',
  lg: 'h-13 px-6 text-base rounded-2xl gap-2 min-h-[52px]',
  icon: 'h-10 w-10 rounded-xl',
};

export function Button({ variant = 'primary', size = 'md', full, className, ...rest }: BtnProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-semibold transition-all duration-150 select-none',
        'disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500',
        BTN_VARIANTS[variant], BTN_SIZES[size],
        full && 'w-full',
        className
      )}
      {...rest}
    />
  );
}

// ---------------- Card ----------------
export function Card({ className, children, onClick }: { className?: string; children: ReactNode; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={cn('card-soft', onClick && 'cursor-pointer transition-transform hover:-translate-y-0.5', className)}>
      {children}
    </div>
  );
}

// ---------------- Badge ----------------
export function Badge({ warna = 'teal', children, className, dot }: { warna?: WarnaSemantik; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap', WARNA_BADGE[warna], className)}>
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', warna === 'green' ? 'bg-emerald-500' : warna === 'yellow' ? 'bg-amber-500' : warna === 'red' ? 'bg-red-500' : 'bg-teal-500')} />}
      {children}
    </span>
  );
}

// ---------------- Input ----------------
interface FieldProps { label?: string; hint?: string; error?: string; required?: boolean; children: ReactNode; className?: string; }
export function Field({ label, hint, error, required, children, className }: FieldProps) {
  return (
    <label className={cn('block', className)}>
      {label && (
        <span className="mb-1.5 flex items-center gap-1 text-sm font-semibold text-slate-700">
          {label} {required && <span className="text-red-500">*</span>}
        </span>
      )}
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-medium text-red-600">{error}</span>}
    </label>
  );
}

const INPUT_CLS =
  'w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-base text-slate-800 placeholder:text-slate-300 transition-colors focus:border-teal-500 focus:outline-none focus:ring-4 focus:ring-teal-500/10';

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(INPUT_CLS, className)} {...rest} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(INPUT_CLS, 'h-auto min-h-[88px] py-3', className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(INPUT_CLS, 'cursor-pointer appearance-none pr-10', className)} {...rest}>
      {children}
    </select>
  );
}

// ---------------- Segmented (pilihan besar, tanpa mengetik) ----------------
export function Segmented<T extends string>({ options, value, onChange, className }: {
  options: { value: T; label: string; icon?: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cn('grid gap-2', className)} style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'flex flex-col items-center justify-center gap-1 rounded-2xl border-2 px-2 py-3 text-sm font-bold transition-all',
            value === o.value
              ? 'border-teal-500 bg-teal-50 text-teal-700 shadow-sm'
              : 'border-slate-200 bg-white text-slate-500 hover:border-teal-200'
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ---------------- Dialog ----------------
export function Dialog({ open, onClose, title, subtitle, children, wide }: {
  open: boolean; onClose: () => void; title: string; subtitle?: string; children: ReactNode; wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = ''; };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] anim-fade" onClick={onClose} />
      <div className={cn('relative w-full anim-slide-up rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl max-h-[92dvh] overflow-y-auto no-scrollbar', wide ? 'sm:max-w-2xl' : 'sm:max-w-md')}>
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white/95 backdrop-blur px-5 py-4 rounded-t-3xl">
          <div>
            <h3 className="text-lg font-extrabold text-slate-800">{title}</h3>
            {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-5 pb-safe">{children}</div>
      </div>
    </div>
  );
}

// ---------------- Sheet bawah (menu mobile) ----------------
export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-900/40 anim-fade" onClick={onClose} />
      <div className="absolute bottom-0 inset-x-0 anim-slide-up rounded-t-3xl bg-white p-5 pb-safe shadow-2xl">
        {children}
      </div>
    </div>
  );
}

// ---------------- Tabs ----------------
export function Tabs({ items, active, onChange, className }: {
  items: { id: string; label: string; badge?: number }[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex gap-1.5 overflow-x-auto no-scrollbar rounded-2xl bg-teal-50/70 p-1.5 border border-teal-100', className)}>
      {items.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            'flex items-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold transition-all',
            active === t.id ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-teal-600'
          )}
        >
          {t.label}
          {!!t.badge && (
            <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-extrabold', t.id === active ? 'bg-red-500 text-white' : 'bg-red-100 text-red-600')}>
              {t.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ---------------- Progress ----------------
export function Progress({ value, warna = 'teal', className }: { value: number; warna?: WarnaSemantik; className?: string }) {
  const bar = warna === 'green' ? 'bg-emerald-500' : warna === 'yellow' ? 'bg-amber-400' : warna === 'red' ? 'bg-red-500' : 'bg-teal-500';
  return (
    <div className={cn('h-2.5 w-full overflow-hidden rounded-full bg-slate-100', className)}>
      <div className={cn('h-full rounded-full transition-all duration-500', bar)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

// ---------------- StatCard ----------------
export function StatCard({ icon, label, value, warna = 'teal', sub, onClick }: {
  icon: ReactNode; label: string; value: ReactNode; warna?: WarnaSemantik; sub?: string; onClick?: () => void;
}) {
  return (
    <Card className={cn('p-4 flex items-center gap-3.5', onClick && 'hover:shadow-md')} onClick={onClick}>
      <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl', WARNA_BG_SOFT[warna])}>
        <span className={cn(WARNA_TEKS[warna])}>{icon}</span>
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-extrabold leading-tight text-slate-800">{value}</div>
        <div className="truncate text-xs font-semibold text-slate-500">{label}</div>
        {sub && <div className="truncate text-[11px] text-slate-400">{sub}</div>}
      </div>
    </Card>
  );
}

// ---------------- EmptyState ----------------
export function EmptyState({ icon, title, desc, action }: { icon: ReactNode; title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-teal-200 bg-teal-50/40 px-6 py-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-teal-500 shadow-sm">{icon}</div>
      <p className="mt-1 font-bold text-slate-700">{title}</p>
      {desc && <p className="max-w-xs text-sm text-slate-500">{desc}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

// ---------------- Toast ----------------
interface ToastMsg { id: number; title: string; desc?: string; variant: 'success' | 'error' | 'info'; }
const ToastCtx = createContext<{ toast: (t: Omit<ToastMsg, 'id'>) => void }>({ toast: () => {} });
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const idRef = useRef(0);

  function toast(t: Omit<ToastMsg, 'id'>) {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4200);
  }

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border p-3.5 shadow-lg backdrop-blur anim-toast',
              t.variant === 'success' && 'border-emerald-200 bg-emerald-50/95 text-emerald-800',
              t.variant === 'error' && 'border-red-200 bg-red-50/95 text-red-800',
              t.variant === 'info' && 'border-teal-200 bg-white/95 text-slate-700'
            )}
          >
            {t.variant === 'success' && <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />}
            {t.variant === 'error' && <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />}
            {t.variant === 'info' && <Info className="mt-0.5 h-5 w-5 shrink-0 text-teal-500" />}
            <div className="min-w-0">
              <p className="text-sm font-bold">{t.title}</p>
              {t.desc && <p className="text-xs opacity-80">{t.desc}</p>}
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// ---------------- Avatar ----------------
export function Avatar({ nama, className, warna = 'teal' }: { nama: string; className?: string; warna?: WarnaSemantik }) {
  const inisial = nama.split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase();
  const cls = warna === 'green' ? 'bg-emerald-100 text-emerald-700' : warna === 'yellow' ? 'bg-amber-100 text-amber-700' : warna === 'red' ? 'bg-red-100 text-red-700' : 'bg-teal-100 text-teal-700';
  return (
    <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-extrabold', cls, className)}>
      {inisial}
    </div>
  );
}

// ---------------- Skeleton ----------------
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-slate-200/70', className)} />;
}
