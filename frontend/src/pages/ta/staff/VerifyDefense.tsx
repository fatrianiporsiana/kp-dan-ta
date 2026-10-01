import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  DataGrid,
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
import { taStaffApi } from './api';
import { Check, X } from 'lucide-react';

export default function VerifyDefense() {
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

  const list = data.students.filter((s) => s.defenseStatus === 'PENDING');

  const approve = async (nim: string) => {
    setLoadingNim(nim);
    try {
      await taStaffApi.approveDefense(nim);
      await reload();
    } finally {
      setLoadingNim(null);
    }
  };

  const reject = async (note: string) => {
    if (!rejectNim) return;
    setLoadingNim(rejectNim);
    try {
      await taStaffApi.rejectDefense(rejectNim, note);
      setRejectNim(null);
      await reload();
    } finally {
      setLoadingNim(null);
    }
  };

  return (
    <Page>
      <PageHeader
        title="Verifikasi Dokumen Sidang"
        subtitle="Periksa seluruh lampiran pengajuan sidang. Setujui untuk lanjut ke penjadwalan sidang, atau tolak dengan catatan."
      />

      <div className="space-y-5">
        {list.length === 0 ? (
          <EmptyState title="Tidak ada dokumen sidang menunggu">
            Semua pengajuan sidang sudah diverifikasi.
          </EmptyState>
        ) : (
          list.map((s) => (
            <Card
              key={s.nim}
              title={`${s.name} · ${s.nim}`}
              aside={<StatusBadge status={s.defenseStatus!} />}
            >
              <div className="space-y-4">
                                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-slate-500">Dosen Pembimbing</p>
                    <p className="font-medium text-slate-900">
                      {s.mainSupervisor?.name ?? '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Dikirim</p>
                    <p className="font-medium text-slate-900">
                      {fmtDateTime(s.defenseSubmittedAt)}
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <h4 className="mb-2 text-sm font-semibold text-slate-800">
                    Data Tambahan
                  </h4>
                  {s.defenseData ? (
                    <DataGrid data={s.defenseData} />
                  ) : (
                    <p className="text-sm text-slate-500">Tidak ada data.</p>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <h4 className="mb-2 text-sm font-semibold text-slate-800">
                    Lampiran ({Object.keys(s.defenseFiles ?? {}).length})
                  </h4>
                  <FileList files={s.defenseFiles ?? {}} />
                </div>

                <div className="flex flex-wrap justify-end gap-2 pt-2">
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
                    Setujui
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <RejectModal
        open={!!rejectNim}
        title="Tolak dokumen sidang"
        onCancel={() => setRejectNim(null)}
        onSubmit={reject}
        loading={!!loadingNim}
      />
    </Page>
  );
}