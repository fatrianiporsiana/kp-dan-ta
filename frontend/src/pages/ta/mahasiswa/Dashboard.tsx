import { Link } from 'react-router-dom';
import { ArrowRight, Megaphone } from 'lucide-react';
import {
  Alert,
  Card,
  LoadError,
  Page,
  PageHeader,
  PageLoader,
  Stepper,
  SupervisorList,
  TA_STAGES,
  computeStage,
  fmtDate,
  taPath,
  useSnapshot,
} from './shared';
import type { Snapshot } from './api';

/** Langkah berikutnya yang paling relevan untuk mahasiswa. */
function nextAction(s: Snapshot): { text: string; to: string; cta: string } | null {
  const reg = s.registration;
  if (!reg) return { text: 'Anda belum mendaftar Tugas Akhir.', to: 'pendaftaran', cta: 'Daftar TA' };
  if (!reg.templateFile)
    return { text: 'Unduh template bimbingan lalu unggah kembali.', to: 'pendaftaran', cta: 'Lanjutkan pendaftaran' };
  if (reg.status === 'REJECTED')
    return { text: 'Pendaftaran Anda ditolak. Perbaiki lalu kirim ulang.', to: 'pendaftaran', cta: 'Perbaiki pendaftaran' };
  if (reg.status === 'PENDING')
    return { text: 'Pendaftaran Anda sedang diverifikasi Staff.', to: 'status-pendaftaran', cta: 'Lihat status' };
  if (!s.defense)
    return { text: 'Siap sidang? Ajukan dokumen sidang Anda.', to: 'pengajuan-sidang', cta: 'Ajukan sidang' };
  if (s.defense.status === 'REJECTED')
    return { text: 'Dokumen sidang ditolak. Unggah ulang berkas yang diminta.', to: 'pengajuan-sidang', cta: 'Perbaiki dokumen' };
  if (s.revision.notes.length > 0 && !s.revision.file)
    return { text: 'Ada catatan revisi dari dosen. Unggah naskah revisi.', to: 'revisi', cta: 'Buka revisi' };
  if (s.revision.file && !s.completion.stage2)
    return { text: 'Lanjutkan ke penyelesaian TA.', to: 'penyelesaian', cta: 'Buka penyelesaian' };
  return null;
}

export default function Dashboard() {
  const { data, loading, error, reload } = useSnapshot();

  if (loading) return <PageLoader />;
  if (error || !data)
    return (
      <Page>
        <LoadError message={error ?? 'Data kosong.'} onRetry={reload} />
      </Page>
    );

  const stage = computeStage(data);
  const reg = data.registration;
  const action = nextAction(data);
  const finished = stage >= TA_STAGES.length;

  return (
    <Page>
      <PageHeader title="Dashboard Tugas Akhir" subtitle="Pantau tahapan TA Anda dari pendaftaran sampai penyelesaian." />

      <div className="space-y-5">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xl font-semibold text-slate-900">Halo, {data.profile.name}!</p>
              <p className="text-sm text-slate-600">NPM {data.profile.npm}</p>
            </div>
            {reg && (
              <p className="rounded-md bg-blue-50 px-3 py-1.5 text-sm text-blue-900">
                {reg.track === 'SKRIPSI' ? 'Skripsi' : 'Jurnal'} · Reg {reg.regular}
              </p>
            )}
          </div>
          {reg && (
            <p className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-700">
              <span className="text-slate-500">Judul TA: </span>
              {reg.title}
            </p>
          )}
        </Card>

        {finished ? (
          <Alert tone="success" title="TA selesai">
            Anda dinyatakan bebas tanggungan TA. Nilai akhir akan diproses oleh dosen.
          </Alert>
        ) : (
          action && (
            <Alert
              tone="info"
              title="Langkah berikutnya"
              action={
                <Link
                  to={taPath(action.to)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-orange-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
                >
                  {action.cta} <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              }
            >
              {action.text}
            </Alert>
          )
        )}

        <Card title="Progres Tugas Akhir">
          <Stepper steps={TA_STAGES} current={stage} />
        </Card>

        <div className="grid gap-5 md:grid-cols-2">
          <Card title="Dosen Pembimbing">
            <SupervisorList main={reg?.mainSupervisor} co={reg?.coSupervisor} />
          </Card>

          <Card title="Pengumuman Prodi">
            {data.announcements.length === 0 ? (
              <p className="text-sm text-slate-600">Belum ada pengumuman.</p>
            ) : (
              <ul className="space-y-4">
                {data.announcements.map((a) => (
                  <li key={a.id} className="flex gap-3">
                    <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" aria-hidden />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{a.title}</p>
                      <p className="text-sm text-slate-600">{a.body}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{fmtDate(a.at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </Page>
  );
}