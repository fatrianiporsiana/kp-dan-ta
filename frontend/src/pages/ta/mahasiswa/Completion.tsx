import { useState } from 'react';
import { Lock, Send } from 'lucide-react';
import {
  Alert,
  AttachmentFields,
  Button,
  Card,
  COMPLETION_STAGE1,
  COMPLETION_STAGE2,
  LABELS,
  LoadError,
  Page,
  PageHeader,
  PageLoader,
  RejectionNote,
  StatusBadge,
  fmtDate,
  missingAttachments,
  scrollToFirstError,
  useSnapshot,
} from './shared';
import { taApi } from './api';

export default function Completion() {
  const { data, loading, error, reload } = useSnapshot();
  const [f1, setF1] = useState<Record<string, File | null>>({});
  const [f2, setF2] = useState<Record<string, File | null>>({});
  const [e1, setE1] = useState<Record<string, string>>({});
  const [e2, setE2] = useState<Record<string, string>>({});
  const [s1Loading, setS1Loading] = useState(false);
  const [s2Loading, setS2Loading] = useState(false);
  const [submitError, setSubmitError] = useState<string>();

  if (loading) return <PageLoader />;
  if (error || !data)
    return (
      <Page>
        <LoadError message={error ?? 'Data kosong.'} onRetry={reload} />
      </Page>
    );

  const { completion } = data;
  const stage1 = completion.stage1;
  const stage2 = completion.stage2;
  const stage1Approved = stage1?.status === 'APPROVED';
  const stage1Rejected = stage1?.status === 'REJECTED';
  const isCompleted = !!stage2;

  const submit1 = async () => {
    const e = missingAttachments(COMPLETION_STAGE1, f1);
    setE1(e);
    if (Object.values(e).some(Boolean)) return scrollToFirstError();
    setS1Loading(true);
    setSubmitError(undefined);
    try {
      await taApi.submitCompletionStage1(f1 as Record<string, File>);
      setF1({});
      await reload();
    } catch {
      setSubmitError('Gagal mengirim berkas Tahap 1.');
    } finally {
      setS1Loading(false);
    }
  };

  const submit2 = async () => {
    const e = missingAttachments(COMPLETION_STAGE2, f2);
    setE2(e);
    if (Object.values(e).some(Boolean)) return scrollToFirstError();
    setS2Loading(true);
    setSubmitError(undefined);
    try {
      await taApi.submitCompletionStage2(f2 as Record<string, File>);
      setF2({});
      await reload();
    } catch {
      setSubmitError('Gagal mengirim berkas Tahap 2.');
    } finally {
      setS2Loading(false);
    }
  };

  return (
    <Page>
      <PageHeader
        title="Penyelesaian Tugas Akhir"
        subtitle="Unggah berkas final dalam dua tahap. Tahap 2 terbuka setelah Tahap 1 disetujui Staff."
      />

      <div className="space-y-5">
        {isCompleted && (
          <Alert tone="success" title="TA selesai">
            Selamat! Anda dinyatakan bebas tanggungan TA. Nilai akhir akan diproses oleh dosen.
          </Alert>
        )}

        {/* Tahap 1 */}
        <Card
          title="Tahap 1 — Upload Berkas (Prasyarat Cetak)"
          aside={stage1 && <StatusBadge status={stage1.status} labels={LABELS.documents} />}
        >
          <div className="space-y-5">
            {stage1Rejected && <RejectionNote note={stage1?.note} title="Berkas Tahap 1 ditolak" />}
            {stage1Approved && <Alert tone="success">Tahap 1 disetujui. Silakan lanjut ke Tahap 2.</Alert>}
            {stage1?.status === 'PENDING' && (
              <Alert tone="info">Berkas Tahap 1 sedang diverifikasi Staff.</Alert>
            )}

            {(!stage1 || stage1Rejected) && (
              <>
                <AttachmentFields
                  defs={COMPLETION_STAGE1}
                  files={f1}
                  errors={e1}
                  onChange={(k, f) => {
                    setF1((p) => ({ ...p, [k]: f }));
                    setE1((p) => ({ ...p, [k]: '' }));
                  }}
                />
                {submitError && <Alert tone="danger">{submitError}</Alert>}
                <div className="flex justify-end">
                  <Button
                    loading={s1Loading}
                    onClick={submit1}
                    icon={<Send className="h-4 w-4" aria-hidden />}
                  >
                    {stage1Rejected ? 'Kirim Ulang Berkas' : 'Kirim Berkas Tahap 1'}
                  </Button>
                </div>
              </>
            )}

            {stage1 && !stage1Rejected && (
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">Dikirim</dt>
                  <dd className="font-medium text-slate-900">{fmtDate(stage1.submittedAt)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Jumlah berkas</dt>
                  <dd className="font-medium text-slate-900">{Object.keys(stage1.files).length}</dd>
                </div>
              </dl>
            )}
          </div>
        </Card>

        {/* Tahap 2 */}
        <Card
          title="Tahap 2 — Upload Bukti Penyerahan Perpustakaan (Final)"
          aside={
            !stage1Approved ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <Lock className="h-3.5 w-3.5" aria-hidden /> Terkunci
              </span>
            ) : stage2 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200">
                Selesai
              </span>
            ) : undefined
          }
        >
          {!stage1Approved ? (
            <Alert tone="locked" title="Tahap 2 terkunci">
              Tahap ini terbuka setelah Tahap 1 disetujui Staff.
            </Alert>
          ) : stage2 ? (
            <div className="space-y-4">
              <Alert tone="success" title="TA Selesai">
                Anda dinyatakan bebas tanggungan TA. Nilai akhir akan diproses oleh dosen.
              </Alert>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">Dikirim</dt>
                  <dd className="font-medium text-slate-900">{fmtDate(stage2.submittedAt)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Jumlah berkas</dt>
                  <dd className="font-medium text-slate-900">{Object.keys(stage2.files).length}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <div className="space-y-5">
              <AttachmentFields
                defs={COMPLETION_STAGE2}
                files={f2}
                errors={e2}
                onChange={(k, f) => {
                  setF2((p) => ({ ...p, [k]: f }));
                  setE2((p) => ({ ...p, [k]: '' }));
                }}
              />
              {submitError && <Alert tone="danger">{submitError}</Alert>}
              <div className="flex justify-end">
                <Button
                  loading={s2Loading}
                  onClick={submit2}
                  icon={<Send className="h-4 w-4" aria-hidden />}
                >
                  Selesaikan TA
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </Page>
  );
}