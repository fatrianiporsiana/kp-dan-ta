import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  EmptyState,
  LecturerList,
  LoadError,
  Page,
  PageHeader,
  PageLoader,
  fmtDate,
  useSnapshot,
} from './shared';
import { taStaffApi, type StudentTA, type Lecturer } from './api';
import { Calendar, Check, Clock, MapPin, Save } from 'lucide-react';

export default function ScheduleDefense() {
  const { data, loading, error, reload } = useSnapshot();

  if (loading) return <PageLoader />;
  if (error || !data)
    return (
      <Page>
        <LoadError message={error ?? 'Data kosong.'} onRetry={reload} />
      </Page>
    );

  const pending = data.students.filter(
    (s) => s.defenseStatus === 'APPROVED' && !s.schedule,
  );
  const scheduled = data.students.filter((s) => s.schedule);

  return (
    <Page>
      <PageHeader
        title="Plot Penguji & Jadwal Sidang"
        subtitle="Tetapkan dosen penguji dan jadwal sidang untuk mahasiswa yang dokumennya sudah diverifikasi."
      />

      <div className="space-y-5">
        <Card title="Menunggu Penjadwalan">
          {pending.length === 0 ? (
            <EmptyState title="Tidak ada mahasiswa menunggu jadwal">
              Semua mahasiswa yang lolos verifikasi sudah dijadwalkan.
            </EmptyState>
          ) : (
            <ul className="space-y-4">
              {pending.map((s) => (
                <ScheduleForm
                  key={s.nim}
                  student={s}
                  lecturers={data.lecturers}
                  onSaved={reload}
                />
              ))}
            </ul>
          )}
        </Card>

        {scheduled.length > 0 && (
          <Card title="Sidang Terjadwal">
            <ul className="space-y-4">
              {scheduled.map((s) => (
                <li key={s.nim} className="rounded-md border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {s.name} · <span className="text-slate-500 font-normal">{s.nim}</span>
                      </p>
                      <p className="text-sm text-slate-600 mt-0.5">{s.title}</p>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-md bg-slate-50 p-3">
                      <p className="text-xs text-slate-500 mb-1">Jadwal</p>
                      <p className="flex items-center gap-1.5 text-sm text-slate-900">
                        <Calendar className="h-3.5 w-3.5 text-orange-500" />
                        {fmtDate(s.schedule?.date)}
                      </p>
                      <p className="flex items-center gap-1.5 text-sm text-slate-900 mt-1">
                        <Clock className="h-3.5 w-3.5 text-orange-500" />
                        {s.schedule?.time} WIB
                      </p>
                      <p className="flex items-center gap-1.5 text-sm text-slate-900 mt-1">
                        <MapPin className="h-3.5 w-3.5 text-orange-500" />
                        {s.schedule?.room}
                      </p>
                    </div>
                    <div className="sm:col-span-2 rounded-md bg-slate-50 p-3">
                      <p className="text-xs text-slate-500 mb-2">Dosen Penguji</p>
                      <LecturerList lecturers={s.examiners ?? []} />
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

/* ═══════════ Form Penjadwalan ═══════════ */

function ScheduleForm({
  student,
  lecturers,
  onSaved,
}: {
  student: StudentTA;
  lecturers: Lecturer[];
  onSaved: () => void;
}) {
  const [examiners, setExaminers] = useState<string[]>(['', '']);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [room, setRoom] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const toggleExaminer = (id: string, slot: 0 | 1) => {
    setExaminers((prev) => {
      const next = [...prev];
      next[slot] = prev[slot] === id ? '' : id;
      return next;
    });
    setErr('');
  };

  const save = async () => {
    if (!examiners[0] || !examiners[1])
      return setErr('Pilih 2 dosen penguji.');
    if (examiners[0] === examiners[1])
      return setErr('Dosen penguji tidak boleh sama.');
    if (!date || !time || !room)
      return setErr('Lengkapi tanggal, waktu, dan ruangan.');

    setErr('');
    setSaving(true);
    try {
      await taStaffApi.scheduleDefense(student.nim, examiners, { date, time, room });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  // Kandidat penguji: bukan pembimbing utama/co
  const blocked = [student.mainSupervisor?.id, student.coSupervisor?.id].filter(Boolean);
  const candidates = lecturers.filter((l) => !blocked.includes(l.id));

  return (
    <li className="rounded-md border border-slate-200 p-4">
      <div className="mb-3">
        <p className="font-semibold text-slate-900">
          {student.name} · <span className="text-slate-500 font-normal">{student.nim}</span>
        </p>
        <p className="text-sm text-slate-600 mt-0.5">{student.title}</p>
        <p className="text-xs text-slate-500 mt-1">
          Pembimbing: {student.mainSupervisor?.name} & {student.coSupervisor?.name}
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">
            Dosen Penguji (2 orang) <span className="text-red-600">*</span>
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {[0, 1].map((slot) => (
              <div key={slot} className="space-y-1">
                {candidates.map((l) => {
                  const selected = examiners[slot] === l.id;
                  const usedInOther = examiners[slot === 0 ? 1 : 0] === l.id;
                  return (
                    <label
                      key={l.id}
                      className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition ${
                        selected
                          ? 'border-blue-700 bg-blue-50'
                          : usedInOther
                          ? 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed'
                          : 'border-slate-200 bg-white hover:border-blue-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`penguji-${student.nim}-${slot}`}
                        checked={selected}
                        disabled={usedInOther}
                        onChange={() => toggleExaminer(l.id, slot as 0 | 1)}
                        className="h-4 w-4 accent-blue-700"
                      />
                      <span className="flex-1 min-w-0">
                        <span className="block text-slate-900 truncate">{l.name}</span>
                        <span className="block text-xs text-slate-500">NIDN {l.nidn}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Penguji 1: {lecturers.find((l) => l.id === examiners[0])?.name ?? '—'} · Penguji 2:{' '}
            {lecturers.find((l) => l.id === examiners[1])?.name ?? '—'}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">
              Tanggal <span className="text-red-600">*</span>
            </span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">
              Waktu <span className="text-red-600">*</span>
            </span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">
              Ruangan <span className="text-red-600">*</span>
            </span>
            <input
              type="text"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="Ruang 3.1"
              className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>
        </div>

        {err && <Alert tone="danger">{err}</Alert>}

        <div className="flex justify-end">
          <Button variant="action" onClick={save} loading={saving} icon={<Save className="h-4 w-4" />}>
            Simpan Jadwal
          </Button>
        </div>
      </div>
    </li>
  );
}