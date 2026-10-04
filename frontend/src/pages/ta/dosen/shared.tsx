import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Info,
  Loader2,
  UserRound,
  XCircle,
} from 'lucide-react';
import {
  taDosenApi,
  type BAP,
  type Lecturer,
  type ReviewStatus,
  type Snapshot,
} from './api';

/* ───────────────────────── Path helper ───────────────────────── */

export const TA_DOSEN_BASE = '/app/ta';
export const taDosenPath = (sub = '') =>
  sub ? `${TA_DOSEN_BASE}/${sub}` : TA_DOSEN_BASE;

export const cn = (...c: Array<string | false | null | undefined>) =>
  c.filter(Boolean).join(' ');

/* ───────────────────────── Format ───────────────────────── */

export const fmtDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '-';

export const fmtDateTime = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '-';

/* ───────────────────────── Hooks ───────────────────────── */

export function useSnapshot() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setError(null);
      setData(await taDosenApi.getSnapshot());
    } catch {
      setError('Data tidak dapat dimuat. Coba lagi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, error, reload };
}

/* ───────────────────────── Layout ───────────────────────── */

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-blue-900">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-slate-600">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({
  title,
  children,
  className,
  aside,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  aside?: ReactNode;
}) {
  return (
    <section
      className={cn(
        'bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden transition-shadow hover:shadow-lg',
        className,
      )}
    >
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 bg-slate-50/50">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {aside}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function PageLoader({ label = 'Memuat data…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-24 text-sm text-slate-500" role="status">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {label}
    </div>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <p className="font-medium text-slate-900">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">{children}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Page({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-5xl bg-slate-50 px-4 py-6 sm:px-6">{children}</div>;
}

/* ───────────────────────── Button ───────────────────────── */

type Variant = 'primary' | 'action' | 'outline' | 'danger' | 'ghost';

const variantCls: Record<Variant, string> = {
  primary: 'bg-blue-800 text-white hover:bg-blue-900 focus-visible:ring-blue-300',
  action: 'bg-orange-500 text-white hover:bg-orange-600 focus-visible:ring-orange-300',
  outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-300',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-300',
  ghost: 'text-blue-800 hover:bg-blue-50 focus-visible:ring-blue-200',
};

const baseBtn =
  'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50';

export function Button({
  variant = 'action',
  loading,
  icon,
  children,
  className,
  disabled,
  type = 'button',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
  icon?: ReactNode;
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(baseBtn, variantCls[variant], className)}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}

/* ───────────────────────── Status Badge ───────────────────────── */

const statusStyle: Record<ReviewStatus, { cls: string; icon: ReactNode; label: string }> = {
  PENDING: { cls: 'bg-amber-50 text-amber-800 ring-amber-200', icon: <Clock className="h-3.5 w-3.5" />, label: 'Menunggu' },
  APPROVED: { cls: 'bg-emerald-50 text-emerald-800 ring-emerald-200', icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: 'Disetujui' },
  REJECTED: { cls: 'bg-red-50 text-red-800 ring-red-200', icon: <XCircle className="h-3.5 w-3.5" />, label: 'Ditolak' },
};

export function StatusBadge({ status }: { status: ReviewStatus }) {
  const s = statusStyle[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset', s.cls)}>
      {s.icon}
      {s.label}
    </span>
  );
}

/** Badge tahap TA mahasiswa */
export function StageBadge({ stage }: { stage: 'PENDAFTARAN' | 'BIMBINGAN' | 'SIDANG' | 'REVISI' | 'SELESAI' }) {
  const map: Record<typeof stage, { cls: string; label: string }> = {
    PENDAFTARAN: { cls: 'bg-slate-100 text-slate-700', label: 'Pendaftaran' },
    BIMBINGAN: { cls: 'bg-blue-100 text-blue-800', label: 'Bimbingan' },
    SIDANG: { cls: 'bg-amber-100 text-amber-800', label: 'Sidang' },
    REVISI: { cls: 'bg-orange-100 text-orange-800', label: 'Revisi' },
    SELESAI: { cls: 'bg-emerald-100 text-emerald-800', label: 'Selesai' },
  };
  const s = map[stage];
  return <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', s.cls)}>{s.label}</span>;
}

/* ───────────────────────── Alert ───────────────────────── */

type AlertTone = 'info' | 'warning' | 'danger' | 'success';

const alertStyle: Record<AlertTone, { cls: string; icon: ReactNode }> = {
  info: { cls: 'border-blue-200 bg-blue-50 text-blue-900', icon: <Info className="h-4 w-4" /> },
  warning: { cls: 'border-amber-200 bg-amber-50 text-amber-900', icon: <AlertCircle className="h-4 w-4" /> },
  danger: { cls: 'border-red-300 bg-red-50 text-red-900', icon: <XCircle className="h-4 w-4" /> },
  success: { cls: 'border-emerald-200 bg-emerald-50 text-emerald-900', icon: <CheckCircle2 className="h-4 w-4" /> },
};

export function Alert({
  tone = 'info',
  title,
  children,
  action,
}: {
  tone?: AlertTone;
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  const s = alertStyle[tone];
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-md border px-4 py-3 text-sm', s.cls)}
    >
      <span className="mt-0.5 shrink-0">{s.icon}</span>
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? 'mt-0.5' : ''}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ───────────────────────── Komponen bersama ───────────────────────── */

export function LecturerInfo({ lecturer }: { lecturer?: Lecturer }) {
  if (!lecturer) return <p className="text-sm text-slate-500">-</p>;
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-900">
        <UserRound className="h-4 w-4" aria-hidden />
      </span>
      <div>
        <p className="text-sm font-medium text-slate-900">{lecturer.name}</p>
        <p className="text-xs text-slate-500">NIDN {lecturer.nidn}</p>
      </div>
    </div>
  );
}

export function FileList({ files }: { files: Record<string, { name: string; size: number }> }) {
  const entries = Object.entries(files);
  if (!entries.length) return <p className="text-sm text-slate-500">Tidak ada berkas.</p>;
  return (
    <ul className="space-y-2">
      {entries.map(([k, f]) => (
        <li
          key={k}
          className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-800">
            <FileText className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">{f.name}</p>
            <p className="text-xs text-slate-500">
              {k.replace(/([A-Z])/g, ' $1').trim()} · {Math.round(f.size / 1024)} KB
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Alert
      tone="danger"
      title="Gagal memuat"
      action={
        <Button variant="outline" onClick={onRetry}>
          Coba lagi
        </Button>
      }
    >
      {message}
    </Alert>
  );
}

export type { BAP, Lecturer, ReviewStatus };