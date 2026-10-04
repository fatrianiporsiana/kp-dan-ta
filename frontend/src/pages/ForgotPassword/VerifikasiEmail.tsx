import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthPage, Header, Logo, PrimaryButton, Alert } from './shared';
import { forgotApi } from './api';

const EMAIL_KEY = 'forgot_email';
const CODE_LENGTH = 4;
const RESEND_TIMEOUT = 60;

export default function VerifikasiEmail() {
  const nav = useNavigate();
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_TIMEOUT);
  const [resendMsg, setResendMsg] = useState('');
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const email = sessionStorage.getItem(EMAIL_KEY) || '';

  useEffect(() => {
    if (!email) nav('/lupa-password', { replace: true });
  }, [email, nav]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  const handleChange = (i: number, v: string) => {
    const digit = v.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = digit;
    setDigits(next);
    setErr('');

    if (digit && i < CODE_LENGTH - 1) {
      inputsRef.current[i + 1]?.focus();
    }
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputsRef.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
    if (!paste) return;
    const next = Array(CODE_LENGTH).fill('');
    for (let i = 0; i < paste.length; i++) next[i] = paste[i];
    setDigits(next);
    setErr('');
  };

  const submit = async () => {
    setErr('');
    const code = digits.join('');
    if (code.length < CODE_LENGTH) {
      setErr(`Masukkan ${CODE_LENGTH} digit kode verifikasi.`);
      return;
    }

    setLoading(true);
    try {
      const res = await forgotApi.verifyCode(code);
      if (!res.ok) {
        setErr(res.message ?? 'Kode salah.');
        return;
      }
      sessionStorage.setItem('forgot_code', code);
      nav('/ganti-password');
    } catch {
      setErr('Terjadi kesalahan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setResending(true);
    setResendMsg('');
    try {
      await forgotApi.resendCode(email);
      setCountdown(RESEND_TIMEOUT);
      setResendMsg('Kode verifikasi baru sudah dikirim.');
    } catch {
      setErr('Gagal mengirim ulang kode.');
    } finally {
      setResending(false);
    }
  };

  const mm = String(Math.floor(countdown / 60)).padStart(2, '0');
  const ss = String(countdown % 60).padStart(2, '0');

  return (
    <AuthPage>
      <Logo />

      <Header
        title="Masukkan Kode Verifikasi"
        subtitle="Silakan masukkan 4 digit kode yang telah dikirimkan ke akun terdaftar."
      />

      {email && (
        <p className="text-xs text-slate-500 mb-4 -mt-2">
          Dikirim ke: <b className="text-slate-700">{email}</b>
        </p>
      )}

      {/* Input 4 digit */}
      <div className="flex justify-center gap-3 sm:gap-4 my-6">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              inputsRef.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            className="w-14 h-14 rounded-lg border-2 border-slate-300 bg-white text-center text-2xl font-bold text-slate-800 shadow-sm transition-all focus:outline-none focus:border-primary-700 focus:ring-4 focus:ring-primary-100"
          />
        ))}
      </div>

      {err && (
        <div className="mb-4">
          <Alert tone="error">{err}</Alert>
        </div>
      )}

      {resendMsg && (
        <div className="mb-4">
          <Alert tone="success">{resendMsg}</Alert>
        </div>
      )}

      <p className="text-center text-xs text-slate-500 mb-4">
        Tidak menerima kode?{' '}
        {countdown > 0 ? (
          <span className="text-slate-400">
            Kirim Ulang ({mm}:{ss})
          </span>
        ) : (
          <button
            type="button"
            onClick={resend}
            disabled={resending}
            className="font-semibold text-primary-700 hover:text-orange-600 transition disabled:opacity-50"
          >
            {resending ? 'Mengirim…' : 'Kirim Ulang'}
          </button>
        )}
      </p>

      <PrimaryButton onClick={submit} loading={loading}>
        Verifikasi
      </PrimaryButton>
    </AuthPage>
  );
}