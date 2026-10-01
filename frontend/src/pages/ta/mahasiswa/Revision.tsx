import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Send } from 'lucide-react';
import {
  Alert,
  Button,
  Card,
  EmptyState,
  FileUpload,
  LoadError,
  Page,
  PageHeader,
  PageLoader,
  fmtDate,
  taPath,
  useSnapshot,
} from './shared';
import { taApi } from './api';

const linkBtn =
  'inline-flex items-center rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300';

/** TA-M-07 — Revisi Pasca Sidang */
export default function Revision() {
  const { data, loading, error, reload } = useSnapshot();
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>();

  if (loading) return <PageLoader />;
  if (error || !data)
    return (
      <Page>
        <LoadError message={error ?? 'Data kosong.'} onRetry={reload} />
      </Page>
    );

  const { revision, defense } = data;
  const noNotes = revision.notes.length === 0;

  // Belum sidang → tidak boleh akses revisi
  if (!defense) {
    return (
      <Page>
        <PageHeader title="Revisi Pasca Sidang" />
        <EmptyState
          title="Belum ada sidang"
          action={
            <Link to={taPath('pengajuan-sidang')} className={linkBtn}>
              Ajukan Sidang
            </Link>
          }
        >
          Revisi muncul setelah Anda menyelesaikan sidang.
        </EmptyState>
      </Page>
    );
  }

  const submit = async () => {
    if (!file) {
      setErrors({ file: 'Unggah naskah revisi terlebih dahulu.' });
      return;
    }
    setSubmitting(true);
    setSubmitError(undefined);
    try {
      await taApi.submitRevision(file);
      setFile(null);
      await reload();
    } catch {
      setSubmitError('Gagal mengirim naskah revisi. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Page>
      <PageHeader
        title="Revisi Pasca Sidang"
        subtitle="Perbaiki naskah berdasarkan catatan dosen pembimbing dan penguji, lalu unggah naskah final."
      />

      <div className="space-y-5">
        <Card title="Catatan Revisi">
          {noNotes ? (
            <p className="text-sm text-slate-600">Belum ada catatan revisi dari dosen.</p>
          ) : (
            <ul className="space-y-4">
              {revision.notes.map((n) => (
                <li key={n.id} className="rounded-md border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{n.author}</p>
                      <p className="text-xs text-slate-500">
                        {n.from === 'PENGUJI' ? 'Dosen Penguji' : 'Dosen Pembimbing'} · {fmtDate(n.at)}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">{n.text}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {!noNotes && (
          <Card
            title="Unggah Naskah Revisi"
            aside={
              revision.file ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200">
                  Sudah diunggah
                </span>
              ) : undefined
            }
          >
            <div className="space-y-5">
              {revision.file ? (
                <Alert tone="success" title="Naskah revisi sudah diunggah">
                  Dikirim {fmtDate(revision.submittedAt)}. Anda dapat mengganti dengan versi terbaru jika perlu.
                </Alert>
              ) : (
                <Alert tone="warning">
                  Unggah naskah revisi final (PDF) untuk menyelesaikan tahap ini.
                </Alert>
              )}

              <FileUpload
                label={revision.file ? 'Ganti naskah revisi' : 'Naskah revisi final'}
                accept="pdf"
                maxMB={10}
                value={file}
                onChange={(f) => {
                  setFile(f);
                  setErrors({});
                }}
                error={errors.file}
                required={!revision.file}
              />

              {submitError && <Alert tone="danger">{submitError}</Alert>}

              <div className="flex justify-end">
                <Button
                  loading={submitting}
                  onClick={submit}
                  disabled={!file}
                  icon={<Send className="h-4 w-4" aria-hidden />}
                >
                  {revision.file ? 'Ganti Naskah Revisi' : 'Kirim Naskah Revisi'}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {revision.file && (
          <Alert
            tone="success"
            title="Lanjut ke Penyelesaian TA"
            action={
              <Link to={taPath('penyelesaian')} className={linkBtn}>
                Buka Penyelesaian
              </Link>
            }
          >
            Setelah revisi diunggah, lanjutkan ke tahap penyelesaian untuk mengunggah berkas final.
          </Alert>
        )}
      </div>
    </Page>
  );
}