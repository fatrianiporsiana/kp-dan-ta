import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { AuthPage, Field, Header, Logo, PrimaryButton, Alert, inputCls } from './shared';
import { forgotApi } from './api';

const EMAIL_KEY = 'forgot_email';
const CODE_KEY = 'forgot_code';

export default function GantiPassword() {
  const nav = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [err, setErr] = useState('');
  const [errConfirm, setErrConfirm] = useState('');
  const [submitErr, setSubmitErr] = useState('');
  const [loading, setLoading] = useState(false);

  const email = sessionStorage.getItem(EMAIL_KEY) || '';
  const code = sessionStorage.getItem(CODE_KEY) || '';

  useEffect(() => {
    if (!email || !code) nav('/lupa-password', { replace: true });
  }, [email, code, nav]);

  const submit = async () => {
    setErr('');
    setErrConfirm('');
    setSubmitErr('');

    if (!password) return setErr('Kata sandi wajib diisi.');
    if (password.length < 8) return setErr('Kata sandi minimal 8 karakter.');
    if (password !== confirm) return setErrConfirm('Konfirmasi kata sandi tidak cocok.');

    setLoading(true);
    try {
      await forgotApi.resetPassword(email, code, password);
      sessionStorage.removeItem(EMAIL_KEY);
      sessionStorage.removeItem(CODE_KEY);
      sessionStorage.setItem(
        'auth_success',
        'Kata sandi berhasil diubah. Silakan masuk kembali.',
      );
      nav('/login');
    } catch {
      setSubmitErr('Gagal menyimpan kata sandi. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPage>
      <Logo />

      <Header
        title="Masukkan Kata Sandi Baru"
        subtitle="Kata sandi baru Anda harus berbeda dari kata sandi yang pernah digunakan sebelumnya."
      />

      {submitErr && (
        <div className="mb-4">
          <Alert tone="error">{submitErr}</Alert>
        </div>
      )}

      <div className="space-y-4">
        <Field label="Kata Sandi Baru" error={err}>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary-500 pointer-events-none" />
            <input
              type={showPass ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Minimal 8 karakter"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErr('');
              }}
              className={inputCls}
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary-600 transition"
              aria-label={showPass ? 'Sembunyikan' : 'Tampilkan'}
            >
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        <Field label="Konfirmasi Kata Sandi Baru" error={errConfirm}>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary-500 pointer-events-none" />
            <input
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Ulangi kata sandi baru"
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                setErrConfirm('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              className={inputCls}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary-600 transition"
              aria-label={showConfirm ? 'Sembunyikan' : 'Tampilkan'}
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        <PrimaryButton onClick={submit} loading={loading} icon={<CheckCircle2 className="h-4 w-4" />}>
          Simpan
        </PrimaryButton>
      </div>
    </AuthPage>
  );
}