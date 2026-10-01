import { useState } from 'react';
import { Send } from 'lucide-react';
import {
  Alert,
  Button,
  Card,
  Field,
  FileUpload,
  LABELS,
  LoadError,
  Page,
  PageHeader,
  PageLoader,
  RejectionNote,
  StatusBadge,
  fmtDate,
  inputCls,
  scrollToFirstError,
  useSnapshot,
} from './shared';
import { taApi } from './api';

const MONTHS = [1, 2, 3, 4, 5, 6];

export default function Extension() {
  const { data, loading, error, reload } = useSnapshot();
  const [reason, setReason] = useState('');
  const [months, setMonths] = useState('');
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

  const latest = data.extensions[0];
  const hasPending = latest?.status === 'PENDING';

  const submit = async () => {
    const e: Record<string, string> = {};
    if (reason.trim().length < 20) e.reason = 'Jelaskan alasan perpanjangan (min. 20 karakter).';
    if (!months) e.months = 'Pilih durasi perpanjangan.';
    if (!file) e.file = 'Unggah scan kartu bimbingan.';
    setErrors(e);
    if (Object.values(e).some(Boolean)) return scrollToFirstError();

    setSubmitting(true);
    setSubmitError(undefined);
    try {
      await taApi.submitExtension({ reason: reason.trim(), months: Number(months) }, file!);
      setReason('');
      setMonths('');
      setFile(null);
      await reload();
    } catch {
      setSubmitError('Gagal mengirim pengajuan. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Page>
      <PageHeader
        title="Perpanjangan Tugas Akhir"
        subtitle="Ajukan perpanjangan masa TA jika melebihi batas waktu. Lampirkan kartu bimbingan yang sudah disetujui dosen."
      />

      <div className="space-y-5">
        {hasPending && (
          <Alert tone="info" title="Pengajuan sedang diproses">
            Pengajuan terakhir Anda (dikirim {fmtDate(latest.submittedAt)}) masih menunggu verifikasi Staff.
          </Alert>
        )}

        <Card title="Formulir Perpanjangan">
          <div className="space-y-5">
            <Field label="Alasan perpanjangan" required error={errors.reason}>
              <textarea
                rows={4}
                className={inputCls}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setErrors((p) => ({ ...p, reason: '' }));
                }}
                placeholder="Contoh: Data penelitian belum lengkap karena kendala akses lapangan."
              />
            </Field>

            <Field label="Durasi perpanjangan (bulan)" required error={errors.months}>
              <select
                className={inputCls}
                value={months}
                onChange={(e) => {
                  setMonths(e.target.value);
                  setErrors((p) => ({ ...p, months: '' }));
                }}
              >
                <option value="">Pilih durasi</option>
                {MONTHS.map((m) => (
                  <option key={m} value={m}>
                    {m} bulan
                  </option>
                ))}
              </select>
            </Field>

            <FileUpload
              label="Scan kartu bimbingan (sudah disetujui dosen pembimbing)"
              accept="pdf-img"
              maxMB={2}
              value={file}
              onChange={(f) => {
                setFile(f);
                setErrors((p) => ({ ...p, file: '' }));
              }}
              error={errors.file}
              required
            />

            {submitError && <Alert tone="danger">{submitError}</Alert>}

            <div className="flex justify-end">
              <Button loading={submitting} onClick={submit} icon={<Send className="h-4 w-4" aria-hidden />}>
                Kirim Pengajuan
              </Button>
            </div>
          </div>
        </Card>

        {data.extensions.length > 0 && (
          <Card title="Riwayat Pengajuan">
            <ul className="space-y-4">
              {data.extensions.map((ext) => (
                <li key={ext.id} className="rounded-md border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-slate-500">Dikirim {fmtDate(ext.submittedAt)}</p>
                    <StatusBadge status={ext.status} labels={LABELS.extension} />
                  </div>
                  <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-slate-500">Durasi</dt>
                      <dd className="font-medium text-slate-900">{ext.months} bulan</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Lampiran</dt>
                      <dd className="font-medium text-slate-900">{ext.file.name}</dd>
                    </div>
                  </dl>
                  <p className="mt-3 text-sm text-slate-700">
                    <span className="text-slate-500">Alasan: </span>
                    {ext.reason}
                  </p>
                  {ext.status === 'REJECTED' && (
                    <div className="mt-3">
                      <RejectionNote note={ext.note} title="Pengajuan ditolak" />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </Page>
  );
}