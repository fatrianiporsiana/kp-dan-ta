import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Info,
  Loader2,
  UserRound,
  XCircle,
} from 'lucide-react';
import {
  prodiApi,
  type Lecturer,
  type Snapshot,
} from './api';

/* ───────────────────────── Path helper ───────────────────────── */

export const PRODI_BASE = '/app/prodi';
export const prodiPath = (sub = '') => (sub ? `${PRODI_BASE}/${sub}` : PRODI_BASE);

export const cn = (...c: Array<string | false | null | undefined>) =>
  c.filter(Boolean).join(' ');

/* ───────────────────────── Format ───────────────────────── */

export const fmtDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
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
      setData(await prodiApi.getSnapshot());
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

/** Debounce untuk search */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
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

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <p className="font-medium text-slate-900">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">{children}</p>}
    </div>
  );
}

export function Page({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-6xl bg-slate-50 px-4 py-6 sm:px-6">{children}</div>;
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
}: {
  tone?: AlertTone;
  title?: string;
  children?: ReactNode;
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
    </div>
  );
}

export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Alert
      tone="danger"
      title="Gagal memuat"
    >
      {message}
      <div className="mt-2">
        <Button variant="outline" onClick={onRetry}>
          Coba lagi
        </Button>
      </div>
    </Alert>
  );
}

/* ───────────────────────── Badge ───────────────────────── */

export function StageBadge({ stage }: { stage: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    // TA
    PENDAFTARAN: { cls: 'bg-slate-100 text-slate-700', label: 'Pendaftaran' },
    BIMBINGAN: { cls: 'bg-blue-100 text-blue-800', label: 'Bimbingan' },
    SIDANG: { cls: 'bg-amber-100 text-amber-800', label: 'Sidang' },
    REVISI: { cls: 'bg-orange-100 text-orange-800', label: 'Revisi' },
    SELESAI: { cls: 'bg-emerald-100 text-emerald-800', label: 'Selesai' },
    // KP
    PENYELESAIAN: { cls: 'bg-amber-100 text-amber-800', label: 'Penyelesaian' },
  };
  const s = map[stage] ?? { cls: 'bg-slate-100 text-slate-700', label: stage };
  return <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', s.cls)}>{s.label}</span>;
}

export function GradeBadge({ grade }: { grade?: string }) {
  if (!grade || grade === '-') return <span className="text-xs text-slate-400">-</span>;
  const cls =
    grade === 'A' || grade === 'A-'
      ? 'bg-emerald-100 text-emerald-800'
      : grade === 'B+' || grade === 'B'
      ? 'bg-blue-100 text-blue-800'
      : 'bg-amber-100 text-amber-800';
  return <span className={cn('rounded-full px-2.5 py-1 text-xs font-bold', cls)}>{grade}</span>;
}

export function LecturerCell({ lecturer }: { lecturer?: Lecturer }) {
  if (!lecturer) return <span className="text-xs text-slate-400">-</span>;
  return (
    <div className="flex items-center gap-1.5">
      <UserRound className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden />
      <span className="text-xs text-slate-700 truncate" title={lecturer.name}>
        {lecturer.name.replace(/^(Dr\.|Ir\.|Prof\.)\s/, '').split(',')[0]}
      </span>
    </div>
  );
}

/* ───────────────────────── Filter Bar ───────────────────────── */

export function FilterBar({
  search,
  onSearch,
  filters,
}: {
  search: string;
  onSearch: (v: string) => void;
  filters?: {
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (v: string) => void;
  }[];
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-3">
      <input
        type="text"
        placeholder="Cari NIM, nama, atau judul..."
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        className="flex-1 min-w-[200px] rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
      />
      {filters?.map((f) => (
        <select
          key={f.label}
          value={f.value}
          onChange={(e) => f.onChange(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          <option value="">{f.label}</option>
          {f.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ))}
    </div>
  );
}

/** Hook filter+search untuk rekap */
export function useFilteredRows<T extends { nim: string; name: string; title?: string }>(
  rows: T[],
  search: string,
  filterKey: keyof T,
  filterValue: string,
) {
  const debounced = useDebounce(search);
  return useMemo(() => {
    const q = debounced.toLowerCase().trim();
    return rows.filter((r) => {
      if (filterValue && String(r[filterKey]) !== filterValue) return false;
      if (!q) return true;
      return (
        r.nim.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        (r.title?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [rows, debounced, filterKey, filterValue]);
}