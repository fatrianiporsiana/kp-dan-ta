import {
  Card,
  EmptyState,
  LoadError,
  Page,
  PageHeader,
  PageLoader,
  StageBadge,
  fmtDate,
  useSnapshot,
} from './shared';
import { Calendar, Clock, MapPin, UserRound } from 'lucide-react';

export default function Advisees() {
  const { data, loading, error, reload } = useSnapshot();

  if (loading) return <PageLoader />;
  if (error || !data)
    return (
      <Page>
        <LoadError message={error ?? 'Data kosong.'} onRetry={reload} />
      </Page>
    );

  const { advisees, dosen } = data;

  if (!dosen.isPembimbing) {
    return (
      <Page>
        <PageHeader title="Mahasiswa Bimbingan" />
        <EmptyState title="Anda bukan Dosen Pembimbing">
          Halaman ini hanya untuk dosen yang terdaftar sebagai pembimbing TA.
        </EmptyState>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        title="Mahasiswa Bimbingan"
        subtitle="Daftar mahasiswa yang Anda bimbing beserta status tahapan Tugas Akhir."
      />

      <div className="space-y-5">
        {advisees.length === 0 ? (
          <EmptyState title="Belum ada mahasiswa bimbingan">
            Mahasiswa akan muncul di sini setelah ditetapkan oleh Staff.
          </EmptyState>
        ) : (
          advisees.map((a) => (
            <Card
              key={a.nim}
              title={`${a.name} · ${a.nim}`}
              aside={<StageBadge stage={a.stage} />}
            >
              <div className="space-y-4">
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-slate-500">Jalur</p>
                    <p className="font-medium text-slate-900">
                      {a.track === 'SKRIPSI' ? 'Skripsi' : 'Jurnal'} · Reg {a.regular}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Kontak</p>
                    <p className="font-medium text-slate-900">{a.phone || a.email}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-slate-500">Judul TA</p>
                    <p className="font-medium text-slate-900">{a.title}</p>
                  </div>
                </div>

                {a.schedule && (
                  <div className="border-t border-slate-100 pt-4">
                    <h4 className="mb-2 text-sm font-semibold text-slate-800">Jadwal Sidang</h4>
                    <div className="rounded-md bg-slate-50 p-3">
                      <p className="flex items-center gap-2 text-sm text-slate-800">
                        <Calendar className="h-3.5 w-3.5 text-orange-500" />
                        {fmtDate(a.schedule.date)}
                      </p>
                      <p className="flex items-center gap-2 text-sm text-slate-800 mt-1">
                        <Clock className="h-3.5 w-3.5 text-orange-500" />
                        {a.schedule.time} WIB
                      </p>
                      <p className="flex items-center gap-2 text-sm text-slate-800 mt-1">
                        <MapPin className="h-3.5 w-3.5 text-orange-500" />
                        {a.schedule.room}
                      </p>
                    </div>
                  </div>
                )}

                {a.examiners && a.examiners.length > 0 && (
                  <div className="border-t border-slate-100 pt-4">
                    <h4 className="mb-2 text-sm font-semibold text-slate-800">
                      Dosen Penguji
                    </h4>
                    <ul className="space-y-2">
                      {a.examiners.map((ex, i) => (
                        <li key={ex.id} className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-50 text-orange-700 text-xs font-semibold">
                            {i + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-900">{ex.name}</p>
                            <p className="text-xs text-slate-500">NIDN {ex.nidn}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="border-t border-slate-100 pt-4">
                  <div className="flex items-start gap-2 rounded-md bg-blue-50 p-3 text-xs text-blue-900">
                    <UserRound className="h-4 w-4 shrink-0 mt-0.5" />
                    <p>
                      Bimbingan, ACC draf sidang, dan penilaian dilakukan secara offline
                      (tatap muka / tanda tangan). Halaman ini hanya untuk memantau status.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </Page>
  );
}