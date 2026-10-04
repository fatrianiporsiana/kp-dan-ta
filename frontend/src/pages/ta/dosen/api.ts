/**
 * Layer data modul Tugas Akhir (role Dosen — Pembimbing & Penguji).
 * Pakai in-memory mock. Ganti isi `taDosenApi.*` dengan fetch backend nanti.
 */

/* ───────────────────────── Types ───────────────────────── */

export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Lecturer {
  id: string;
  name: string;
  nidn: string;
}

export interface UploadedFile {
  name: string;
  size: number;
}

/** Mahasiswa yang dibimbing dosen */
export interface Advisee {
  nim: string;
  name: string;
  email: string;
  phone: string;
  track: 'SKRIPSI' | 'JURNAL';
  regular: 'A' | 'B';
  title: string;
  /** Tahap TA saat ini */
  stage: 'PENDAFTARAN' | 'BIMBINGAN' | 'SIDANG' | 'REVISI' | 'SELESAI';
  /** Status sidang */
  defenseStatus?: ReviewStatus;
  schedule?: { date: string; time: string; room: string };
  examiners?: Lecturer[];
}

/** Mahasiswa yang diuji dosen */
export interface Examinee {
  nim: string;
  name: string;
  title: string;
  track: 'SKRIPSI' | 'JURNAL';
  /** Dosen pembimbing mahasiswa */
  supervisor: Lecturer;
  coSupervisor?: Lecturer;
  /** Dosen penguji (termasuk dosen login) */
  examiners: Lecturer[];
  /** Posisi dosen login (Penguji 1, 2, atau 3) */
  myRole: 'PENGUJI_1' | 'PENGUJI_2' | 'PENGUJI_3';
  schedule: { date: string; time: string; room: string };
  /** Status BAP */
  bapStatus: 'NOT_FILLED' | 'FILLED';
  bap?: BAP;
}

/** Berita Acara Sidang + Penilaian */
export interface BAP {
  /** Nilai per aspek (1-5) */
  scores: {
    // Aspek Isi (bobot total 60%)
    rumusanMasalah: number;
    tujuanPenelitian: number;
    kontribusiPenelitian: number;
    relevansiTopik: number;
    kemutakhiranPustaka: number;
    pengacuanPustaka: number;
    kesesuaianMetode: number;
    ketepatanRancangan: number;
    ketepatanInstrumen: number;
    ketajamanAnalisis: number;
    manfaatPenelitian: number;
    kesesuaianTujuan: number;
    kedalamanPembahasan: number;
    keaslianTulisan: number;
    // Aspek Sikap Ilmiah (bobot total 40%)
    wawasanBidangIlmu: number;
    kemampuanPresentasi: number;
    ketepatanJawaban: number;
    kelancaranJawaban: number;
  };
  /** Nilai akhir yang dihitung sistem */
  finalScore: number;
  /** Nilai huruf */
  grade: 'A' | 'A-' | 'B+' | 'B' | 'C+' | 'C' | '-';
  /** Keputusan sidang */
  decision: 'LULUS_TANPA_REVISI' | 'LULUS_DENGAN_REVISI' | 'TIDAK_LULUS';
  /** Catatan jalannya sidang */
  notes?: string;
  /** Batas revisi */
  revisionDeadline?: string;
  submittedAt: string;
}

export interface Snapshot {
  dosen: {
    name: string;
    email: string;
    nidn: string;
    /** Role dosen di TA */
    isPembimbing: boolean;
    isPenguji: boolean;
  };
  advisees: Advisee[];
  examinees: Examinee[];
  stats: {
    totalAdvisees: number;
    pendingDefense: number;
    totalExaminees: number;
    pendingBAP: number;
  };
}

/* ───────────────────────── Mock data ───────────────────────── */

const LECTURERS: Lecturer[] = [
  { id: 'd1', name: 'Dr. Ratna Wulandari, S.T., M.T.', nidn: '0411038201' },
  { id: 'd2', name: 'Ir. Hendra Gunawan, M.Kom.', nidn: '0415067502' },
  { id: 'd3', name: 'Dr. Agus Prasetyo, S.Kom., M.Sc.', nidn: '0421098003' },
  { id: 'd4', name: 'Siti Nurhaliza, S.T., M.Cs.', nidn: '0403128804' },
  { id: 'd5', name: 'Prof. Dedi Kurniawan, Ph.D.', nidn: '0409077005' },
];

const ME = LECTURERS[0]; // Dosen yang login (Ratna)

const ADVISEES: Advisee[] = [
  {
    nim: '2210001',
    name: 'Budi Santoso',
    email: 'budi@student.widyatama.ac.id',
    phone: '081234567890',
    track: 'SKRIPSI',
    regular: 'A',
    title: 'Sistem Rekomendasi Wisata Berbasis Machine Learning',
    stage: 'SIDANG',
    defenseStatus: 'APPROVED',
    schedule: { date: '2026-12-20', time: '09:00', room: 'Ruang 3.1' },
    examiners: [LECTURERS[2], LECTURERS[4]],
  },
  {
    nim: '2210002',
    name: 'Siti Nurhaliza',
    email: 'siti@student.widyatama.ac.id',
    phone: '081234567891',
    track: 'JURNAL',
    regular: 'B',
    title: 'Analisis Sentimen Media Sosial dengan Deep Learning',
    stage: 'BIMBINGAN',
  },
  {
    nim: '2210003',
    name: 'Andi Wijaya',
    email: 'andi@student.widyatama.ac.id',
    phone: '081234567892',
    track: 'SKRIPSI',
    regular: 'A',
    title: 'Pengembangan Aplikasi Mobile untuk Monitoring Kesehatan',
    stage: 'REVISI',
    defenseStatus: 'APPROVED',
    schedule: { date: '2026-12-15', time: '13:00', room: 'Ruang 2.3' },
    examiners: [LECTURERS[1], LECTURERS[3]],
  },
];

const EXAMINEES: Examinee[] = [
  {
    nim: '2210004',
    name: 'Dewi Lestari',
    title: 'Deteksi Anomali Jaringan Menggunakan Algoritma Random Forest',
    track: 'SKRIPSI',
    supervisor: LECTURERS[2], // Agus
    coSupervisor: LECTURERS[3], // Siti
    examiners: [ME, LECTURERS[4]], // Ratna (penguji 1), Dedi (penguji 2)
    myRole: 'PENGUJI_1',
    schedule: { date: '2026-12-18', time: '09:00', room: 'Ruang Sidang 2.3' },
    bapStatus: 'NOT_FILLED',
  },
  {
    nim: '2210005',
    name: 'Rudi Hartono',
    title: 'Sistem Pakar Diagnosa Penyakit Menggunakan Certainty Factor',
    track: 'SKRIPSI',
    supervisor: LECTURERS[1],
    coSupervisor: LECTURERS[3],
    examiners: [ME, LECTURERS[2]], // Ratna (penguji 1)
    myRole: 'PENGUJI_1',
    schedule: { date: '2026-12-10', time: '10:00', room: 'Ruang 3.1' },
    bapStatus: 'FILLED',
    bap: {
      scores: {
        rumusanMasalah: 4,
        tujuanPenelitian: 4,
        kontribusiPenelitian: 4,
        relevansiTopik: 5,
        kemutakhiranPustaka: 4,
        pengacuanPustaka: 4,
        kesesuaianMetode: 4,
        ketepatanRancangan: 4,
        ketepatanInstrumen: 4,
        ketajamanAnalisis: 4,
        manfaatPenelitian: 5,
        kesesuaianTujuan: 4,
        kedalamanPembahasan: 4,
        keaslianTulisan: 5,
        wawasanBidangIlmu: 5,
        kemampuanPresentasi: 4,
        ketepatanJawaban: 4,
        kelancaranJawaban: 4,
      },
      finalScore: 85,
      grade: 'A',
      decision: 'LULUS_TANPA_REVISI',
      notes: 'Presentasi baik, jawaban tajam, metode tepat.',
      submittedAt: '2026-12-10T11:30:00.000Z',
    },
  },
];

/* ───────────────────────── Helpers ───────────────────────── */

const delay = (ms = 400) => new Promise<void>((r) => setTimeout(r, ms));
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const now = () => new Date().toISOString();

/** Hitung nilai akhir dari 18 komponen (14 isi + 4 sikap) */
export function computeFinalScore(s: BAP['scores']): { score: number; grade: BAP['grade'] } {
  // Isi: 14 komponen, max 70 (karena 14 × 5 = 70)
  const isiTotal =
    s.rumusanMasalah +
    s.tujuanPenelitian +
    s.kontribusiPenelitian +
    s.relevansiTopik +
    s.kemutakhiranPustaka +
    s.pengacuanPustaka +
    s.kesesuaianMetode +
    s.ketepatanRancangan +
    s.ketepatanInstrumen +
    s.ketajamanAnalisis +
    s.manfaatPenelitian +
    s.kesesuaianTujuan +
    s.kedalamanPembahasan +
    s.keaslianTulisan;
  // Sikap: 4 komponen, max 20
  const sikapTotal =
    s.wawasanBidangIlmu + s.kemampuanPresentasi + s.ketepatanJawaban + s.kelancaranJawaban;

  // Nilai = (Isi/70 × 60%) + (Sikap/20 × 40%) × 100
  const score = Math.round(((isiTotal / 70) * 0.6 + (sikapTotal / 20) * 0.4) * 100 * 100) / 100;

  let grade: BAP['grade'] = '-';
  if (score >= 85) grade = 'A';
  else if (score >= 80) grade = 'A-';
  else if (score >= 75) grade = 'B+';
  else if (score >= 70) grade = 'B';
  else if (score >= 60) grade = 'C+';
  else if (score >= 55) grade = 'C';
  else grade = '-';

  return { score, grade };
}

/* ───────────────────────── API ───────────────────────── */

export const taDosenApi = {
  async getSnapshot(): Promise<Snapshot> {
    await delay(350);
    return clone({
      dosen: {
        name: ME.name,
        email: 'ratna@widyatama.ac.id',
        nidn: ME.nidn,
        isPembimbing: true,
        isPenguji: true,
      },
      advisees: ADVISEES,
      examinees: EXAMINEES,
      stats: {
        totalAdvisees: ADVISEES.length,
        pendingDefense: ADVISEES.filter((a) => a.stage === 'SIDANG').length,
        totalExaminees: EXAMINEES.length,
        pendingBAP: EXAMINEES.filter((e) => e.bapStatus === 'NOT_FILLED').length,
      },
    });
  },

  /** Submit BAP + Penilaian */
  async submitBAP(nim: string, bap: Omit<BAP, 'submittedAt'>) {
    await delay();
    const e = EXAMINEES.find((x) => x.nim === nim);
    if (!e) return;
    e.bap = { ...bap, submittedAt: now() };
    e.bapStatus = 'FILLED';
  },
};

/* ───────────────────────── Dev helpers ─────────────────────────
 *   __taDosen.reset()
 */
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__taDosen = {
    reset() {
      EXAMINEES[0].bapStatus = 'NOT_FILLED';
      EXAMINEES[0].bap = undefined;
      EXAMINEES[1].bapStatus = 'FILLED';
    },
  };
}