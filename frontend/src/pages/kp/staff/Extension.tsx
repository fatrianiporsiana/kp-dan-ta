import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  EmptyState,
  FileList,
  LoadError,
  Page,
  PageHeader,
  PageLoader,
  RejectModal,
  StatusBadge,
  fmtDateTime,
  useSnapshot,
} from './shared';
import { kpStaffApi } from './api';
import { CalendarClock, Check, X } from 'lucide-react';

export default function Extension() {
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

  const pending = data.students.filter((s) => s.extStatus === 'PENDING');
  const history = data.students.filter(
    (s) => s.extStatus === 'APPROVED' || s.extStatus === 'REJECTED',
  );

  const approve = async (nim: string) => {
    setLoadingNim(nim);
    try {
      await kpStaffApi.approveExtension(nim);
      await reload();
    } finally {
      setLoadingNim(null);
    }
  };

  const reject = async (note: string) => {
    if (!rejectNim) return;
    setLoadingNim(rejectNim);
    try {
      await kpStaffApi.rejectExtension(rejectNim, note);
      setRejectNim(null);
      await reload();
    } finally {
      setLoadingNim(null);
    }
  };

  return (
    <Page>
      <PageHeader
        title="Konfirmasi Perpanjangan KP"
        subtitle="Tinjau pengajuan perpanjangan masa Kerja Praktek mahasiswa beserta alasan dan bukti pendukungnya."
      />

      <div className="space-y-5">
        {/* ─── Menunggu Verifikasi ─── */}
        <Card title="Menunggu Verifikasi">
          {pending.length === 0 ? (
            <EmptyState title="Tidak ada pengajuan perpanjangan">
              Semua pengajuan perpanjangan sudah ditinjau.
            </EmptyState>
          ) : (
            <ul className="space-y-4">
              {pending.map((s) => (
                <li key={s.nim} className="rounded-md border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                        <CalendarClock className="h-5 w-5" aria-hidden />
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900">
                          {s.name} · <span className="text-slate-500 font-normal">{s.nim}</span>
                        </p>
                        <p className="text-xs text-slate-500">
                          Dikirim {fmtDateTime(s.extSubmittedAt)}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status="PENDING" />
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-md bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Durasi</p>
                      <p className="text-sm font-medium text-slate-900">
                        {s.extData?.durasi ?? '-'} bulan
                      </p>
                    </div>
                    <div className="rounded-md bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Instansi</p>
                      <p className="text-sm font-medium text-slate-900">{s.company}</p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <p className="text-xs font-semibold text-slate-700 mb-1">Alasan:</p>
                    <p className="text-sm text-slate-800 whitespace-pre-line">
                      {s.extData?.alasan ?? '-'}
                    </p>
                  </div>

                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <p className="text-xs font-semibold text-slate-700 mb-2">Bukti Pendukung:</p>
                    <FileList files={s.extFiles ?? {}} />
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
                      onClick={() => approve(s.nim)}
                      loading={loadingNim === s.nim}
                      icon={<Check className="h-4 w-4" />}
                    >
                      Setujui Perpanjangan
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* ─── Riwayat ─── */}
        {history.length > 0 && (
          <Card title="Riwayat Keputusan">
            <ul className="space-y-3">
              {history.map((s) => (
                <li
                  key={s.nim}
                  className={`rounded-md border px-4 py-3 ${
                    s.extStatus === 'APPROVED'
                      ? 'border-emerald-100 bg-emerald-50/40'
                      : 'border-red-100 bg-red-50/40'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {s.name} · <span className="text-slate-500 font-normal">{s.nim}</span>
                      </p>
                      <p className="text-xs text-slate-500">
                        {s.extData?.durasi} bulan · {fmtDateTime(s.extSubmittedAt)}
                      </p>
                    </div>
                    {s.extStatus && <StatusBadge status={s.extStatus} />}
                  </div>
                  {s.extNote && (
                    <p className="mt-2 text-xs text-red-600">Catatan: {s.extNote}</p>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      <RejectModal
        open={!!rejectNim}
        title="Tolak perpanjangan KP"
        onCancel={() => setRejectNim(null)}
        onSubmit={reject}
        loading={!!loadingNim}
      />
    </Page>
  );
}