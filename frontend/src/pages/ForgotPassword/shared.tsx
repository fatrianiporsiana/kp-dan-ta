import { type ReactNode, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

export const cn = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');

/* ═══════════════════════════════════════════════════════════
   AUTH PAGE — Split Screen (sama seperti Login)
   ═══════════════════════════════════════════════════════════ */

export function AuthPage({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-primary-900">
      {/* ═══ SECTION KIRI (Gambar + Overlay) ═══ */}
      <section
        className="relative h-64 sm:h-72 lg:h-auto lg:flex-1 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/gedung.jpeg')" }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-blue-950/95 via-blue-800/60 to-orange-500/30" />
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

      {/* ═══ SECTION KANAN (Form) ═══ */}
      <section className="relative -mt-8 lg:mt-0 rounded-t-[2rem] lg:rounded-none bg-white lg:w-[30rem] xl:w-[34rem] flex flex-col justify-center px-6 sm:px-12 py-8 flex-1 lg:flex-none">
        {children}

        <p className="mt-8 text-center text-xs text-slate-400">
          © Made with love in Informatika
        </p>
      </section>
    </div>
  );
}

/* ───────────────────────── Logo ───────────────────────── */

export function Logo() {
  return (
    <div className="flex justify-center items-center gap-6 mb-6">
      <img src="/images/logowidit.jpg" alt="Logo Widyatama" className="h-14 sm:h-16 object-contain" />
      <img src="/images/logoif.jpg" alt="Logo IF" className="h-14 sm:h-16 object-contain" />
    </div>
  );
}

/* ───────────────────────── Field ───────────────────────── */

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <div className="mt-1">{children}</div>
      {error && (
        <span role="alert" className="mt-1 block text-xs text-red-600">
          {error}
        </span>
      )}
    </label>
  );
}

export const inputCls =
  'w-full rounded-lg bg-primary-50 pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';

/* ───────────────────────── Button ───────────────────────── */

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

export function PrimaryButton({ loading, icon, children, className, disabled, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cn(
        'w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary-700 text-white px-4 py-3 text-sm font-semibold transition-colors hover:bg-primary-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

/* ───────────────────────── Alert ───────────────────────── */

export function Alert({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'error' | 'success';
  children: ReactNode;
}) {
  const cls =
    tone === 'error'
      ? 'border-red-200 bg-red-50 text-red-700'
      : tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-blue-200 bg-blue-50 text-blue-700';
  return <div className={cn('rounded-lg border px-4 py-3 text-sm', cls)}>{children}</div>;
}

/* ───────────────────────── Header ───────────────────────── */

export function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-lg font-bold text-slate-900">{title}</h1>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}