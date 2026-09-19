// ============================================================
// FLOATING WIDGET TRAKTEER — Support Developer
// Style khas Trakteer dengan QR Code inline
// ============================================================
import { useState, useRef, useEffect } from 'react';
import { Coffee, Heart, X, GitBranch } from 'lucide-react';
import { cn } from '../lib/utils';

const TRAKTEER_URL = 'https://trakteer.id/perpus_opera/';
const NOMINALS = [6000, 12000, 18000, 24000, 30000, 50000, 100000];
const REPO_URL = 'https://github.com/mzf/posyandu-digital-palembang';

function fmtRupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
}

function generateQRCodeDataUrl(text: string, size = 200): string {
  // Simple QR code using a free API (in production, use a local QR lib)
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
}

export default function TrakteerWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNominal, setSelectedNominal] = useState<number | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowQR(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNominalClick = (nominal: number) => {
    setSelectedNominal(nominal);
    setShowQR(true);
    const traktiranUrl = `${TRAKTEER_URL}?amount=${nominal}&step=2`;
    setQrUrl(generateQRCodeDataUrl(traktiranUrl));
  };

  const handleOpenTrakteer = () => {
    const url = selectedNominal ? `${TRAKTEER_URL}?amount=${selectedNominal}&step=2` : TRAKTEER_URL;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadSource = () => {
    window.open(REPO_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <div ref={wrapperRef} className="fixed bottom-4 right-4 z-50">
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-500 px-4 py-3 text-white shadow-xl shadow-teal-500/40',
          'hover:from-teal-700 hover:to-emerald-600 hover:scale-[1.02] transition-all duration-200',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500'
        )}
        aria-label="Support developer"
      >
        <Coffee className="h-5 w-5 animate-bounce" />
        <span className="hidden sm:block font-bold text-sm">Support</span>
        <Heart className="h-4 w-4 text-red-300 animate-pulse" />
      </button>

      {/* Expanded Panel */}
      {isOpen && (
        <div className="absolute bottom-14 right-0 w-80 sm:w-96 anim-slide-up">
          <div className="rounded-3xl border border-teal-100 bg-white shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 rounded-t-2xl bg-gradient-to-r from-teal-600 to-emerald-500 px-5 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                  <Coffee className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-extrabold">Traktir Kopi ☕</p>
                  <p className="text-xs opacity-90">Web app ini gratis & bebas iklan</p>
                </div>
              </div>
              <button
                onClick={() => { setIsOpen(false); setShowQR(false); }}
                className="rounded-full p-1.5 text-white/80 hover:bg-white/20 transition-colors"
                aria-label="Tutup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
              {!showQR ? (
                <>
                  <p className="text-center text-sm text-slate-600">
                    Server, domain, & waktu development butuh biaya.
                    Kopi kecil, server tetap jalan. 💚
                  </p>

                  <div className="grid grid-cols-3 gap-2">
                    {NOMINALS.map((nominal) => (
                      <button
                        key={nominal}
                        onClick={() => handleNominalClick(nominal)}
                        className={cn(
                          'relative flex flex-col items-center gap-1 rounded-2xl border-2 p-3 text-center transition-all',
                          selectedNominal === nominal
                            ? 'border-teal-500 bg-teal-50 shadow-sm shadow-teal-500/20'
                            : 'border-slate-200 hover:border-teal-300 hover:bg-teal-50'
                        )}
                      >
                        <span className="font-extrabold text-slate-800">{fmtRupiah(nominal)}</span>
                        <span className="text-[10px] font-semibold text-slate-400">/kopi</span>
                      </button>
                    ))}
                  </div>

                  <p className="text-center text-[11px] text-slate-400">Atau klik tombol di bawah untuk nominal custom</p>

                  <button
                    onClick={handleOpenTrakteer}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 px-4 py-3 text-sm font-bold text-white hover:bg-teal-700 transition-colors"
                  >
                    <Heart className="h-4 w-4" />
                    Buka Halaman Trakteer
                  </button>
                </>
              ) : (
                <div className="space-y-4 text-center">
                  <div className="flex items-center justify-center gap-2 rounded-2xl bg-teal-50 px-4 py-3">
                    <Coffee className="h-5 w-5 text-teal-600" />
                    <span className="font-extrabold text-teal-700">Terpilih: {fmtRupiah(selectedNominal!)}</span>
                  </div>

                  <div className="relative inline-block rounded-xl bg-white p-2 ring-1 ring-slate-200 shadow-sm">
                    <img
                      src={qrUrl}
                      alt={`QR Code Trakteer ${fmtRupiah(selectedNominal!)}`}
                      className="h-48 w-48"
                      loading="lazy"
                    />
                  </div>

                  <p className="text-xs text-slate-500">
                    Scan QR atau klik tombol di bawah untuk traktir via Trakteer
                  </p>

                  <div className="flex gap-2">
                    <button
                      onClick={handleOpenTrakteer}
                      className="flex-1 rounded-2xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-700 transition-colors"
                    >
                      Bayar Sekarang
                    </button>
                    <button
                      onClick={() => { setShowQR(false); setSelectedNominal(null); }}
                      className="flex-1 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Ganti Nominal
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100">
                <button
                  onClick={handleDownloadSource}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:border-teal-300 transition-colors"
                >
                  <GitBranch className="h-4 w-4" />
                  Download Source Code (GitHub)
                </button>
                <p className="mt-2 text-center text-[11px] font-semibold text-teal-600">
                  Open Source oleh <span className="font-extrabold">MZF</span> — 2026
                </p>
              </div>
            </div>
          </div>

          {/* Arrow */}
          <div className="absolute bottom-1 right-6 w-3 h-3 rotate-45 bg-white border-r border-b border-teal-100" />
        </div>
      )}
    </div>
  );
}