import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Info,
  Loader2,
  Lock,
  Upload,
  UserRound,
  X,
  XCircle,
} from 'lucide-react';
import {
  taApi,
  type Lecturer,
  type Regular,
  type ReviewStatus,
  type Snapshot,
  type Track,
  type UploadedFile,
} from './api';

/* ───────────────────────── Path helper ───────────────────────── */

export const TA_BASE = '/app/ta';
export const taPath = (sub = '') => (sub ? `${TA_BASE}/${sub}` : TA_BASE);

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

export const fmtSize = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/* ───────────────────────── Hooks ───────────────────────── */

export function useSnapshot() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setError(null);
      setData(await taApi.getSnapshot());
    } catch {
      setError('Data tidak dapat dimuat. Periksa koneksi lalu coba lagi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, error, reload };
}

export function useLecturers() {
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  useEffect(() => {
    void taApi.getLecturers().then(setLecturers);
  }, []);
  return lecturers;
}

export function useDraft<T extends object>(key: string, initial: T) {
  const cleared = useRef(false);
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = sessionStorage.getItem(key);
      return raw ? { ...initial, ...(JSON.parse(raw) as Partial<T>) } : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    if (cleared.current) return;
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* noop */
    }
  }, [key, value]);

  const clear = useCallback(() => {
    cleared.current = true;
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* noop */
    }
  }, [key]);

  return [value, setValue, clear] as const;
}

/* ───────────────────────── Layout primitives ───────────────────────── */

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

/* ───────────────────────── Button ───────────────────────── */

type Variant = 'download' | 'action' | 'outline' | 'ghost';

const variantCls: Record<Variant, string> = {
  download: 'bg-blue-800 text-white hover:bg-blue-900 focus-visible:ring-blue-300',
  action: 'bg-orange-500 text-white hover:bg-orange-600 focus-visible:ring-orange-300',
  outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-300',
  ghost: 'text-blue-800 hover:bg-blue-50 focus-visible:ring-blue-200',
};

const baseBtn =
  'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({
  variant = 'action',
  loading,
  icon,
  children,
  className,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
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

export function DownloadLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} download className={cn(baseBtn, variantCls.download)}>
      {children}
    </a>
  );
}

/* ───────────────────────── Form primitives ───────────────────────── */

export const inputCls =
  'block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-slate-100 disabled:text-slate-500 read-only:bg-slate-100 read-only:text-slate-600';

export function Field({
  label,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('block', className)} data-error={error ? 'true' : undefined}>
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </span>
      {children}
      {error ? (
        <span role="alert" className="mt-1 block text-xs text-red-600">
          {error}
        </span>
      ) : (
        hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>
      )}
    </label>
  );
}

export function OptionGroup<T extends string>({
  legend,
  value,
  options,
  onChange,
  error,
  disabled,
}: {
  legend: string;
  value: T | '';
  options: Array<{ value: T; label: string; hint?: string }>;
  onChange: (v: T) => void;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <fieldset data-error={error ? 'true' : undefined} disabled={disabled}>
      <legend className="mb-2 block text-sm font-medium text-slate-700">
        {legend} <span className="text-red-600">*</span>
      </legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((o) => {
          const selected = value === o.value;
          return (
            <label
              key={o.value}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm transition-all',
                selected
                  ? 'border-blue-800 bg-blue-50 ring-1 ring-blue-800'
                  : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50',
              )}
            >
              {/* Custom radio */}
              <span
                className={cn(
                  'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                  selected ? 'border-blue-800 bg-white' : 'border-slate-400 bg-white',
                )}
              >
                {selected && <span className="h-2 w-2 rounded-full bg-blue-800" />}
              </span>
              <input
                type="radio"
                name={legend}
                checked={selected}
                onChange={() => onChange(o.value)}
                className="sr-only"
              />
              <span>
                <span
                  className={cn(
                    'block font-medium',
                    selected ? 'text-blue-900' : 'text-slate-900',
                  )}
                >
                  {o.label}
                </span>
                {o.hint && <span className="block text-xs text-slate-500">{o.hint}</span>}
              </span>
            </label>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </fieldset>
  );
}

/* ───────────────────────── File upload ───────────────────────── */

export type AcceptKind = 'pdf' | 'pdf-img' | 'img';

const ACCEPT: Record<AcceptKind, { attr: string; exts: string[]; label: string }> = {
  pdf: { attr: '.pdf,application/pdf', exts: ['pdf'], label: 'PDF' },
  'pdf-img': {
    attr: '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png',
    exts: ['pdf', 'jpg', 'jpeg', 'png'],
    label: 'PDF / JPG',
  },
  img: { attr: '.jpg,.jpeg,.png,image/jpeg,image/png', exts: ['jpg', 'jpeg', 'png'], label: 'JPG / PNG' },
};

export function validateFile(file: File, accept: AcceptKind, maxMB: number): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!ACCEPT[accept].exts.includes(ext)) return `Format harus ${ACCEPT[accept].label}.`;
  if (file.size > maxMB * 1024 * 1024) return `Ukuran berkas melebihi ${maxMB} MB.`;
  return null;
}

export function FileUpload({
  label,
  hint,
  accept,
  maxMB,
  value,
  onChange,
  error,
  required,
  disabled,
}: {
  label: string;
  hint?: string;
  accept: AcceptKind;
  maxMB: number;
  value?: File | UploadedFile | null;
  onChange: (file: File | null) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const shownError = localError ?? error;

  const handle = (file?: File) => {
    if (!file) return;
    const problem = validateFile(file, accept, maxMB);
    setLocalError(problem);
    if (!problem) onChange(file);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div data-error={shownError ? 'true' : undefined} className="flex h-full flex-col">
      {/* Label wrapper: tinggi minimum 2 baris biar simetris */}
      <div className="mb-1.5 flex min-h-[2.75rem] items-start justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2">
          {label}
          {required && <span className="text-red-600"> *</span>}
        </p>
        <span className="shrink-0 text-[11px] text-slate-500 whitespace-nowrap pt-0.5">
          {ACCEPT[accept].label} · maks. {maxMB} MB
        </span>
      </div>

      {/* Isi: file selected atau tombol upload */}
      <div className="flex-1">
        {value ? (
          <div className="flex items-center gap-2.5 rounded-lg border border-blue-200 bg-blue-50/50 px-3 py-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-100 text-blue-800">
              <FileText className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{value.name}</p>
              <p className="text-xs text-slate-500">{fmtSize(value.size)}</p>
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={() => {
                  setLocalError(null);
                  onChange(null);
                }}
                className="shrink-0 rounded-md p-1 text-slate-500 hover:bg-white hover:text-red-600 transition"
                aria-label={`Hapus berkas ${label}`}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className={cn(
              'group flex h-full w-full items-center justify-between gap-3 rounded-lg border-2 border-dashed px-3 py-3 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 disabled:cursor-not-allowed disabled:opacity-50',
              shownError
                ? 'border-red-400 bg-red-50'
                : 'border-slate-300 bg-white hover:border-orange-400 hover:bg-orange-50/40',
            )}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors',
                  shownError
                    ? 'bg-red-100 text-red-700'
                    : 'bg-blue-50 text-blue-800 group-hover:bg-orange-100 group-hover:text-orange-700',
                )}
              >
                <Upload className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-slate-700 truncate">
                  Klik untuk memilih berkas
                </span>
                <span className="block text-xs text-slate-500 truncate">
                  atau seret & lepas ke sini
                </span>
              </span>
            </div>

            <span className="shrink-0 inline-flex items-center gap-1.5 rounded-md bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white group-hover:bg-orange-600 transition-colors">
              <Upload className="h-3.5 w-3.5" aria-hidden />
              Pilih
            </span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT[accept].attr}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => handle(e.target.files?.[0])}
      />

      {shownError ? (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {shownError}
        </p>
      ) : (
        hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>
      )}
    </div>
  );
}

/* ───────────────────────── Lampiran dinamis ───────────────────────── */

export interface AttachmentDef {
  key: string;
  label: string;
  accept: AcceptKind;
  maxMB: number;
  hint?: string;
}

export function registrationAttachments(track: Track | '', regular: Regular | ''): AttachmentDef[] {
  const formLabel =
    track === 'JURNAL' ? 'Form TA Jurnal' : track === 'SKRIPSI' ? 'Form TA Skripsi' : 'Form TA Skripsi/Jurnal';
  const list: AttachmentDef[] = [
    { key: 'proposal', label: 'Soft file Proposal TA / Kapsel (ACC)', accept: 'pdf', maxMB: 10 },
    { key: 'nilaiBimbingan', label: 'Verifikasi nilai bimbingan', accept: 'pdf', maxMB: 2 },
    { key: 'pembayaran', label: 'Histori pembayaran', accept: 'pdf', maxMB: 2 },
    { key: 'frs', label: 'FRS semester berjalan', accept: 'pdf', maxMB: 2 },
    {
      key: 'toefl',
      label: 'Sertifikat TOEFL (min. 450)',
      accept: 'pdf',
      maxMB: 2,
    },
    { key: 'formTA', label: formLabel, accept: 'pdf', maxMB: 2 },
    { key: 'lsp', label: 'Sertifikat LSP', accept: 'pdf', maxMB: 2 },
  ];
  if (regular === 'A') list.push({ key: 'pkm', label: 'Sertifikat PKM', accept: 'pdf', maxMB: 2 });
  if (regular === 'B')
    list.push({ key: 'ilmiah', label: 'Sertifikat Kegiatan Ilmiah', accept: 'pdf', maxMB: 2 });
  return list;
}

export function defenseAttachments(regular: Regular | ''): AttachmentDef[] {
  const list: AttachmentDef[] = [
    { key: 'pasFoto', label: 'Pas foto formal (latar biru)', accept: 'img', maxMB: 2 },
    { key: 'nilaiAkhir', label: 'Verifikasi nilai akhir sidang', accept: 'pdf', maxMB: 2 },
    { key: 'pembayaran', label: 'Histori pembayaran (PUPd)', accept: 'pdf', maxMB: 2 },
    { key: 'akteLahir', label: 'Scan akte kelahiran', accept: 'pdf-img', maxMB: 2 },
    { key: 'toefl', label: 'Scan sertifikat TOEFL (min. 450)', accept: 'pdf-img', maxMB: 2 },
    { key: 'draf', label: 'Draf laporan (Jurnal / Skripsi)', accept: 'pdf', maxMB: 10 },
    { key: 'kartuBimbingan', label: 'Scan kartu bimbingan (bolak-balik)', accept: 'pdf-img', maxMB: 2 },
    { key: 'lsp', label: 'Sertifikat LSP', accept: 'pdf', maxMB: 2 },
  ];
  if (regular === 'A') list.push({ key: 'pkm', label: 'Sertifikat PKM', accept: 'pdf', maxMB: 2 });
  if (regular === 'B')
    list.push({ key: 'ilmiah', label: 'Sertifikat Kegiatan Ilmiah', accept: 'pdf', maxMB: 2 });
  return list;
}

export const JOURNAL_EXTRA_ATTACHMENTS: AttachmentDef[] = [
  { key: 'jurnal', label: 'Jurnal', accept: 'pdf', maxMB: 10 },
  { key: 'loa', label: 'Letter of Acceptance (LoA)', accept: 'pdf', maxMB: 2 },
  { key: 'plagiasi', label: 'Bukti non-plagiarisme (< 20%)', accept: 'pdf', maxMB: 2 },
  { key: 'buktiBayarJurnal', label: 'Bukti bayar jurnal', accept: 'pdf-img', maxMB: 2 },
    { key: 'korespondensi', label: 'Bukti korespondensi dengan publisher', accept: 'pdf', maxMB: 2 },
  { key: 'indexSinta', label: 'Bukti index publisher / Sinta', accept: 'pdf-img', maxMB: 2 },
];

export const COMPLETION_STAGE1: AttachmentDef[] = [
  { key: 'naskahFinal', label: 'Softfile naskah TA final (tanpa tanda tangan)', accept: 'pdf', maxMB: 10 },
  {
    key: 'lembarRevisi',
    label: 'Scan lembar persetujuan revisi (ditandatangani Pembimbing & Penguji)',
    accept: 'pdf-img',
    maxMB: 2,
  },
  {
    key: 'kartuBimbingan',
    label: 'Scan kartu bimbingan (ditandatangani Pembimbing & Sekprodi)',
    accept: 'pdf-img',
    maxMB: 2,
  },
];

export const COMPLETION_STAGE2: AttachmentDef[] = [
  {
    key: 'naskahFinal',
    label: 'Softfile naskah TA final (beserta scan tanda tangan dari Tahap 1)',
    accept: 'pdf',
    maxMB: 10,
  },
  {
    key: 'tandaTerimaPerpus',
    label: 'Surat tanda terima dari Perpustakaan',
    accept: 'pdf-img',
    maxMB: 2,
  },
];

export function missingAttachments(
  defs: AttachmentDef[],
  files: Record<string, File | null | undefined>,
): Record<string, string> {
  const errs: Record<string, string> = {};
  defs.forEach((d) => {
    if (!files[d.key]) errs[d.key] = 'Berkas wajib diunggah.';
  });
  return errs;
}

export function AttachmentFields({
  defs,
  files,
  errors,
  onChange,
  disabled,
  startAt = 1,
}: {
  defs: AttachmentDef[];
  files: Record<string, File | null | undefined>;
  errors?: Record<string, string>;
  onChange: (key: string, file: File | null) => void;
  disabled?: boolean;
  startAt?: number;
}) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {defs.map((d, i) => (
        <FileUpload
          key={d.key}
          label={`${startAt + i}. ${d.label}`}
          hint={d.hint}
          accept={d.accept}
          maxMB={d.maxMB}
          value={files[d.key]}
          error={errors?.[d.key]}
          onChange={(f) => onChange(d.key, f)}
          disabled={disabled}
          required
        />
      ))}
    </div>
  );
}

export function scrollToFirstError() {
  requestAnimationFrame(() => {
    document
      .querySelector('[data-error="true"]')
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

/* ───────────────────────── Status & feedback ───────────────────────── */

const statusStyle: Record<ReviewStatus, { cls: string; icon: ReactNode }> = {
  PENDING: { cls: 'bg-amber-50 text-amber-800 ring-amber-200', icon: <Clock className="h-3.5 w-3.5" /> },
  APPROVED: { cls: 'bg-emerald-50 text-emerald-800 ring-emerald-200', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  REJECTED: { cls: 'bg-red-50 text-red-800 ring-red-200', icon: <XCircle className="h-3.5 w-3.5" /> },
};

export const LABELS: Record<'registration' | 'extension' | 'documents', Record<ReviewStatus, string>> = {
  registration: { PENDING: 'Diajukan', APPROVED: 'Diverifikasi', REJECTED: 'Ditolak' },
  extension: { PENDING: 'Diajukan', APPROVED: 'Disetujui', REJECTED: 'Ditolak' },
  documents: { PENDING: 'Menunggu verifikasi Staff', APPROVED: 'Diverifikasi', REJECTED: 'Ditolak' },
};

export function StatusBadge({
  status,
  labels = LABELS.registration,
}: {
  status: ReviewStatus;
  labels?: Record<ReviewStatus, string>;
}) {
  const s = statusStyle[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset', s.cls)}>
      {s.icon}
      {labels[status]}
    </span>
  );
}

type AlertTone = 'info' | 'warning' | 'danger' | 'success' | 'locked';

const alertStyle: Record<AlertTone, { cls: string; icon: ReactNode }> = {
  info: { cls: 'border-blue-200 bg-blue-50 text-blue-900', icon: <Info className="h-4 w-4" /> },
  warning: { cls: 'border-amber-200 bg-amber-50 text-amber-900', icon: <AlertCircle className="h-4 w-4" /> },
  danger: { cls: 'border-red-300 bg-red-50 text-red-900', icon: <XCircle className="h-4 w-4" /> },
  success: { cls: 'border-emerald-200 bg-emerald-50 text-emerald-900', icon: <CheckCircle2 className="h-4 w-4" /> },
  locked: { cls: 'border-slate-300 bg-slate-100 text-slate-700', icon: <Lock className="h-4 w-4" /> },
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

export function RejectionNote({ note, title = 'Perlu perbaikan' }: { note?: string; title?: string }) {
  return (
    <Alert tone="danger" title={title}>
      {note ? <>Catatan Staff: {note}</> : 'Staff menolak pengajuan ini tanpa catatan tambahan.'}
    </Alert>
  );
}

/* ───────────────────────── Stepper ───────────────────────── */

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  const pct = Math.min(100, Math.round((Math.min(current, steps.length) / steps.length) * 100));
  return (
    <div>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-slate-200" aria-hidden>
        <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <ol className="grid gap-3 sm:grid-cols-5">
        {steps.map((label, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={label} aria-current={active ? 'step' : undefined} className="flex items-center gap-2.5 sm:flex-col sm:items-start sm:gap-1.5">
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                  done && 'bg-blue-900 text-white',
                  active && 'bg-orange-500 text-white',
                  !done && !active && 'bg-slate-200 text-slate-500',
                )}
              >
                {done ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : i + 1}
              </span>
              <span>
                <span className={cn('block text-sm font-medium', active ? 'text-slate-900' : done ? 'text-blue-900' : 'text-slate-500')}>
                  {label}
                </span>
                {active && <span className="block text-xs text-orange-600">Sedang berjalan</span>}
                {done && <span className="block text-xs text-slate-500">Selesai</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export const TA_STAGES = ['Pendaftaran', 'Bimbingan', 'Sidang', 'Revisi', 'Penyelesaian'];

export function computeStage(s: Snapshot): number {
  if (s.completion.stage2) return 5;
  if (s.revision.file || s.completion.stage1) return 4;
  if (s.revision.notes.length > 0) return 3;
  if (s.defense) return 2;
  if (s.registration?.status === 'APPROVED') return 1;
  return 0;
}

/* ───────────────────────── Supervisor card ───────────────────────── */

export function SupervisorList({
  main,
  co,
  emptyText = 'Dosen pembimbing akan ditetapkan Staff setelah pendaftaran diverifikasi.',
}: {
  main?: Lecturer;
  co?: Lecturer;
  emptyText?: string;
}) {
  if (!main && !co) return <p className="text-sm text-slate-600">{emptyText}</p>;
  const rows: Array<[string, Lecturer | undefined]> = [
    ['Pembimbing utama', main],
    ['Co-pembimbing', co],
  ];
  return (
    <ul className="space-y-3">
      {rows.map(
        ([role, l]) =>
          l && (
            <li key={role} className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-900">
                <UserRound className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-medium text-slate-900">{l.name}</p>
                <p className="text-xs text-slate-500">
                  {role} · NIDN {l.nidn}
                </p>
              </div>
            </li>
          ),
      )}
    </ul>
  );
}

export function Page({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-5xl bg-slate-50 px-4 py-6 sm:px-6">{children}</div>;
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