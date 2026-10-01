import { useEffect, useMemo, useState } from 'react';
import { Check, ArrowLeft, ArrowRight, Download, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Alert,
  AttachmentFields,
  Button,
  Card,
  DownloadLink,
  Field,
  FileUpload,
  LoadError,
  OptionGroup,
  Page,
  PageHeader,
  PageLoader,
  RejectionNote,
  inputCls,
  missingAttachments,
  registrationAttachments,
  scrollToFirstError,
  taPath,
  useDraft,
  useLecturers,
  useSnapshot,
} from './shared';
import { TA_TEMPLATES, taApi, type Regular, type Registration, type Track } from './api';

interface FormState {
  track: Track | '';
  regular: Regular | '';
  address: string;
  birthPlace: string;
  birthDate: string;
  phone: string;
  email: string;
  title: string;
  sup1: string;
  sup2: string;
  gpa: string;
  toefl: string;
}

const EMPTY: FormState = {
  track: '',
  regular: '',
  address: '',
  birthPlace: '',
  birthDate: '',
  phone: '',
  email: '',
  title: '',
  sup1: '',
  sup2: '',
  gpa: '',
  toefl: '',
};

const DRAFT_KEY = 'ta:mahasiswa:register-draft';

function fromRegistration(r: Registration): FormState {
  return {
    track: r.track,
    regular: r.regular,
    address: r.address,
    birthPlace: r.birthPlace,
    birthDate: r.birthDate,
    phone: r.phone,
    email: r.email,
    title: r.title,
    sup1: r.proposedSupervisors[0],
    sup2: r.proposedSupervisors[1],
    gpa: r.gpa,
    toefl: r.toeflScore,
  };
}

function validateData(f: FormState): Record<string, string> {
  const e: Record<string, string> = {};
  if (!f.track) e.track = 'Pilih jalur TA.';
  if (!f.regular) e.regular = 'Pilih konsentrasi.';
  if (f.address.trim().length < 10) e.address = 'Isi alamat lengkap.';
  if (!f.birthPlace.trim()) e.birthPlace = 'Isi tempat lahir.';
  if (!f.birthDate) e.birthDate = 'Pilih tanggal lahir.';
  if (!/^(\+62|62|0)8\d{7,12}$/.test(f.phone.replace(/[\s-]/g, '')))
    e.phone = 'Gunakan nomor HP Indonesia, mis. 081234567890.';
  if (!/^\S+@\S+\.\S+$/.test(f.email) || !f.email.toLowerCase().includes('widyatama.ac.id'))
    e.email = 'Gunakan email Widyatama.';
  if (f.title.trim().length < 10) e.title = 'Judul TA minimal 10 karakter.';
  if (!f.sup1) e.sup1 = 'Pilih usulan pembimbing pertama.';
  if (!f.sup2) e.sup2 = 'Pilih usulan pembimbing kedua.';
  if (f.sup1 && f.sup1 === f.sup2) e.sup2 = 'Usulan kedua harus berbeda dari usulan pertama.';
  const gpa = Number(f.gpa.replace(',', '.'));
  if (!f.gpa || Number.isNaN(gpa) || gpa < 0 || gpa > 4) e.gpa = 'IPK harus antara 0 dan 4.';
  if (f.toefl && (Number(f.toefl) < 0 || Number(f.toefl) > 677)) e.toefl = 'Skor TOEFL ITP 0–677.';
  return e;
}

/* ─────────── Langkah lanjutan: upload template (kalau pendaftaran sudah terkirim) ─────────── */

function TemplateStep({ registration, onDone }: { registration: Registration; onDone: () => void }) {
  const tpl = TA_TEMPLATES[registration.track];
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();

  const send = async () => {
    if (!file) return setError('Unggah template yang sudah dilengkapi.');
    setSending(true);
    try {
      await taApi.uploadRegistrationTemplate(file);
      onDone();
    } catch {
      setError('Gagal mengirim berkas. Coba lagi.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
      <Alert tone="success" title="Pendaftaran terkirim">
        Satu langkah lagi: lengkapi template bimbingan, lalu unggah kembali agar Staff dapat memverifikasi.
      </Alert>

      <Card title={`Template: ${tpl.label}`}>
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-slate-50 p-4">
            <p className="text-sm text-slate-700">Unduh, isi, tandatangani, lalu pindai menjadi PDF atau JPG.</p>
            <DownloadLink href={tpl.url}>
              <Download className="h-4 w-4" aria-hidden /> Download Template (.DOCX)
            </DownloadLink>
          </div>

          <FileUpload
            label="Template yang sudah dilengkapi"
            accept="pdf-img"
            maxMB={2}
            value={file}
            onChange={(f) => {
              setFile(f);
              setError(undefined);
            }}
            error={error}
            required
          />

          <div className="flex justify-end">
            <Button loading={sending} onClick={send} icon={<Send className="h-4 w-4" aria-hidden />}>
              Kirim Template
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ─────────────────────────── Halaman utama ─────────────────────────── */

export default function Register() {
  const { data, loading, error, reload } = useSnapshot();
  const lecturers = useLecturers();
  const [form, setForm, clearDraft] = useDraft<FormState>(DRAFT_KEY, EMPTY);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [agreed, setAgreed] = useState(false);
  const [step, setStep] = useState(0); 
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>();

  const existing = data?.registration;
  const rejected = existing?.status === 'REJECTED';

  useEffect(() => {
    if (rejected && existing) setForm(fromRegistration(existing));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rejected]);

  const defs = useMemo(() => registrationAttachments(form.track, form.regular), [form.track, form.regular]);

  if (loading) return <PageLoader />;
  if (error || !data) {
    return (
      <Page>
        <LoadError message={error ?? 'Data kosong.'} onRetry={reload} />
      </Page>
    );
  }

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: '' }));
  };

  // Sudah daftar & belum upload template → tampilkan TemplateStep
  if (existing && !rejected && !existing.templateFile) {
    return (
      <Page>
        <PageHeader title="Pendaftaran TA" />
        <TemplateStep registration={existing} onDone={reload} />
      </Page>
    );
  }

  // Sudah daftar & tidak ditolak → arahkan ke status
  if (existing && !rejected) {
    return (
      <Page>
        <PageHeader title="Pendaftaran TA" />
        <Alert
          tone="info"
          title="Anda sudah mendaftar TA"
          action={
            <Link
              to={taPath('status-pendaftaran')}
              className="rounded-md bg-blue-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-900"
            >
              Lihat status
            </Link>
          }
        >
          Pantau verifikasi dan penetapan pembimbing di halaman status.
        </Alert>
      </Page>
    );
  }

  // ─── Step 1: next ke step 2 ───
  const next = () => {
    const e = validateData(form);
    setErrors(e);
    if (Object.values(e).some(Boolean)) return scrollToFirstError();
    setStep(1);
  };

  // ─── Step 2: submit ───
  const submit = async () => {
    const e: Record<string, string> = {};
    Object.assign(e, missingAttachments(defs, files));
    if (!agreed) e.agreed = 'Centang pernyataan sebelum mengirim.';
    setErrors(e);
    if (Object.values(e).some(Boolean)) return scrollToFirstError();

    setSubmitting(true);
    setSubmitError(undefined);
    try {
      await taApi.submitRegistration(
        {
          track: form.track as Track,
          regular: form.regular as Regular,
          address: form.address.trim(),
          birthPlace: form.birthPlace.trim(),
          birthDate: form.birthDate,
          phone: form.phone.trim(),
          email: form.email.trim(),
          title: form.title.trim(),
          proposedSupervisors: [form.sup1, form.sup2],
          gpa: form.gpa.replace(',', '.'),
          toeflScore: form.toefl,
        },
        files as Record<string, File>,
      );
      clearDraft();
      await reload();
    } catch {
      setSubmitError('Pendaftaran gagal dikirim. Data Anda tidak hilang, silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  const supOptions = (exclude: string) =>
    lecturers.map((l) => (
      <option key={l.id} value={l.id} disabled={l.id === exclude}>
        {l.name}
      </option>
    ));

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Stepper (sama seperti KP) */}
      <div className="flex items-center justify-center">
        {[0, 1].map((i) => (
          <div key={i} className="flex items-center">
            <div
              className={`w-9 h-9 rounded-full grid place-items-center text-sm font-bold ${
                i < step
                  ? 'bg-blue-800 text-white'
                  : i === step
                  ? 'bg-orange-500 text-white ring-4 ring-orange-50'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {i < step ? <Check className="w-5 h-5" /> : i + 1}
            </div>
            {i < 1 && (
              <div
                className={`h-0.5 w-20 sm:w-40 ${i < step ? 'bg-orange-500' : 'bg-blue-100'}`}
              />
            )}
          </div>
        ))}
      </div>

      {rejected && <RejectionNote note={existing?.staffNote} title="Pendaftaran ditolak" />}

      {/* ═══ STEP 1: DATA DIRI ═══ */}
      {step === 0 && (
        <Card>
          <div className="space-y-5">
            {/* ─── Jalur TA (paling atas) ─── */}
            <OptionGroup<Track>
              legend="Jalur Tugas Akhir"
              value={form.track}
              onChange={(v) => set('track', v)}
              error={errors.track}
              options={[
                { value: 'SKRIPSI', label: 'Skripsi' },
                { value: 'JURNAL', label: 'Jurnal' },
              ]}
            />

            {/* ─── Konsentrasi ─── */}
            <OptionGroup<Regular>
              legend="Konsentrasi"
              value={form.regular}
              onChange={(v) => set('regular', v)}
              error={errors.regular}
              options={[
                { value: 'A', label: 'Reg A', hint: 'Lampiran: Sertifikat PKM' },
                { value: 'B', label: 'Reg B', hint: 'Lampiran: Sertifikat Kegiatan Ilmiah' },
              ]}
            />

            {/* ─── Data Diri ─── */}
            <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-slate-100">
              <Field label="Nama Lengkap">
                <input className={inputCls} value={data.profile.name} readOnly />
              </Field>
              <Field label="Nomor Pokok Mahasiswa (NPM)">
                <input className={inputCls} value={data.profile.npm} readOnly />
              </Field>

              <Field label="Alamat Tempat Tinggal Sekarang" required error={errors.address} className="sm:col-span-2">
                <textarea
                  rows={2}
                  className={inputCls}
                  value={form.address}
                  onChange={(e) => set('address', e.target.value)}
                />
              </Field>

              <Field label="Tempat Lahir" required error={errors.birthPlace}>
                <input
                  className={inputCls}
                  value={form.birthPlace}
                  onChange={(e) => set('birthPlace', e.target.value)}
                />
              </Field>
              <Field label="Tanggal Lahir" required error={errors.birthDate}>
                <input
                  type="date"
                  className={inputCls}
                  value={form.birthDate}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => set('birthDate', e.target.value)}
                />
              </Field>

              <Field label="Email Widyatama (@widyatama.ac.id)" required error={errors.email}>
                <input
                  type="email"
                  className={inputCls}
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                />
              </Field>
              <Field label="Nomor Telepon/WhatsApp" required error={errors.phone}>
                <input
                  type="tel"
                  inputMode="tel"
                  className={inputCls}
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                />
              </Field>

              <Field label="IPK Terakhir" required error={errors.gpa}>
                <input
                  inputMode="decimal"
                  className={inputCls}
                  placeholder="3.45"
                  value={form.gpa}
                  onChange={(e) => set('gpa', e.target.value)}
                />
              </Field>
              <Field
                label="Skor TOEFL"
                error={errors.toefl}
                hint="Kosongkan jika baru punya bukti pendaftaran."
              >
                <input
                  inputMode="numeric"
                  className={inputCls}
                  value={form.toefl}
                  onChange={(e) => set('toefl', e.target.value.replace(/\D/g, ''))}
                />
              </Field>

              <Field label="Judul TA (Rencana Topik)" required error={errors.title} className="sm:col-span-2">
                <textarea
                  rows={2}
                  className={inputCls}
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                />
              </Field>

              <Field label="Usulan Dosen Pembimbing 1" required error={errors.sup1}>
                <select
                  className={inputCls}
                  value={form.sup1}
                  onChange={(e) => set('sup1', e.target.value)}
                >
                  <option value="">Pilih dosen</option>
                  {supOptions(form.sup2)}
                </select>
              </Field>
              <Field label="Usulan Dosen Pembimbing 2" required error={errors.sup2}>
                <select
                  className={inputCls}
                  value={form.sup2}
                  onChange={(e) => set('sup2', e.target.value)}
                >
                  <option value="">Pilih dosen</option>
                  {supOptions(form.sup1)}
                </select>
              </Field>
            </div>
          </div>
        </Card>
      )}

      {/* ═══ STEP 2: LAMPIRAN + SUBMIT ═══ */}
      {step === 1 && (
        <Card>
          <div className="space-y-5">
            <h3 className="font-bold">Form Kerja Praktek — Unggah Lampiran</h3>

            <div className="flex items-center justify-between gap-2 rounded-lg border border-blue-100 p-2 pl-3 text-sm font-medium">
              Template Form Pengajuan TA
              <a
                href={TA_TEMPLATES[form.track || 'SKRIPSI'].url}
                download
                className="inline-flex items-center gap-1.5 rounded-md bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900"
              >
                <Download className="w-4 h-4" /> Unduh
              </a>
            </div>

            <AttachmentFields
              defs={defs}
              files={files}
              errors={errors}
              onChange={(k, f) => {
                setFiles((p) => ({ ...p, [k]: f }));
                setErrors((p) => ({ ...p, [k]: '' }));
              }}
            />

            <div data-error={errors.agreed ? 'true' : undefined}>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1 accent-orange-500"
                  checked={agreed}
                  onChange={(e) => {
                    setAgreed(e.target.checked);
                    setErrors((p) => ({ ...p, agreed: '' }));
                  }}
                />
                Saya menyatakan bahwa data dan berkas yang dilampirkan adalah benar dan dapat
                dipertanggungjawabkan sesuai ketentuan akademik.
              </label>
              {errors.agreed && (
                <p role="alert" className="mt-1 text-xs text-red-600">
                  {errors.agreed}
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {submitError && <Alert tone="danger">{submitError}</Alert>}

      {/* Tombol navigasi */}
      {step === 0 && (
        <Button className="w-full py-3" onClick={next}>
          Selanjutnya
        </Button>
      )}

      {step === 1 && (
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 py-3"
            onClick={() => setStep(0)}
            icon={<ArrowLeft className="inline w-4 h-4 -mt-0.5 mr-1" />}
          >
            Sebelumnya
          </Button>
          <Button
            className="flex-[2] py-3"
            loading={submitting}
            onClick={submit}
            icon={<Check className="inline w-4 h-4 -mt-0.5 mr-1.5" />}
          >
            Kirim Permohonan TA
          </Button>
        </div>
      )}
    </div>
  );
}