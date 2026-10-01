import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Menu, X, Bell, ChevronDown, LogOut } from 'lucide-react';
import { useAuth, ROLE_LABEL } from '../Auth';
import { useDb } from '../store';

type M = [string, string][];

/** ═══════ Modul KP ═══════ */

const MENU_KP: Record<string, M> = {
  m: [
    ['/app', 'Dashboard Utama'],
    ['/app/pendaftaran', 'Pendaftaran Kerja Praktek'],
    ['/app/logbook', 'Logbook & Berita Acara'],
    ['/app/perpanjangan', 'Perpanjangan Kerja Praktek'],
    ['/app/penyelesaian', 'Penyelesaian Kerja Praktek'],
  ],
  s: [
    ['/app', 'Dashboard Staff'],
    ['/app/verifikasi', 'Verifikasi Pendaftaran'],
    ['/app/penyelesaian-kp', 'Verifikasi Penyelesaian'],
    ['/app/perpanjangan-kp', 'Konfirmasi Perpanjangan'],
  ],
  d: [
    ['/app', 'Dashboard Dosen'],
    ['/app/bimbingan', 'Mahasiswa Bimbingan'],
  ],
};

/** ═══════ Modul TA — role Mahasiswa ═══════ */

const MENU_TA_M: M = [
  ['/app/ta', 'Dashboard TA'],
  ['/app/ta/pendaftaran', 'Pendaftaran TA'],
  ['/app/ta/perpanjangan', 'Perpanjangan TA'],
  ['/app/ta/pengajuan-sidang', 'Pengajuan Sidang'],
  ['/app/ta/revisi', 'Revisi Pasca Sidang'],
  ['/app/ta/penyelesaian', 'Penyelesaian TA'],
];

/** ═══════ Modul TA — role Staff / Sekprodi / Kaprodi ═══════ */

const MENU_TA_S: M = [
  ['/app/ta', 'Dashboard Staff'],
  ['/app/ta/verifikasi', 'Verifikasi Pendaftaran'],
  ['/app/ta/dospem', 'Penetapan Dospem'],
  ['/app/ta/verifikasi-sidang', 'Verifikasi Dokumen Sidang'],
  ['/app/ta/jadwal-sidang', 'Plot Penguji & Jadwal'],
];

/** ═══════ Modul TA — role Dosen (pembimbing / penguji) ═══════ */

const MENU_TA_D: M = [['/app/ta', 'Dashboard Dosen TA']];

const MENU_TA: Record<string, M> = {
  m: MENU_TA_M,
  s: MENU_TA_S,
  d: MENU_TA_D,
};

export default function Layout() {
  const { user, mod, role, signOut } = useAuth();
  const nav = useNavigate();
  const [db, upd] = useDb();
  const [open, setOpen] = useState(false);
  const [dd, setDd] = useState<'' | 'n' | 'u'>('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dd) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setDd('');
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDd('');
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [dd]);

  if (!user || !role) return null;
  const k = role === 'mahasiswa' ? 'm' : role.startsWith('dosen') ? 'd' : 's';
  const menu = mod === 'ta' ? MENU_TA[k] : MENU_KP[k];
  const title = mod === 'kp' ? 'Kerja Praktek' : 'Tugas Akhir';
  const notifs = role === 'mahasiswa' ? db.notifs : [];
  const unread = notifs.filter((n) => !n.read).length;

  const bell = () => {
    setDd(dd === 'n' ? '' : 'n');
    if (unread) upd((d) => ({ ...d, notifs: d.notifs.map((n) => ({ ...n, read: true })) }));
  };
  const go = (p: string) => {
    setDd('');
    nav(p);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {open && <div className="fixed inset-0 bg-black/40 z-30" onClick={() => setOpen(false)} />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw] bg-primary-700 text-white flex flex-col shadow-2xl transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5 flex items-center justify-between border-b border-white/10">
          <div className="flex gap-2 w-fit bg-white rounded-xl px-3 py-2 shadow-md">
            <img src="/images/logowidit.jpg" alt="Widyatama" className="h-9 object-contain" />
            <img src="/images/logoif.jpg" alt="IF" className="h-9 object-contain" />
          </div>
          <button
            className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white transition"
            aria-label="Tutup"
            onClick={() => setOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {menu.map(([to, l]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/app' || to === '/app/ta'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center rounded-lg px-3 py-2.5 text-sm transition ${
                  isActive
                    ? 'bg-accent-500 text-white font-semibold shadow-sm'
                    : 'text-blue-100 hover:bg-white/10'
                }`
              }
            >
              {l}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 bg-primary-700 text-white min-h-16 px-3 sm:px-6 py-2 flex items-center gap-2 sm:gap-3">
          <button
            className="shrink-0 rounded-lg p-1.5 sm:p-2 hover:bg-white/10 transition"
            aria-label="Menu"
            onClick={() => setOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-sm sm:text-base leading-tight">{title}</h1>
            <p className="text-[10px] sm:text-xs text-blue-200 leading-tight">
              Teknik Informatika Universitas Widyatama
            </p>
          </div>

          <div ref={menuRef} className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="relative">
              <button
                onClick={bell}
                aria-label="Notifikasi"
                className="relative rounded-full p-2 hover:bg-white/10 transition"
              >
                <Bell className="w-5 h-5" />
                {unread > 0 && (
                  <span className="absolute top-1 right-1.5 h-2.5 w-2.5 bg-red-500 rounded-full" />
                )}
              </button>
              {dd === 'n' && (
                <div className="absolute right-0 mt-3 w-72 max-w-[85vw] bg-white text-slate-800 rounded-xl shadow-lg overflow-hidden">
                  <div className="max-h-72 overflow-y-auto p-2">
                    {notifs.length ? (
                      notifs.slice(0, 5).map((n) => (
                        <p key={n.id} className="text-sm p-2 border-b last:border-0">
                          {n.text}
                        </p>
                      ))
                    ) : (
                      <p className="text-sm p-2 text-slate-500">Belum ada notifikasi.</p>
                    )}
                  </div>
                  <button
                    onClick={() => go('/app/notifikasi')}
                    className="w-full border-t border-slate-100 bg-slate-50 py-2.5 text-center text-sm font-semibold text-primary-700 hover:bg-primary-50 transition"
                  >
                    Lihat semua notifikasi
                  </button>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => setDd(dd === 'u' ? '' : 'u')}
                aria-label="Profil"
                className="flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/20 ring-1 ring-white/30 pl-1 pr-2 py-1 cursor-pointer transition"
              >
                <span className="h-8 w-8 rounded-full bg-accent-500 font-bold grid place-items-center">
                  {user.name[0]}
                </span>
                <span className="hidden sm:inline text-sm font-medium max-w-[8rem] truncate">
                  {user.name.split(',')[0]}
                </span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${dd === 'u' ? 'rotate-180' : ''}`}
                />
              </button>
              {dd === 'u' && (
                <div className="absolute right-0 mt-3 w-60 bg-white text-slate-800 rounded-xl shadow-lg py-2 text-sm">
                  <div className="px-4 pb-2 border-b">
                    <p className="font-semibold">{user.name}</p>
                    <p className="text-xs text-slate-500">{ROLE_LABEL[role]}</p>
                  </div>
                  {user.roles.length > 1 && (
                    <button
                      className="w-full text-left px-4 py-2 hover:bg-slate-100"
                      onClick={() => go('/modules')}
                    >
                      Ganti Role
                    </button>
                  )}
                  <button
                    className="w-full text-left px-4 py-2 hover:bg-slate-100"
                    onClick={() => go('/modules')}
                  >
                    Ganti Modul
                  </button>
                  <button
                    className="w-full flex items-center gap-2 text-left px-4 py-2 text-red-600 hover:bg-slate-100"
                    onClick={signOut}
                  >
                    <LogOut className="w-4 h-4" />
                    Keluar
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl w-full mx-auto">
          <Outlet />
        </main>
        <footer className="bg-primary-700 text-white text-center text-xs py-3">
          © Made with love in Informatika
        </footer>
      </div>
    </div>
  );
}