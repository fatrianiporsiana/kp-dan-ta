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
import { taStaffApi, type StudentTA } from './api';
import { Check, X } from 'lucide-react';

export default function Verify() {
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

  const list = data.students.filter((s) => s.regStatus === 'PENDING');

  const approve = async (nim: string) => {
    setLoadingNim(nim);
    try {
      await taStaffApi.approveRegistration(nim);
      await reload();
    } finally {
      setLoadingNim(null);
    }
  };

  const reject = async (note: string) => {
    if (!rejectNim) return;
    setLoadingNim(rejectNim);
    try {
      await taStaffApi.rejectRegistration(rejectNim, note);
      setRejectNim(null);
      await reload();
    } finally {
      setLoadingNim(null);
    }
  };

  return (
    <Page>
      <PageHeader
        title="Verifikasi Pendaftaran"
        subtitle="Periksa data pendaftaran dan lampiran mahasiswa. Setujui untuk lanjut ke penetapan dospem, atau tolak dengan catatan."
      />

      <div className="space-y-5">
        {list.length === 0 ? (
          <EmptyState title="Tidak ada pendaftaran menunggu">
            Semua pengajuan sudah diverifikasi.
          </EmptyState>
        ) : (
          list.map((s) => (
            <StudentVerifyCard
              key={s.nim}
              student={s}
              loading={loadingNim === s.nim}
              onApprove={() => approve(s.nim)}
              onReject={() => setRejectNim(s.nim)}
            />
          ))
        )}
      </div>

      <RejectModal
        open={!!rejectNim}
        title="Tolak pendaftaran"
        onCancel={() => setRejectNim(null)}
        onSubmit={reject}
        loading={!!loadingNim}
      />
    </Page>
  );
}

function StudentVerifyCard({
  student,
  loading,
  onApprove,
  onReject,
}: {
  student: StudentTA;
  loading: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <Card
      title={`${student.name} · ${student.nim}`}
      aside={<StatusBadge status={student.regStatus} />}
    >
      <div className="space-y-4">
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-slate-500">Jalur</p>
            <p className="font-medium text-slate-900">
              {student.track === 'SKRIPSI' ? 'Skripsi' : 'Jurnal'} · Reg {student.regular}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Dikirim</p>
            <p className="font-medium text-slate-900">{fmtDateTime(student.regSubmittedAt)}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-slate-500">Judul</p>
            <p className="font-medium text-slate-900">{student.title}</p>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <h4 className="mb-2 text-sm font-semibold text-slate-800">Data Diri</h4>
          <DataGrid data={student.regData} />
        </div>

        <div className="border-t border-slate-100 pt-4">
          <h4 className="mb-2 text-sm font-semibold text-slate-800">Lampiran</h4>
          <FileList files={student.regFiles} />
        </div>

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button
            variant="danger"
            onClick={onReject}
            disabled={loading}
            icon={<X className="h-4 w-4" />}
          >
            Tolak
          </Button>
          <Button
            variant="action"
            onClick={onApprove}
            loading={loading}
            icon={<Check className="h-4 w-4" />}
          >
            Setujui
          </Button>
        </div>
      </div>
    </Card>
  );
}