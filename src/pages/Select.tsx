import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, GraduationCap, User, LogOut, ChevronRight } from 'lucide-react';
import { useAuth, ROLE_LABEL } from '../Auth';
import { Mod } from '../types';

const MODS: [Mod, string, string][] = [
  ['kp', 'Kerja Praktek', 'briefcase'],
  ['ta', 'Tugas Akhir', 'graduation'],
];

// ============ COMPONENT ============
export function Modules() {
  const { user, mod, setMod, setRole, signOut } = useAuth();
  const nav = useNavigate();
  const cur = MODS.find((m) => m[0] === mod);

  return (
    <div className="min-h-screen bg-slate-900/10 p-3 sm:p-6 md:p-8 lg:h-screen lg:p-6 flex items-center justify-center relative">
      
      {/* Background gedung di SEMUA ukuran layar */}
      <div
        className="fixed inset-0 bg-cover bg-center -z-10"
        style={{ backgroundImage: "url('/images/gedung.jpeg')" }}
      />

      {/* CARD UTAMA RESPONSIF */}
      <div className="w-full max-w-4xl lg:max-w-5xl lg:max-h-full bg-white rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto">
        
        {/* ============ HEADER ============ */}
        <header className="bg-gradient-to-r from-blue-800 to-blue-700 text-white p-3.5 sm:p-5 lg:py-4 flex items-center gap-2.5 sm:gap-4">

          {/* Logo Card */}
          <div className="flex items-center gap-1.5 sm:gap-3 bg-white rounded-xl p-1.5 sm:px-3 sm:py-2 shadow-md shrink-0">
            <img src="/images/logowidit.jpg" alt="Widyatama" className="h-6 sm:h-9 object-contain" />
            <div className="w-px h-5 sm:h-7 bg-slate-200" />
            <img src="/images/logoif.jpg" alt="IF" className="h-6 sm:h-9 object-contain" />
          </div>

          {/* Judul Responsif Tanpa Terpotong */}
          <div className="flex-1 min-w-0">
            <p className="text-[11px] sm:text-xs md:text-sm lg:text-base font-light leading-snug opacity-95">
              Sistem Informasi Kerja Praktek &amp; Tugas Akhir
            </p>
            <p className="font-bold text-[11px] sm:text-xs md:text-sm lg:text-base leading-snug uppercase mt-0.5">
              Teknik Informatika Universitas Widyatama
            </p>
          </div>

          {/* User info & logout (Desktop/Tablet) */}
          <div className="hidden md:flex items-center gap-2 shrink-0 text-sm">
            <span className="flex items-center gap-2 bg-blue-900/60 rounded-lg px-3 py-2 text-xs lg:text-sm font-medium">
              <User className="w-4 h-4 text-orange-300" />
              {user?.name.split(',')[0]}
            </span>
            <button
              className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 rounded-lg px-3 py-2 text-xs lg:text-sm font-semibold transition shadow-sm"
              onClick={signOut}
            >
              <LogOut className="w-4 h-4" />
              Keluar
            </button>
          </div>
        </header>

        {/* ============ BODY CONTENT ============ */}
        <div className="p-4 sm:p-6 md:p-8 flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:gap-6 lg:p-6 lg:flex-1 lg:min-h-0 lg:overflow-y-auto lg:items-start">

          {/* 1. DAFTAR ROLE (MUNCUL PALING ATAS SETELAH MODUL DIKLIK) */}
          {cur && (
            <section className="bg-slate-50 border border-slate-100 rounded-2xl p-4 sm:p-6 transition-all lg:order-2">
              <h2 className="font-bold text-base sm:text-lg text-blue-900 mb-1">Daftar Role</h2>

              <p className="text-xs sm:text-sm text-slate-500 mb-4 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-orange-500" />
                Modul: <span className="font-medium text-blue-800">{cur[1]}</span>
              </p>

              {/* Tampilan Asli Sesuai Desain Awal */}
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
                      <p className="font-bold text-sm sm:text-base text-blue-800 group-hover:text-orange-600 transition-colors">
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

          {/* 2. DAFTAR MODUL */}
          <section className="lg:order-1">
            <h2 className="font-bold text-base sm:text-lg text-blue-900 mb-4">
              {cur ? 'Pilih Modul Lain' : 'Daftar Modul'}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {MODS.map(([m, l, ic]) => {
                const isActive = mod === m;
                const Icon = ic === 'briefcase' ? Briefcase : GraduationCap;
                return (
                  <button
                    key={m}
                    onClick={() => setMod(m)}
                    className={`group rounded-2xl border-2 p-5 sm:p-6 flex flex-col items-center gap-3 transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-br from-orange-50 to-blue-50 border-orange-500 shadow-lg shadow-orange-200/50 scale-[1.01]'
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
                      className={`font-semibold text-sm sm:text-base ${
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

        {/* Logout Mobile */}
        <div className="md:hidden px-4 py-3 border-t border-slate-100 bg-slate-50/80">
          <button
            onClick={signOut}
            className="flex items-center justify-center gap-2 w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm py-2.5 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
            Keluar
          </button>
        </div>

        <p className="text-center text-xs text-slate-400 py-3 bg-white border-t border-slate-100">
          © Made with love in Informatika
        </p>
      </div>
    </div>
  );
}