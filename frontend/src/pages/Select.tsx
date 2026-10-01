import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, ROLE_LABEL } from '../Auth';
import { Mod } from '../types';
import { Briefcase, GraduationCap, User, LogOut, ChevronRight } from 'lucide-react';

const MODS: [Mod, string, React.ElementType][] = [
  ['kp', 'Kerja Praktek', Briefcase],
  ['ta', 'Tugas Akhir', GraduationCap],
];

export function Modules() {
  const { user, mod, setMod, setRole, signOut } = useAuth();
  const nav = useNavigate();
  const cur = MODS.find((m) => m[0] === mod);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-orange-50 to-blue-100 flex items-center justify-center p-4 relative">
      
      {/* Background gedung */}
      <div
        className="fixed inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/gedung.jpeg')" }}
      />

      {/* CARD UTAMA */}
      <div className="relative w-full max-w-md sm:max-w-2xl md:max-w-3xl lg:max-w-5xl rounded-3xl overflow-hidden shadow-2xl bg-white flex flex-col my-auto">
        
        {/* HEADER */}
        <header className="bg-gradient-to-r from-blue-800 to-blue-700 text-white px-6 py-6 lg:py-5 flex items-center gap-4 relative shrink-0">
          {/* Logo card desktop */}
          <div className="hidden lg:flex items-center gap-3 bg-white rounded-xl px-3 py-2 shadow-md">
            <img src="/images/logowidit.jpg" alt="Widyatama" className="h-10 object-contain" />
            <div className="w-px h-8 bg-slate-200" />
            <img src="/images/logoif.jpg" alt="IF" className="h-10 object-contain" />
          </div>

          {/* Logo mobile */}
          <div className="lg:hidden flex items-center gap-1.5 bg-white rounded-lg px-2 py-1.5">
            <img src="/images/logowidit.jpg" alt="Widyatama" className="h-7 object-contain" />
            <img src="/images/logoif.jpg" alt="IF" className="h-7 object-contain" />
          </div>

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

          {/* User info & logout desktop */}
          <div className="hidden lg:flex items-center gap-2 text-sm">
            <span className="flex items-center gap-2 bg-blue-900/60 rounded-lg px-3 py-2">
              <User className="w-4 h-4 text-orange-300" />
              {user?.name.split(',')[0]}
            </span>
            <button
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 rounded-lg px-3 py-2 font-medium transition"
              onClick={signOut}
            >
              <LogOut className="w-4 h-4" />
              Keluar
            </button>
          </div>
        </header>

        {/* BODY 
            - Default: flex-col (menurun) -> Role di atas, Modul di bawah
            - lg: grid-cols-2 -> Laptop 2 kolom
            - max-lg:grid-cols-1 -> Paksa iPad Pro (1366px) tetap 1 kolom
        */}
        <div className="flex-1 flex flex-col lg:grid lg:grid-cols-2 max-lg:grid-cols-1">
          
          {/* ROLE - DI ATAS (untuk mobile/tablet) */}
          {cur && (
            <section className="order-1 lg:order-2 p-6 lg:p-8 bg-slate-50 border-b lg:border-b-0 lg:border-l border-slate-100">
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
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-orange-500 group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* MODUL - DI BAWAH (untuk mobile/tablet) */}
          <section className="order-2 lg:order-1 p-6 lg:p-8">
            <h2 className="font-bold text-lg text-blue-900 mb-4">Daftar Modul</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              {MODS.map(([m, l, Icon]) => {
                const isActive = mod === m;
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
        </div>

        {/* Logout mobile */}
        <div className="lg:hidden px-6 py-4 border-t border-slate-100 shrink-0">
          <button
            onClick={signOut}
            className="flex items-center justify-center gap-2 w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm py-3 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
            Keluar
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 py-3 bg-white shrink-0">
          © Made with love in Informatika
        </p>
      </div>
    </div>
  );
}