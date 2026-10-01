import { Link } from 'react-router-dom';
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
  SupervisorList,
  fmtDate,
  taPath,
  useSnapshot,
} from './shared';

const linkBtn =
  'inline-flex items-center rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300';

/** TA-M-02 — Status Pendaftaran */
export default function Status() {
  const { data, loading, error, reload } = useSnapshot();

  if (loading) return <PageLoader />;
  if (error || !data)
    return (
      <Page>
        <LoadError message={error ?? 'Data kosong.'} onRetry={reload} />
      </Page>
    );

  const reg = data.registration;

  if (!reg) {
    return (
      <Page>
        <PageHeader title="Status Pendaftaran" />
        <EmptyState
          title="Belum ada pendaftaran"
          action={
            <Link to={taPath('pendaftaran')} className={linkBtn}>
              Daftar TA
            </Link>
          }
        >
          Anda belum mengirim pendaftaran Tugas Akhir.
        </EmptyState>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader title="Status Pendaftaran" subtitle={`Dikirim pada ${fmtDate(reg.submittedAt)}`} />

      <div className="space-y-5">
        <Card
          title="Status verifikasi"
          aside={<StatusBadge status={reg.status} labels={LABELS.registration} />}
        >
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Jalur</dt>
              <dd className="font-medium text-slate-900">
                {reg.track === 'SKRIPSI' ? 'Skripsi' : 'Jurnal'} · Reg {reg.regular}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Judul TA</dt>
              <dd className="font-medium text-slate-900">{reg.title}</dd>
            </div>
          </dl>

          <div className="mt-4 space-y-3">
            {!reg.templateFile && reg.status !== 'REJECTED' && (
              <Alert
                tone="warning"
                title="Template bimbingan belum diunggah"
                action={
                  <Link to={taPath('pendaftaran')} className={linkBtn}>
                    Unggah template
                  </Link>
                }
              >
                Staff baru dapat memverifikasi setelah template diunggah.
              </Alert>
            )}
            {reg.status === 'PENDING' && reg.templateFile && (
              <Alert tone="info">
                Pendaftaran sedang diverifikasi Staff. Anda akan menerima notifikasi saat ada hasilnya.
              </Alert>
            )}
            {reg.status === 'APPROVED' && (
              <Alert tone="success" title="Pendaftaran diverifikasi">
                Anda dapat mulai bimbingan dengan dosen pembimbing di bawah.
              </Alert>
            )}
            {reg.status === 'REJECTED' && (
              <>
                <RejectionNote note={reg.staffNote} title="Pendaftaran ditolak" />
                <Link to={taPath('pendaftaran')} className={linkBtn}>
                  Perbaiki & kirim ulang
                </Link>
              </>
            )}
          </div>
        </Card>

        <Card title="Dosen Pembimbing">
          <SupervisorList main={reg.mainSupervisor} co={reg.coSupervisor} />
        </Card>

        <Card title="Catatan Staff">
          {reg.staffNote ? (
            <p className="text-sm text-slate-800">{reg.staffNote}</p>
          ) : (
            <p className="text-sm text-slate-600">Belum ada catatan.</p>
          )}
        </Card>
      </div>
    </Page>
  );
}