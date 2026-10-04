import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import { AuthPage, Field, Header, Logo, PrimaryButton, Alert, inputCls } from './shared';
import { forgotApi } from './api';

const REDIRECT_KEY = 'forgot_email';

export default function LupaPassword() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');
  const [submitErr, setSubmitErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setErr('');
    setSubmitErr('');

    if (!email.trim()) return setErr('Email wajib diisi.');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErr('Format email tidak valid.');

    setLoading(true);
    try {
      await forgotApi.sendResetEmail(email.trim());
      sessionStorage.setItem(REDIRECT_KEY, email.trim());
      nav('/verifikasi-email');
    } catch {
      setSubmitErr('Gagal mengirim email. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPage>
      <Logo />

      <Header
        title="Pemulihan Akun"
        subtitle="Masukkan alamat email yang sudah terdaftar."
      />

      {submitErr && (
        <div className="mb-4">
          <Alert tone="error">{submitErr}</Alert>
        </div>
      )}

      <div className="space-y-4">
        <Field label="Email" error={err}>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary-500 pointer-events-none" />
            <input
              type="email"
              autoComplete="email"
              placeholder="Masukkan email yang sudah terdaftar"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErr('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              className={inputCls}
            />
          </div>
        </Field>

        <PrimaryButton onClick={submit} loading={loading}>
          Kirimkan
        </PrimaryButton>

        <p className="text-center text-sm text-slate-500">
          Ingat kata sandi?{' '}
          <Link to="/login" className="font-semibold text-primary-700 hover:text-orange-600 transition">
            Masuk Akun
          </Link>
        </p>

        <div className="text-center pt-2">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-primary-700 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali ke Login
          </Link>
        </div>
      </div>
    </AuthPage>
  );
}