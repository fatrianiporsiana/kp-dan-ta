import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Send } from 'lucide-react';
import {
  Alert,
  AttachmentFields,
  Button,
  Card,
  Field,
  JOURNAL_EXTRA_ATTACHMENTS,
  LoadError,
  Page,
  PageHeader,
  PageLoader,
  RejectionNote,
  defenseAttachments,
  inputCls,
  missingAttachments,
  scrollToFirstError,
  taPath,
  useDraft,
  useSnapshot,
} from './shared';
import { PORTAL_AKADEMIK_URL, taApi, type DefenseData, type Regular } from './api';

interface FormState {
  address: string;
  birthPlace: string;
  birthDate: string;
  phone: string;
  email: string;
  title: string;
  gpa: string;
  toefl: string;
}

const EMPTY: FormState = {
  address: '',
  birthPlace: '',
  birthDate: '',
  phone: '',
  email: '',
  title: '',
  gpa: '',
  toefl: '',
};

const DRAFT_KEY = 'ta:mahasiswa:defense-draft';

function validate(f: FormState): Record<string, string> {
  const e: Record<string, string> = {};
  if (f.address.trim().length < 10) e.address = 'Isi alamat lengkap.';
  if (!f.birthPlace.trim()) e.birthPlace = 'Isi tempat lahir.';
  if (!f.birthDate) e.birthDate = 'Pilih tanggal lahir.';
  if (!/^(\+62|62|0)8\d{7,12}$/.test(f.phone.replace(/[\s-]/g, '')))
    e.phone = 'Gunakan nomor HP Indonesia.';
  if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Email tidak valid.';
  if (f.title.trim().length < 10) e.title = 'Judul TA minimal 10 karakter.';
  const gpa = Number(f.gpa.replace(',', '.'));
  if (!f.gpa || Number.isNaN(gpa) || gpa < 0 || gpa > 4) e.gpa = 'IPK harus antara 0 dan 4.';
  if (!f.toefl || Number(f.toefl) < 450) e.toefl = 'Skor TOEFL minimal 450.';
  return e;
}

export default function Defense() {
  const { data, loading, error, reload } = useSnapshot();
  const [form, setForm, clearDraft] = useDraft<FormState>(DRAFT_KEY, EMPTY);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>();

  const existing = data?.defense;
  const rejected = existing?.status === 'REJECTED';
  const reg = data?.registration;
  const track = reg?.track ?? 'SKRIPSI';
  const regular: Regular = reg?.regular ?? 'A';

  useEffect(() => {
    if (rejected && existing) {
      setForm({
        address: existing.data.address,
        birthPlace: existing.data.birthPlace,
        birthDate: existing.data.birthDate,
        phone: existing.data.phone,
        email: existing.data.email,
        title: existing.data.title,
        gpa: existing.data.gpa,
        toefl: existing.data.toeflScore,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rejected]);

  const defs = useMemo(() => defenseAttachments(regular), [regular]);
  const isJurnal = track === 'JURNAL';

  if (loading) return <PageLoader />;
  if (error || !data)
    return (
      <Page>
        <LoadError message={error ?? 'Data kosong.'} onRetry={reload} />
      </Page>
    );

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: '' }));
  };

  if (existing && !rejected) {
    return (
      <Page>
        <PageHeader title="Pengajuan Sidang" />
        <Alert
          tone="info"
          title="Dokumen sidang sudah diajukan"
          action={
            <Link
              to={taPath('status-sidang')}
              className="rounded-md bg-blue-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-900"
            >
              Lihat status
            </Link>
          }
        >
          Pantau verifikasi dokumen, jadwal, dan dosen penguji di halaman status.
        </Alert>
      </Page>
    );
  }

  const submit = async () => {
    const e = validate(form);
    Object.assign(e, missingAttachments(defs, files));
    if (isJurnal) Object.assign(e, missingAttachments(JOURNAL_EXTRA_ATTACHMENTS, files));
    if (!agreed) e.agreed = 'Centang pernyataan sebelum mengirim.';
    setErrors(e);
    if (Object.values(e).some(Boolean)) return scrollToFirstError();

    setSubmitting(true);
    setSubmitError(undefined);
    try {
      const defenseData: DefenseData = {
        address: form.address.trim(),
        birthPlace: form.birthPlace.trim(),
        birthDate: form.birthDate,
        phone: form.phone.trim(),
        email: form.email.trim(),
        title: form.title.trim(),
        gpa: form.gpa.replace(',', '.'),
        toeflScore: form.toefl,
      };
      await taApi.submitDefense(defenseData, files as Record<string, File>);
      clearDraft();
      await reload();
    } catch {
      setSubmitError('Pengajuan gagal dikirim. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Page>
      <PageHeader
        title="Pengajuan Sidang Tugas Akhir"
        subtitle="Lengkapi data tambahan dan unggah seluruh lampiran wajib. Draf tersimpan otomatis."
      />

      <div className="space-y-5">
        <Alert
          tone="info"
          title="Reminder Portal Akademik"
          action={
            <a
              href={PORTAL_AKADEMIK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md bg-orange-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-600"
            >
              Buka Portal
            </a>
          }
        >
          Pastikan tidak ada tanggungan administrasi di Portal Akademik sebelum sidang.
        </Alert>

        {rejected && <RejectionNote note={existing?.staffNote} title="Dokumen sidang ditolak" />}

        <Card title="Section A — Data Tambahan">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Alamat lengkap" required error={errors.address} className="md:col-span-2">
              <textarea rows={2} className={inputCls} value={form.address} onChange={(e) => set('address', e.target.value)} />
            </Field>
            <Field label="Tempat lahir" required error={errors.birthPlace}>
              <input className={inputCls} value={form.birthPlace} onChange={(e) => set('birthPlace', e.target.value)} />
            </Field>
            <Field label="Tanggal lahir" required error={errors.birthDate}>
              <input
                type="date"
                className={inputCls}
                value={form.birthDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => set('birthDate', e.target.value)}
              />
            </Field>
            <Field label="No. telepon / HP" required error={errors.phone}>
              <input type="tel" className={inputCls} value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </Field>
            <Field label="Email" required error={errors.email}>
              <input type="email" className={inputCls} value={form.email} onChange={(e) => set('email', e.target.value)} />
            </Field>
            <Field label="Judul TA" required error={errors.title} className="md:col-span-2">
              <textarea rows={2} className={inputCls} value={form.title} onChange={(e) => set('title', e.target.value)} />
            </Field>
            <Field label="IPK terakhir" required error={errors.gpa}>
              <input inputMode="decimal" className={inputCls} value={form.gpa} onChange={(e) => set('gpa', e.target.value)} />
            </Field>
            <Field label="Skor TOEFL (min. 450)" required error={errors.toefl}>
              <input
                inputMode="numeric"
                className={inputCls}
                value={form.toefl}
                onChange={(e) => set('toefl', e.target.value.replace(/\D/g, ''))}
              />
            </Field>
          </div>
        </Card>

        <Card title="Section B — Lampiran Wajib">
          <AttachmentFields
            defs={defs}
            files={files}
            errors={errors}
            onChange={(k, f) => {
              setFiles((p) => ({ ...p, [k]: f }));
              setErrors((p) => ({ ...p, [k]: '' }));
            }}
          />
        </Card>

        {isJurnal && (
          <Card title="Section C — Lampiran Tambahan (Jalur Jurnal)">
            <AttachmentFields
              defs={JOURNAL_EXTRA_ATTACHMENTS}
              files={files}
              errors={errors}
              onChange={(k, f) => {
                setFiles((p) => ({ ...p, [k]: f }));
                setErrors((p) => ({ ...p, [k]: '' }));
              }}
              startAt={1}
            />
          </Card>
        )}

        <div data-error={errors.agreed ? 'true' : undefined}>
          <label className="flex items-start gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => {
                setAgreed(e.target.checked);
                setErrors((p) => ({ ...p, agreed: '' }));
              }}
              className="mt-0.5 h-4 w-4 accent-orange-500"
            />
            Saya menyatakan seluruh data dan berkas yang diunggah adalah benar.
          </label>
          {errors.agreed && (
            <p role="alert" className="mt-1 text-xs text-red-600">
              {errors.agreed}
            </p>
          )}
        </div>

        {submitError && <Alert tone="danger">{submitError}</Alert>}

        <div className="flex justify-end">
          <Button loading={submitting} onClick={submit} icon={<Send className="h-4 w-4" aria-hidden />}>
            Kirim Pengajuan Sidang
          </Button>
        </div>
      </div>
    </Page>
  );
}