import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, ROLE_LABEL } from '../Auth';
import { Mod } from '../types';

const MODS: [Mod, string, string][] = [
  ['kp', 'Kerja Praktek', 'briefcase'],
  ['ta', 'Tugas Akhir', 'graduation'],
];

// icons
const IconBriefcase = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M7.5 5.25a3 3 0 0 1 3-3h3a3 3 0 0 1 3 3v.205c.933.085 1.857.197 2.774.334 1.454.218 2.476 1.483 2.476 2.917v3.033c0 1.211-.734 2.352-1.936 2.752A24.726 24.726 0 0 1 12 15.75c-2.73 0-5.357-.442-7.814-1.259-1.202-.4-1.936-1.541-1.936-2.752V8.706c0-1.434 1.022-2.7 2.476-2.917A48.814 48.814 0 0 1 7.5 5.455V5.25Zm7.5 0v.09a49.488 49.488 0 0 0-6 0v-.09a1.5 1.5 0 0 1 1.5-1.5h3a1.5 1.5 0 0 1 1.5 1.5Zm-3 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
    <path d="M3 18.4v-2.796a4.3 4.3 0 0 0 .713.31A26.226 26.226 0 0 0 12 17.25c2.892 0 5.68-.468 8.287-1.335.252-.084.49-.189.713-.311V18.4c0 1.452-1.047 2.728-2.523 2.923-2.12.282-4.282.427-6.477.427a49.19 49.19 0 0 1-6.477-.427C4.047 21.128 3 19.852 3 18.4Z" />
  </svg>
);

const IconGraduation = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M11.7 2.805a.75.75 0 0 1 .6 0A60.65 60.65 0 0 1 22.83 8.72a.75.75 0 0 1-.231 1.337 49.949 49.949 0 0 0-9.902 3.912l-.003.002-.34.18a.75.75 0 0 1-.707 0A50.009 50.009 0 0 0 7.5 12.174v-.224c0-.131.067-.248.172-.311a54.614 54.614 0 0 1 4.653-2.52.75.75 0 0 0-.65-1.352 56.129 56.129 0 0 0-4.78 2.589 1.858 1.858 0 0 0-.859 1.228 49.803 49.803 0 0 0-4.634-1.527.75.75 0 0 1-.231-1.337A60.653 60.653 0 0 1 11.7 2.805Z" />
    <path d="M13.06 15.473a48.45 48.45 0 0 1 7.666-3.282c.134 1.414.22 2.843.255 4.284a.75.75 0 0 1-.46.711 47.87 47.87 0 0 0-8.105 4.342.75.75 0 0 1-.832 0 47.87 47.87 0 0 0-8.104-4.342.75.75 0 0 1-.461-.71c.035-1.442.121-2.87.255-4.286.921.304 1.83.634 2.726.99v1.27a1.5 1.5 0 0 0-.14 2.508c-.09.38-.222.753-.397 1.11.452.213.901.434 1.346.66a6.727 6.727 0 0 0 .551-1.607 1.5 1.5 0 0 0 .14-2.67v-.645a48.549 48.549 0 0 1 3.44 1.667 2.25 2.25 0 0 0 2.12 0Z" />
    <path d="M4.462 19.462c.42-.419.753-.89 1-1.395.453.214.902.435 1.347.662a6.742 6.742 0 0 1-1.286 1.794.75.75 0 0 1-1.06-1.06Z" />
  </svg>
);

const IconUser = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
    <path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003Z" />
  </svg>
);

const IconLogout = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25Z" clipRule="evenodd" />
    <path fillRule="evenodd" d="M19 10a.75.75 0 0 0-.75-.75H8.704l1.048-.943a.75.75 0 1 0-1.004-1.114l-2.5 2.25a.75.75 0 0 0 0 1.114l2.5 2.25a.75.75 0 1 0 1.004-1.114l-1.048-.943h9.546A.75.75 0 0 0 19 10Z" clipRule="evenodd" />
  </svg>
);

const IconChevronRight = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
  </svg>
);

// ============ COMPONENT ============
export function Modules() {
  const { user, mod, setMod, setRole, signOut } = useAuth();
  const nav = useNavigate();
  const cur = MODS.find((m) => m[0] === mod);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-orange-50 to-blue-100 lg:flex lg:items-center lg:justify-center lg:p-8 relative">
      
      {/* Background gedung POLOSAN tanpa overlay */}
      <div
        className="hidden lg:block fixed inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/gedung.jpeg')" }}
      />

      {/* CARD UTAMA */}
      <div className="relative w-full lg:max-w-5xl lg:rounded-3xl overflow-hidden lg:shadow-2xl bg-white min-h-screen lg:min-h-[32rem] flex flex-col">
        
        {/* ============ HEADER ============ */}
        <header className="bg-gradient-to-r from-blue-800 to-blue-700 text-white px-6 py-6 lg:py-5 flex items-center gap-4 relative">

          {/* LOGO CARD - 1 card berisi 2 logo */}
          <div className="hidden lg:flex items-center gap-3 bg-white rounded-xl px-3 py-2 shadow-md">
            <img src="/images/logowidit.jpg" alt="Widyatama" className="h-10 object-contain" />
            <div className="w-px h-8 bg-slate-200" />
            <img src="/images/logoif.jpg" alt="IF" className="h-10 object-contain" />
          </div>

          {/* Logo versi mobile */}
          <div className="lg:hidden flex items-center gap-1.5 bg-white rounded-lg px-2 py-1.5">
            <img src="/images/logowidit.jpg" alt="Widyatama" className="h-7 object-contain" />
            <img src="/images/logoif.jpg" alt="IF" className="h-7 object-contain" />
          </div>

          {/* Judul */}
          <div className="flex-1">
            <p className="text-base sm:text-lg lg:text-sm font-light leading-tight">
              Sistem Informasi <br className="lg:hidden" />
              Kerja Praktek &amp; Tugas Akhir
            </p>
            <p className="font-bold uppercase text-sm sm:text-base lg:text-base">
              Teknik Informatika <br className="lg:hidden" />
              Universitas Widyatama
            </p>
          </div>

          {/* User info & logout (desktop) */}
          <div className="hidden lg:flex items-center gap-2 text-sm">
            <span className="flex items-center gap-2 bg-blue-900/60 rounded-lg px-3 py-2">
              <IconUser className="w-4 h-4 text-orange-300" />
              {user?.name.split(',')[0]}
            </span>
            <button
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 rounded-lg px-3 py-2 font-medium transition"
              onClick={signOut}
            >
              <IconLogout className="w-4 h-4" />
              Keluar
            </button>
          </div>
        </header>

        {/* body */}
        <div className="flex-1 grid lg:grid-cols-2">
          
          {/* KOLOM KIRI: DAFTAR MODUL */}
          <section className="p-6 lg:p-8">
            <h2 className="font-bold text-lg text-blue-900 mb-4">Daftar Modul</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              {MODS.map(([m, l, ic]) => {
                const isActive = mod === m;
                const Icon = ic === 'briefcase' ? IconBriefcase : IconGraduation;
                return (
                  <button
                    key={m}
                    onClick={() => setMod(m)}
                    className={`group rounded-2xl border-2 p-6 lg:p-5 flex flex-col items-center gap-3 transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-br from-orange-50 to-blue-50 border-orange-500 shadow-lg shadow-orange-200/50 scale-[1.02]'
                        : 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-md'
                    }`}
                  >
                    <div
                      className={`rounded-2xl p-3 transition-colors ${
                        isActive
                          ? 'bg-gradient-to-br from-orange-500 to-orange-400 text-white'
                          : 'bg-blue-50 text-blue-700 group-hover:bg-blue-100'
                      }`}
                    >
                      <Icon className="w-8 h-8" />
                    </div>
                    <span
                      className={`font-semibold text-sm ${
                        isActive ? 'text-orange-700' : 'text-blue-900'
                      }`}
                    >
                      {l}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* KOLOM KANAN: DAFTAR ROLE */}
          {cur && (
            <section className="p-6 lg:p-8 bg-slate-50 border-t lg:border-t-0 lg:border-l border-slate-100">
              <h2 className="font-bold text-lg text-blue-900 mb-4">Daftar Role</h2>

              <p className="text-sm text-slate-500 mb-4 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-orange-500" />
                Modul: <span className="font-medium text-blue-800">{cur[1]}</span>
              </p>

              <div className="space-y-3">
                {user!.roles.map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setRole(r);
                      nav('/app');
                    }}
                    className="group w-full text-left bg-white rounded-xl shadow-sm border border-slate-100 p-4 hover:border-orange-400 hover:shadow-md transition-all flex items-center justify-between"
                  >
                    <div>
                      <p className="font-bold text-blue-800 group-hover:text-orange-600 transition-colors">
                        {ROLE_LABEL[r]}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {user!.nim || user!.email}
                      </p>
                    </div>
                    <IconChevronRight className="w-5 h-5 text-slate-300 group-hover:text-orange-500 group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

      {/* Logout mobile */}
      <div className="lg:hidden px-6 py-4 border-t border-slate-100 order-3">
        <button
          onClick={signOut}
          className="flex items-center justify-center gap-2 w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm py-3 rounded-lg transition"
        >
          <IconLogout className="w-4 h-4" />
          Keluar
        </button>
      </div>

      <p className="text-center text-xs text-slate-400 py-3 bg-white order-4">
        © Made with love in Informatika
      </p>
      </div>
    </div>
  );
}