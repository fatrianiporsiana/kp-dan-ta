import { Link } from 'react-router-dom';
import { Calendar, Clock, MapPin, UserRound } from 'lucide-react';
import {
  Alert,
  Card,
  EmptyState,
  LABELS,
  LoadError,
  Page,
  PageHeader,
  PageLoader,
  RejectionNote,
  StatusBadge,
  fmtDate,
  taPath,
  useSnapshot,
} from './shared';

const linkBtn =
  'inline-flex items-center rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300';

export default function DefenseStatus() {
  const { data, loading, error, reload } = useSnapshot();

  if (loading) return <PageLoader />;
  if (error || !data)
    return (
      <Page>
        <LoadError message={error ?? 'Data kosong.'} onRetry={reload} />
      </Page>
    );

  const defense = data.defense;

  if (!defense) {
    return (
      <Page>
        <PageHeader title="Status Pengajuan Sidang" />
        <EmptyState
          title="Belum ada pengajuan sidang"
          action={
            <Link to={taPath('pengajuan-sidang')} className={linkBtn}>
              Ajukan Sidang
            </Link>
          }
        >
          Anda belum mengirim dokumen pengajuan sidang.
        </EmptyState>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader title="Status Pengajuan Sidang" subtitle={`Dikirim pada ${fmtDate(defense.submittedAt)}`} />

      <div className="space-y-5">
        <Card
          title="Status verifikasi dokumen"
          aside={<StatusBadge status={defense.status} labels={LABELS.documents} />}
        >
          {defense.status === 'PENDING' && (
            <Alert tone="info">
              Dokumen Anda sedang diverifikasi Staff. Anda akan menerima notifikasi saat ada hasilnya.
            </Alert>
          )}
          {defense.status === 'APPROVED' && (
            <Alert tone="success" title="Dokumen diverifikasi">
              Berikut jadwal sidang dan dosen penguji Anda.
            </Alert>
          )}
          {defense.status === 'REJECTED' && (
            <>
              <RejectionNote note={defense.staffNote} title="Dokumen ditolak" />
              <Link to={taPath('pengajuan-sidang')} className={`${linkBtn} mt-3`}>
                Perbaiki & kirim ulang
              </Link>
            </>
          )}
        </Card>

        <Card title="Dosen Penguji">
          {defense.examiners.length === 0 ? (
            <p className="text-sm text-slate-600">Dosen penguji akan ditetapkan setelah dokumen diverifikasi.</p>
          ) : (
            <ul className="space-y-3">
              {defense.examiners.map((l) => (
                <li key={l.id} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-900">
                    <UserRound className="h-4 w-4" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{l.name}</p>
                    <p className="text-xs text-slate-500">NIDN {l.nidn}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Jadwal Sidang">
          {!defense.schedule ? (
            <p className="text-sm text-slate-600">Jadwal sidang belum ditetapkan.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-orange-500" aria-hidden />
                <span className="text-slate-700">{fmtDate(defense.schedule.date)}</span>
              </li>
              <li className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-orange-500" aria-hidden />
                <span className="text-slate-700">{defense.schedule.time} WIB</span>
              </li>
              <li className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-orange-500" aria-hidden />
                <span className="text-slate-700">{defense.schedule.room}</span>
              </li>
            </ul>
          )}
        </Card>
      </div>
    </Page>
  );
}