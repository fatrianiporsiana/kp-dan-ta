import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  EmptyState,
  LoadError,
  Page,
  PageHeader,
  PageLoader,
  LecturerList,
  fmtDateTime,
  useSnapshot,
} from './shared';
import { taStaffApi, type StudentTA } from './api';
import { Check, Save } from 'lucide-react';

export default function Supervisors() {
  const { data, loading, error, reload } = useSnapshot();
  const [activeNim, setActiveNim] = useState<string | null>(null);

  if (loading) return <PageLoader />;
  if (error || !data)
    return (
      <Page>
        <LoadError message={error ?? 'Data kosong.'} onRetry={reload} />
      </Page>
    );

  const list = data.students.filter(
    (s) => s.regStatus === 'APPROVED' && !s.mainSupervisor,
  );

  return (
    <Page>
      <PageHeader
        title="Penetapan Dosen Pembimbing"
        subtitle="Tetapkan dosen pembimbing utama dan co-pembimbing untuk mahasiswa yang sudah diverifikasi."
      />

      <div className="space-y-5">
        {list.length === 0 ? (
          <EmptyState title="Tidak ada mahasiswa menunggu penetapan">
            Semua mahasiswa yang diverifikasi sudah punya dosen pembimbing.
          </EmptyState>
        ) : (
          list.map((s) => (
            <SupervisorCard
              key={s.nim}
              student={s}
              lecturers={data.lecturers}
              onSaved={reload}
            />
          ))
        )}

        {/* Daftar yang sudah ditetapkan (read-only) */}
        {data.students.filter((s) => s.mainSupervisor).length > 0 && (
          <Card title="Sudah Ditetapkan">
            <ul className="space-y-4">
              {data.students
                .filter((s) => s.mainSupervisor)
                .map((s) => (
                  <li key={s.nim} className="rounded-md border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {s.name} · <span className="text-slate-500 font-normal">{s.nim}</span>
                        </p>
                        <p className="text-sm text-slate-600 mt-0.5">{s.title}</p>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-md bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Pembimbing Utama</p>
                        <p className="text-sm font-medium text-slate-900">
                          {s.mainSupervisor?.name ?? '-'}
                        </p>
                      </div>
                      <div className="rounded-md bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Co-Pembimbing</p>
                        <p className="text-sm font-medium text-slate-900">
                          {s.coSupervisor?.name ?? '-'}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
            </ul>
          </Card>
        )}
      </div>
    </Page>
  );
}

function SupervisorCard({
  student,
  lecturers,
  onSaved,
}: {
  student: StudentTA;
  lecturers: import('./api').Lecturer[];
  onSaved: () => void;
}) {
  const [main, setMain] = useState(student.proposedSupervisors[0] ?? '');
  const [co, setCo] = useState(student.proposedSupervisors[1] ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const save = async () => {
    if (!main || !co) return setErr('Pilih dosen pembimbing utama dan co-pembimbing.');
    if (main === co) return setErr('Pembimbing utama dan co-pembimbing harus berbeda.');
    setErr('');
    setSaving(true);
    try {
      await taStaffApi.setSupervisors(student.nim, main, co);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const opt = (exclude: string) =>
    lecturers.map((l) => (
      <option key={l.id} value={l.id} disabled={l.id === exclude}>
        {l.name} — NIDN {l.nidn}
      </option>
    ));

  return (
    <Card title={`${student.name} · ${student.nim}`}>
      <div className="space-y-4">
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-slate-500">Jalur</p>
            <p className="font-medium text-slate-900">
              {student.track === 'SKRIPSI' ? 'Skripsi' : 'Jurnal'} · Reg {student.regular}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Diverifikasi</p>
            <p className="font-medium text-slate-900">{fmtDateTime(student.regSubmittedAt)}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-slate-500">Judul</p>
            <p className="font-medium text-slate-900">{student.title}</p>
          </div>
        </div>

        <Alert tone="info" title="Usulan mahasiswa">
          Pembimbing 1: <b>{lecturers.find((l) => l.id === student.proposedSupervisors[0])?.name}</b>
          <br />
          Pembimbing 2: <b>{lecturers.find((l) => l.id === student.proposedSupervisors[1])?.name}</b>
        </Alert>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">
              Pembimbing Utama <span className="text-red-600">*</span>
            </span>
            <select
              className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
              value={main}
              onChange={(e) => setMain(e.target.value)}
            >
              <option value="">Pilih dosen</option>
              {opt(co)}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">
              Co-Pembimbing <span className="text-red-600">*</span>
            </span>
            <select
              className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
              value={co}
              onChange={(e) => setCo(e.target.value)}
            >
              <option value="">Pilih dosen</option>
              {opt(main)}
            </select>
          </label>
        </div>

        {err && <Alert tone="danger">{err}</Alert>}

        <div className="flex justify-end">
          <Button
            variant="action"
            onClick={save}
            loading={saving}
            icon={<Save className="h-4 w-4" />}
          >
            Simpan Penetapan
          </Button>
        </div>
      </div>
    </Card>
  );
}