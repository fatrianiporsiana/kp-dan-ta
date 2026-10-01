import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  EmptyState,
  FileList,
  LoadError,
  LecturerInfo,
  Page,
  PageHeader,
  PageLoader,
  RejectModal,
  StatusBadge,
  fmtDateTime,
  useSnapshot,
} from './shared';
import { kpStaffApi } from './api';
import { Check, X, Lock } from 'lucide-react';

export default function Completion() {
  const { data, loading, error, reload } = useSnapshot();
  const [rejectNim, setRejectNim] = useState<string | null>(null);
  const [loadingNim, setLoadingNim] = useState<string | null>(null);

  if (loading) return <PageLoader />;
  if (error || !data)
    return (
      <Page>
        <LoadError message={error ?? 'Data kosong.'} onRetry={reload} />
      </Page>
    );

  // Mahasiswa yang perlu ditinjau: c1 PENDING, atau c2 PENDING (belum COMPLETED)
  const pendingC1 = data.students.filter((s) => s.c1Status === 'PENDING');
  const pendingC2 = data.students.filter(
    (s) => s.c1Status === 'APPROVED' && s.c2Status && s.c2Status !== 'COMPLETED',
  );

  const approve = async (nim: string, stage: 1 | 2) => {
    setLoadingNim(nim);
    try {
      if (stage === 1) await kpStaffApi.approveC1(nim);
      else await kpStaffApi.approveC2(nim);
      await reload();
    } finally {
      setLoadingNim(null);
    }
  };

  const reject = async (note: string) => {
    if (!rejectNim) return;
    setLoadingNim(rejectNim);
    try {
      await kpStaffApi.rejectC1(rejectNim, note);
      setRejectNim(null);
      await reload();
    } finally {
      setLoadingNim(null);
    }
  };

  return (
    <Page>
      <PageHeader
        title="Verifikasi Penyelesaian KP"
        subtitle="Periksa berkas Tahap 1 (prasyarat cetak) dan Tahap 2 (bukti penyerahan ke perpustakaan)."
      />

      <div className="space-y-5">
        {/* ─── Tahap 1 ─── */}
        <Card title="Tahap 1 — Berkas Prasyarat Cetak">
          {pendingC1.length === 0 ? (
            <EmptyState title="Tidak ada berkas Tahap 1 menunggu">
              Semua berkas Tahap 1 sudah diverifikasi.
            </EmptyState>
          ) : (
            <ul className="space-y-4">
              {pendingC1.map((s) => (
                <li key={s.nim} className="rounded-md border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {s.name} · <span className="text-slate-500 font-normal">{s.nim}</span>
                      </p>
                      <p className="text-sm text-slate-600 mt-0.5">{s.company}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Dikirim {fmtDateTime(s.c1SubmittedAt)}
                      </p>
                    </div>
                    {s.c1Status && <StatusBadge status={s.c1Status} />}
                  </div>

                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <p className="text-xs font-semibold text-slate-700 mb-2">Berkas diunggah:</p>
                    <FileList files={s.c1Files ?? {}} />
                  </div>

                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    <Button
                      variant="danger"
                      onClick={() => setRejectNim(s.nim)}
                      disabled={loadingNim === s.nim}
                      icon={<X className="h-4 w-4" />}
                    >
                      Tolak
                    </Button>
                    <Button
                      variant="action"
                      onClick={() => approve(s.nim, 1)}
                      loading={loadingNim === s.nim}
                      icon={<Check className="h-4 w-4" />}
                    >
                      Setujui Tahap 1
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* ─── Tahap 2 ─── */}
        <Card title="Tahap 2 — Bukti Penyerahan Perpustakaan">
          {pendingC2.length === 0 ? (
            <EmptyState title="Tidak ada berkas Tahap 2 menunggu">
              Semua mahasiswa dengan Tahap 1 disetujui sudah mengunggah berkas final.
            </EmptyState>
          ) : (
            <ul className="space-y-4">
              {pendingC2.map((s) => (
                <li key={s.nim} className="rounded-md border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {s.name} · <span className="text-slate-500 font-normal">{s.nim}</span>
                      </p>
                      <p className="text-sm text-slate-600 mt-0.5">{s.company}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Dikirim {fmtDateTime(s.c2SubmittedAt)}
                      </p>
                    </div>
                    {s.c2Status && <StatusBadge status={s.c2Status} />}
                  </div>

                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <p className="text-xs font-semibold text-slate-700 mb-2">Berkas diunggah:</p>
                    <FileList files={s.c2Files ?? {}} />
                  </div>

                  <div className="mt-3 flex justify-end">
                    <Button
                      variant="action"
                      onClick={() => approve(s.nim, 2)}
                      loading={loadingNim === s.nim}
                      icon={<Check className="h-4 w-4" />}
                    >
                      Selesaikan KP
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* ─── Info mahasiswa yang sudah selesai ─── */}
        {data.students.filter((s) => s.c2Status === 'COMPLETED').length > 0 && (
          <Card title="Sudah Selesai">
            <ul className="space-y-3">
              {data.students
                .filter((s) => s.c2Status === 'COMPLETED')
                .map((s) => (
                  <li
                    key={s.nim}
                    className="flex items-center gap-3 rounded-md border border-emerald-100 bg-emerald-50/50 px-4 py-3"
                  >
                    <Check className="h-5 w-5 text-emerald-600 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">
                        {s.name} · <span className="text-slate-500 font-normal">{s.nim}</span>
                      </p>
                      <p className="text-xs text-slate-500">{s.company}</p>
                    </div>
                    <span className="text-xs font-medium text-emerald-700">Selesai</span>
                  </li>
                ))}
            </ul>
          </Card>
        )}
      </div>

      <RejectModal
        open={!!rejectNim}
        title="Tolak berkas Tahap 1"
        onCancel={() => setRejectNim(null)}
        onSubmit={reject}
        loading={!!loadingNim}
      />
    </Page>
  );
}