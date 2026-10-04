import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  EmptyState,
  LoadError,
  Page,
  PageHeader,
  PageLoader,
  fmtDate,
  fmtDateTime,
  useSnapshot,
} from './shared';
import { taDosenApi, computeFinalScore, type BAP as BAPType } from './api';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Check, FileCheck2, Send } from 'lucide-react';

/* ═══════════ Konfigurasi Komponen Penilaian ═══════════ */

type ScoreKey = keyof BAPType['scores'];

interface ScoreItem {
  key: ScoreKey;
  label: string;
}

interface ScoreGroup {
  title: string;
  weight: string;
  items: ScoreItem[];
}

const SCORE_GROUPS: ScoreGroup[] = [
  {
    title: 'Isi',
    weight: '60%',
    items: [
      { key: 'rumusanMasalah', label: 'Rumusan masalah' },
      { key: 'tujuanPenelitian', label: 'Tujuan penelitian' },
      { key: 'kontribusiPenelitian', label: 'Kontribusi penelitian' },
      { key: 'relevansiTopik', label: 'Relevansi dengan topik' },
      { key: 'kemutakhiranPustaka', label: 'Kemutakhiran daftar pustaka' },
      { key: 'pengacuanPustaka', label: 'Pengacuan daftar pustaka' },
      { key: 'kesesuaianMetode', label: 'Kesesuaian metode dengan masalah' },
      { key: 'ketepatanRancangan', label: 'Ketepatan rancangan penelitian' },
      { key: 'ketepatanInstrumen', label: 'Ketepatan instrumen' },
      { key: 'ketajamanAnalisis', label: 'Ketepatan & ketajaman analisis' },
      { key: 'manfaatPenelitian', label: 'Manfaat & kontribusi ilmu' },
      { key: 'kesesuaianTujuan', label: 'Sesuai dengan tujuan penelitian' },
      { key: 'kedalamanPembahasan', label: 'Kedalaman pembahasan' },
      { key: 'keaslianTulisan', label: 'Kadar keaslian tulisan' },
    ],
  },
  {
    title: 'Sikap Ilmiah',
    weight: '40%',
    items: [
      { key: 'wawasanBidangIlmu', label: 'Wawasan bidang ilmu' },
      { key: 'kemampuanPresentasi', label: 'Kemampuan presentasi' },
      { key: 'ketepatanJawaban', label: 'Ketepatan jawaban' },
      { key: 'kelancaranJawaban', label: 'Kelancaran jawaban' },
    ],
  },
];

const EMPTY_SCORES: BAPType['scores'] = {
  rumusanMasalah: 0,
  tujuanPenelitian: 0,
  kontribusiPenelitian: 0,
  relevansiTopik: 0,
  kemutakhiranPustaka: 0,
  pengacuanPustaka: 0,
  kesesuaianMetode: 0,
  ketepatanRancangan: 0,
  ketepatanInstrumen: 0,
  ketajamanAnalisis: 0,
  manfaatPenelitian: 0,
  kesesuaianTujuan: 0,
  kedalamanPembahasan: 0,
  keaslianTulisan: 0,
  wawasanBidangIlmu: 0,
  kemampuanPresentasi: 0,
  ketepatanJawaban: 0,
  kelancaranJawaban: 0,
};

/* ═══════════ Halaman Utama ═══════════ */

export default function BAP() {
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
        <PageHeader title="BAP Sidang" />
        <EmptyState title="Anda bukan Dosen Penguji">
          Halaman ini hanya untuk dosen yang terdaftar sebagai penguji TA.
        </EmptyState>
      </Page>
    );
  }

  const pending = examinees.filter((e) => e.bapStatus === 'NOT_FILLED');
  const filled = examinees.filter((e) => e.bapStatus === 'FILLED');

  return (
    <Page>
      <PageHeader
        title="BAP Sidang & Penilaian"
        subtitle="Isi Berita Acara Sidang dan penilaian untuk mahasiswa yang Anda uji."
      />

      <div className="space-y-5">
        {/* ─── Menunggu diisi ─── */}
        <Card title={`Menunggu Diisi (${pending.length})`}>
          {pending.length === 0 ? (
            <EmptyState title="Semua BAP sudah diisi">
              Tidak ada BAP yang menunggu diisi.
            </EmptyState>
          ) : (
            <ul className="space-y-4">
              {pending.map((e) => (
                <BAPForm key={e.nim} examinee={e} onSaved={reload} />
              ))}
            </ul>
          )}
        </Card>

        {/* ─── Riwayat ─── */}
        {filled.length > 0 && (
          <Card title="BAP Sudah Diisi">
            <ul className="space-y-3">
              {filled.map((e) => (
                <li
                  key={e.nim}
                  className="flex items-center gap-3 rounded-md border border-emerald-100 bg-emerald-50/40 px-4 py-3"
                >
                  <Check className="h-5 w-5 text-emerald-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {e.name} · <span className="text-slate-500 font-normal">{e.nim}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      Sidang: {fmtDate(e.schedule.date)} ·{' '}
                      {e.bap && (
                        <>
                          Nilai: <b className="text-slate-700">{e.bap.finalScore}</b> ({e.bap.grade})
                        </>
                      )}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-emerald-700">
                    {e.bap && fmtDateTime(e.bap.submittedAt)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </Page>
  );
}

/* ═══════════ Form BAP per Mahasiswa ═══════════ */

function BAPForm({
  examinee,
  onSaved,
}: {
  examinee: import('./api').Examinee;
  onSaved: () => void;
}) {
  const [scores, setScores] = useState<BAPType['scores']>(EMPTY_SCORES);
  const [decision, setDecision] = useState<BAPType['decision'] | ''>('');
  const [notes, setNotes] = useState('');
  const [revisionDeadline, setRevisionDeadline] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const { score, grade } = computeFinalScore(scores);
  const filledCount = Object.values(scores).filter((v) => v > 0).length;
  const totalCount = Object.keys(scores).length;
  const progress = Math.round((filledCount / totalCount) * 100);

  const setScore = (key: ScoreKey, val: number) => {
    setScores((prev) => ({ ...prev, [key]: val }));
    setErr('');
  };

  const submit = async () => {
    if (filledCount < totalCount) {
      setErr(`Masih ada ${totalCount - filledCount} komponen yang belum dinilai.`);
      return;
    }
    if (!decision) {
      setErr('Pilih keputusan sidang.');
      return;
    }
    if (decision === 'LULUS_DENGAN_REVISI' && !revisionDeadline) {
      setErr('Isi batas tanggal revisi.');
      return;
    }

    setSaving(true);
    setErr('');
    try {
      await taDosenApi.submitBAP(examinee.nim, {
        scores,
        finalScore: score,
        grade,
        decision,
        notes,
        revisionDeadline: decision === 'LULUS_DENGAN_REVISI' ? revisionDeadline : undefined,
      });
      onSaved();
    } catch {
      setErr('Gagal menyimpan BAP.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className="rounded-lg border border-slate-200 bg-white p-5">
      {/* ─── Info mahasiswa ─── */}
      <div className="mb-4">
        <p className="font-semibold text-slate-900">
          {examinee.name} · <span className="text-slate-500 font-normal">{examinee.nim}</span>
        </p>
        <p className="mt-0.5 text-sm text-slate-600">{examinee.title}</p>
        <p className="mt-1 text-xs text-slate-500">
          Sidang: {fmtDate(examinee.schedule.date)} · {examinee.schedule.time} ·{' '}
          {examinee.schedule.room}
        </p>
      </div>

      {/* ─── Progress bar ─── */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
          <span>
            Progress penilaian: <b>{filledCount}</b> / {totalCount}
          </span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-orange-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* ─── Penilaian per grup ─── */}
      {SCORE_GROUPS.map((group) => (
        <div key={group.title} className="mb-4">
          <h4 className="mb-2 text-sm font-semibold text-slate-800">
            {group.title} <span className="text-slate-500 font-normal">(bobot {group.weight})</span>
          </h4>
          <div className="space-y-2">
            {group.items.map((item) => (
              <div
                key={item.key}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-slate-50 px-3 py-2"
              >
                <span className="text-sm text-slate-700 flex-1 min-w-[180px]">
                  {item.label}
                </span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setScore(item.key, v)}
                      className={`h-8 w-8 rounded-md text-sm font-medium transition ${
                        scores[item.key] === v
                          ? 'bg-blue-800 text-white shadow-sm'
                          : 'bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-800 border border-slate-300'
                      }`}
                      title={`Nilai ${v}`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* ─── Nilai Akhir ─── */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-blue-50 p-3 text-center">
          <p className="text-xs text-blue-700 font-medium">Nilai Akhir</p>
          <p className="text-3xl font-bold text-blue-900 mt-1">{score.toFixed(2)}</p>
        </div>
        <div className="rounded-lg bg-orange-50 p-3 text-center">
          <p className="text-xs text-orange-700 font-medium">Grade</p>
          <p className="text-3xl font-bold text-orange-700 mt-1">{grade}</p>
        </div>
      </div>

      {/* ─── Keputusan ─── */}
      <div className="mb-3">
        <p className="mb-2 text-sm font-medium text-slate-700">
          Keputusan Sidang <span className="text-red-600">*</span>
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { v: 'LULUS_TANPA_REVISI' as const, label: 'Lulus tanpa revisi' },
            { v: 'LULUS_DENGAN_REVISI' as const, label: 'Lulus dengan revisi' },
            { v: 'TIDAK_LULUS' as const, label: 'Tidak lulus' },
          ].map((o) => (
            <label
              key={o.v}
              className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition ${
                decision === o.v
                  ? 'border-blue-700 bg-blue-50'
                  : 'border-slate-300 bg-white hover:border-slate-400'
              }`}
            >
              <input
                type="radio"
                name={`decision-${examinee.nim}`}
                checked={decision === o.v}
                onChange={() => setDecision(o.v)}
                className="h-4 w-4 accent-blue-700"
              />
              <span className="text-slate-800">{o.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* ─── Batas revisi (kalau lulus dengan revisi) ─── */}
      {decision === 'LULUS_DENGAN_REVISI' && (
        <div className="mb-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">
              Batas Tanggal Revisi <span className="text-red-600">*</span>
            </span>
            <input
              type="date"
              value={revisionDeadline}
              onChange={(e) => setRevisionDeadline(e.target.value)}
              className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>
        </div>
      )}

      {/* ─── Catatan ─── */}
      <div className="mb-4">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">
            Catatan Jalannya Sidang
          </span>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ringkasan jalannya sidang, masukan untuk mahasiswa, dll."
            className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </label>
      </div>

      {err && <Alert tone="danger">{err}</Alert>}

      {/* ─── Tombol ─── */}
      <div className="flex justify-end">
        <Button
          variant="action"
          onClick={submit}
          loading={saving}
          icon={<Send className="h-4 w-4" />}
        >
          Simpan BAP & Penilaian
        </Button>
      </div>
    </li>
  );
}