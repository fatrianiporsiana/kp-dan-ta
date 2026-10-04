import React, { useState, FormEvent } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../Auth';
import { login, loginGoogle } from '../store';
import { User } from '../types';
import { Btn } from '../components/ui';

const inp =
  'w-full rounded-lg bg-primary-50 pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';

export default function Login() {
  const { user, signIn } = useAuth();
  const [email, setE] = useState('');
  const [pw, setP] = useState('');
  const [show, setS] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setB] = useState(false);

  if (user) return <Navigate to="/modules" replace />;

  const run = async (f: () => Promise<User>) => {
    setB(true);
    setErr('');
    try {
      signIn(await f());
    } catch (e) {
      setErr((e as Error).message);
      setB(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    run(() => login(email, pw));
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-primary-900">
      {/* ═══ SECTION KIRI (Gambar + Overlay) ═══ */}
      <section
        className="relative h-64 sm:h-72 lg:h-auto lg:flex-1 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/gedung.jpeg')" }}
      >
        {/* Gradasi dari bawah */}
        <div className="absolute inset-0 bg-gradient-to-t from-blue-950/95 via-blue-800/60 to-orange-500/30" />

        {/* Tambahan tipis orange di kanan atas */}
        <div className="absolute inset-0 bg-gradient-to-bl from-orange-500/40 via-transparent to-transparent" />

        <div className="relative h-full flex flex-col justify-end lg:justify-center p-6 sm:p-10 lg:p-16 pb-14 lg:pb-16 text-white">
          <p
            className="text-xl sm:text-3xl xl:text-5xl font-light leading-tight"
            style={{ textShadow: '2px 2px 8px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)' }}
          >
            Sistem Informasi<br />
            Kerja Praktek &amp; Tugas Akhir
          </p>

          <p
            className="mt-2 text-xl sm:text-3xl xl:text-5xl font-bold uppercase leading-tight"
            style={{ textShadow: '2px 2px 8px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)' }}
          >
            Teknik Informatika<br />
            Universitas Widyatama
          </p>
        </div>
      </section>

      {/* ═══ SECTION KANAN (Form Login) ═══ */}
      <section className="relative -mt-8 lg:mt-0 rounded-t-[2rem] lg:rounded-none bg-white lg:w-[30rem] xl:w-[34rem] flex flex-col justify-center px-6 sm:px-12 py-8 flex-1 lg:flex-none">
        {/* Logo */}
        <div className="flex justify-center items-center gap-6 mb-6">
          <img
            src="/images/logowidit.jpg"
            alt="Logo Widyatama"
            className="h-14 sm:h-16 object-contain"
          />
          <img src="/images/logoif.jpg" alt="Logo IF" className="h-14 sm:h-16 object-contain" />
        </div>

        <h2 className="text-lg font-bold">Masuk ke Akun</h2>

        {/* Tombol Login Google */}
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            run(() => loginGoogle(window.prompt('Masukkan email akun Google Anda:') || ''))
          }
          className="mt-4 w-full flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 py-2.5 text-sm font-semibold hover:bg-slate-100 disabled:opacity-50"
        >
          Login dengan Google
        </button>

        <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
          <hr className="flex-1" />
          atau lanjutkan dengan
          <hr className="flex-1" />
        </div>

        <form onSubmit={submit} className="space-y-4">
          {/* Input Email */}
          <label className="block text-sm font-medium">
            Email / Akun Pengguna<span className="text-red-500">*</span>
            <div className="relative mt-1">
              <span className="absolute left-3 top-2.5 text-primary-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-5 h-5"
                >
                  <path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003Z" />
                </svg>
              </span>
              <input
                className={inp}
                required
                type="email"
                placeholder="Masukkan email/NPM/NIP/username yang terdaftar"
                value={email}
                onChange={(e) => setE(e.target.value)}
              />
            </div>
          </label>

          {/* Input Password */}
          <label className="block text-sm font-medium">
            Password<span className="text-red-500">*</span>
            <div className="relative mt-1">
              <span className="absolute left-3 top-2.5 text-primary-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
              <input
                className={inp}
                required
                type={show ? 'text' : 'password'}
                placeholder="Masukkan password"
                value={pw}
                onChange={(e) => setP(e.target.value)}
              />
              <button
                type="button"
                aria-label="Tampilkan password"
                className="absolute right-3 top-2.5 text-slate-400 hover:text-primary-600"
                onClick={() => setS(!show)}
              >
                {show ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                    <path
                      fillRule="evenodd"
                      d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      fillRule="evenodd"
                      d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-4.38 1.651 1.651 0 0 0 0-1.185A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22ZM7.752 6.69l1.092 1.092a2.5 2.5 0 0 1 3.374 3.373l1.091 1.092a4 4 0 0 0-5.557-5.557Z"
                      clipRule="evenodd"
                    />
                    <path d="m10.748 13.93 2.523 2.523a9.987 9.987 0 0 1-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 0 1 0-1.186A10.007 10.007 0 0 1 2.839 6.02L6.07 9.252a4 4 0 0 0 4.678 4.678Z" />
                  </svg>
                )}
              </button>
            </div>
          </label>

          {/* ═══ Lupa Kata Sandi — RATA KANAN ═══ */}
          <div className="flex justify-end -mt-1">
            <Link
              to="/lupa-password"
              className="text-xs text-primary-700 underline hover:text-orange-600 transition"
            >
              Lupa Kata Sandi?
            </Link>
          </div>

          {err && <p className="text-sm text-red-600">{err}</p>}

          <Btn v="primary" type="submit" disabled={busy} className="w-full py-3">
            {busy ? 'Memproses...' : 'Masuk'}
          </Btn>
        </form>

        <p className="mt-8 text-center text-xs text-slate-400">
          © Made with love in Informatika
        </p>
      </section>
    </div>
  );
}