import React, { ReactNode, useState, useRef } from 'react';
import { FileText, Upload, X } from 'lucide-react';
import { Status } from '../types';

export const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`bg-white rounded-xl shadow-md border border-slate-200 p-4 sm:p-6 ${className}`}>
    {children}
  </div>
);

const cls = {
  accent: 'bg-accent-500 hover:bg-accent-600 text-white',
  primary: 'bg-primary-700 hover:bg-primary-900 text-white',
  soft: 'bg-primary-100 text-primary-700 hover:bg-primary-500 hover:text-white',
  ghost: 'border border-slate-300 text-slate-700 hover:bg-slate-100',
};

export const btnCls = (v: keyof typeof cls = 'accent') =>
  `inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${cls[v]}`;

export function Btn({
  v = 'accent',
  loading,
  children,
  className = '',
  disabled,
  ...p
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  v?: keyof typeof cls;
  loading?: boolean;
}) {
  return (
    <button
      {...p}
      disabled={disabled || loading}
      className={`${btnCls(v)} ${className} ${loading ? 'opacity-70 cursor-wait' : ''}`}
    >
      {loading && (
        <span
          className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5"
          aria-hidden
        />
      )}
      {children}
    </button>
  );
}

/* ═══════════ FIELD (Input text) ═══════════ */

export function Field({
  label,
  ...p
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <input
        {...p}
        className="
          mt-1.5 w-full rounded-lg
          border-2 border-slate-300
          bg-white px-3.5 py-2.5
          text-sm text-slate-800
          shadow-sm
          placeholder:text-slate-400
          transition-all duration-150
          hover:border-slate-400
          focus:outline-none
          focus:border-orange-500
          focus:ring-4 focus:ring-orange-100
          read-only:bg-slate-100
          read-only:text-slate-500
          read-only:border-slate-200
          read-only:shadow-none
          read-only:cursor-not-allowed
        "
      />
    </label>
  );
}

/* ═══════════ FILE FIELD (Compact + Simetris) ═══════════ */

export function FileField({
  label,
  max,
  types = '.pdf',
  value,
  onChange,
}: {
  label: string;
  max: number;
  types?: string;
  value?: string;
  onChange: (n: string) => void;
}) {
  const [err, setErr] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const check = (f?: File) => {
    if (!f) return;
    if (!types.split(',').some((t) => f.name.toLowerCase().endsWith(t.trim())))
      return setErr(`Format harus ${types}`);
    if (f.size > max * 1048576) return setErr(`Ukuran maksimal ${max}MB`);
    setErr('');
    onChange(f.name);
    if (inputRef.current) inputRef.current.value = '';
  };

  const formatLabel = types.replace(/\./g, '').replace(/,/g, ' / ').toUpperCase();

  return (
    <div className="flex h-full flex-col">
      {/* Label + format */}
      <div className="mb-1.5 flex min-h-[2.75rem] items-start justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2">
          {label}
          <span className="text-red-600"> *</span>
        </p>
        <span className="shrink-0 text-[11px] text-slate-500 whitespace-nowrap pt-0.5">
          {formatLabel} · maks. {max} MB
        </span>
      </div>

      {/* Isi */}
      <div className="flex-1">
        {value ? (
          <div className="flex items-center gap-2.5 rounded-lg border border-blue-200 bg-blue-50/50 px-3 py-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-100 text-blue-800">
              <FileText className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{value}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setErr('');
                onChange('');
              }}
              className="shrink-0 rounded-md p-1 text-slate-500 hover:bg-white hover:text-red-600 transition"
              aria-label={`Hapus berkas ${label}`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              check(e.dataTransfer.files[0]);
            }}
            className={`group flex h-full w-full items-center justify-between gap-3 rounded-lg border-2 border-dashed px-3 py-3 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 ${
              err
                ? 'border-red-400 bg-red-50'
                : 'border-slate-300 bg-white hover:border-orange-400 hover:bg-orange-50/40'
            }`}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors ${
                  err
                    ? 'bg-red-100 text-red-700'
                    : 'bg-blue-50 text-blue-800 group-hover:bg-orange-100 group-hover:text-orange-700'
                }`}
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
        accept={types}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => check(e.target.files?.[0])}
      />

      {err && (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {err}
        </p>
      )}
    </div>
  );
}

/* ═══════════ Footer ═══════════ */

export const Footer = () => (
  <footer className="bg-primary-700 text-center text-xs py-2 text-accent-500">
    © Made with love in Informatika
  </footer>
);

/* ═══════════ Badge ═══════════ */

const BC: Record<Status, [string, string]> = {
  NONE: ['Belum ada', 'bg-slate-100 text-slate-600'],
  PENDING: ['Menunggu verifikasi', 'bg-amber-100 text-amber-700'],
  IN_REVIEW: ['Sedang direview', 'bg-blue-100 text-blue-700'],
  REJECTED: ['Ditolak', 'bg-red-100 text-red-700'],
  APPROVED: ['Disetujui', 'bg-green-100 text-green-700'],
  COMPLETED: ['Selesai', 'bg-green-100 text-green-700'],
};

export const Badge = ({ s }: { s: Status }) => (
  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${BC[s][1]}`}>{BC[s][0]}</span>
);

/* ═══════════ Alert ═══════════ */

export const Alert = ({
  t = 'info',
  children,
}: {
  t?: 'info' | 'error' | 'ok';
  children: ReactNode;
}) => (
  <div
    className={`rounded-lg p-3 text-sm border ${
      t === 'error'
        ? 'bg-red-50 border-red-300 text-red-700'
        : t === 'ok'
        ? 'bg-green-50 border-green-300 text-green-700'
        : 'bg-primary-50 border-primary-100 text-primary-700'
    }`}
  >
    {children}
  </div>
);