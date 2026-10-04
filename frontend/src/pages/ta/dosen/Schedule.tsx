import {
  Card,
  EmptyState,
  LecturerInfo,
  LoadError,
  Page,
  PageHeader,
  PageLoader,
  fmtDate,
  useSnapshot,
} from './shared';
import { Calendar, Clock, MapPin } from 'lucide-react';

export default function Schedule() {
  const { data, loading, error, reload } = useSnapshot();

  if (loading) return <PageLoader />;
  if (error || !data)
    return (
      <Page>
        <LoadError message={error ?? 'Data kosong.'} onRetry={reload} />
      </Page>
    );

  const { examinees, dosen } = data;

  if (!dosen.isPenguji) {
    return (
      <Page>
        <PageHeader title="Jadwal Menguji" />
        <EmptyState title="Anda bukan Dosen Penguji">
          Halaman ini hanya untuk dosen yang terdaftar sebagai penguji TA.
        </EmptyState>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        title="Jadwal Menguji"
        subtitle="Daftar sidang TA yang harus Anda hadiri sebagai dosen penguji."
      />

      <div className="space-y-5">
        {examinees.length === 0 ? (
          <EmptyState title="Belum ada jadwal menguji">
            Jadwal sidang akan muncul di sini setelah ditetapkan oleh Staff.
          </EmptyState>
        ) : (
          examinees.map((e) => (
            <Card
              key={e.nim}
              title={`${e.name} · ${e.nim}`}
              aside={
                e.bapStatus === 'FILLED' ? (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200">
                    BAP terisi
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200">
                    BAP belum diisi
                  </span>
                )
              }
            >
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-500">Judul</p>
                  <p className="font-medium text-slate-900">{e.title}</p>
                </div>

                {/* ─── Jadwal ─── */}
                <div className="rounded-md bg-slate-50 p-3">
                  <p className="flex items-center gap-2 text-sm text-slate-800">
                    <Calendar className="h-3.5 w-3.5 text-orange-500" />
                    {fmtDate(e.schedule.date)}
                  </p>
                  <p className="flex items-center gap-2 text-sm text-slate-800 mt-1">
                    <Clock className="h-3.5 w-3.5 text-orange-500" />
                    {e.schedule.time} WIB
                  </p>
                  <p className="flex items-center gap-2 text-sm text-slate-800 mt-1">
                    <MapPin className="h-3.5 w-3.5 text-orange-500" />
                    {e.schedule.room}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs font-semibold text-slate-700 uppercase">
                      Pembimbing
                    </p>
                    <LecturerInfo lecturer={e.supervisor} />
                    {e.coSupervisor && <div className="mt-2"><LecturerInfo lecturer={e.coSupervisor} /></div>}
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold text-slate-700 uppercase">
                      Dosen Penguji
                    </p>
                    <ul className="space-y-2">
                      {e.examiners.map((ex, i) => (
                        <li key={ex.id} className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-blue-800 text-xs font-semibold">
                            {i + 1}
                          </span>
                          <span className="text-sm text-slate-900 truncate">
                            {ex.name}
                            {ex.id === dosen.nidn && ' (Anda)'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4 text-xs text-slate-500">
                  Posisi Anda: <b className="text-slate-700">{e.myRole.replace('_', ' ')}</b>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </Page>
  );
}