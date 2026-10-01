/**
 * Layer data modul Tugas Akhir (role Staff).
 * Mengikuti pola ta/mahasiswa/api.ts — pakai in-memory mock.
 * Ganti isi `taStaffApi.*` dengan fetch backend tanpa mengubah halaman.
 */

/* ───────────────────────── Types ───────────────────────── */

export type Track = 'SKRIPSI' | 'JURNAL';
export type Regular = 'A' | 'B';
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

/** Data mahasiswa TA yang dilihat Staff */
export interface StudentTA {
  nim: string;
  name: string;
  email: string;
  phone: string;
  track: Track;
  regular: Regular;
  title: string;

  // ─── Pendaftaran ───
  regStatus: ReviewStatus;
  regData: Record<string, string>;
  regFiles: Record<string, UploadedFile>;
  regSubmittedAt: string;
  regNote?: string;
  proposedSupervisors: [string, string]; // id dosen
  templateFile?: UploadedFile;

  // ─── Penetapan Dospem ───
  mainSupervisor?: Lecturer;
  coSupervisor?: Lecturer;

  // ─── Sidang ───
  defenseStatus?: ReviewStatus;
  defenseData?: Record<string, string>;
  defenseFiles?: Record<string, UploadedFile>;
  defenseSubmittedAt?: string;
  defenseNote?: string;
  examiners?: Lecturer[];
  schedule?: { date: string; time: string; room: string };
}

export interface StaffStats {
  pendingRegistration: number;
  pendingSupervisors: number;
  pendingDefense: number;
  scheduledDefense: number;
}

export interface Snapshot {
  staff: { name: string; email: string };
  students: StudentTA[];
  lecturers: Lecturer[];
  stats: StaffStats;
}

/* ───────────────────────── Mock data ───────────────────────── */

const LECTURERS: Lecturer[] = [
  { id: 'd1', name: 'Dr. Ratna Wulandari, S.T., M.T.', nidn: '0411038201' },
  { id: 'd2', name: 'Ir. Hendra Gunawan, M.Kom.', nidn: '0415067502' },
  { id: 'd3', name: 'Dr. Agus Prasetyo, S.Kom., M.Sc.', nidn: '0421098003' },
  { id: 'd4', name: 'Siti Nurhaliza, S.T., M.Cs.', nidn: '0403128804' },
  { id: 'd5', name: 'Prof. Dedi Kurniawan, Ph.D.', nidn: '0409077005' },
  { id: 'd6', name: 'Maya Anggraini, S.Kom., M.T.', nidn: '0417098906' },
];

const byId = (id: string) => LECTURERS.find((l) => l.id === id);

const STUDENTS: StudentTA[] = [
  {
    nim: '2210001',
    name: 'Budi Santoso',
    email: 'budi@student.widyatama.ac.id',
    phone: '081234567890',
    track: 'SKRIPSI',
    regular: 'A',
    title: 'Sistem Rekomendasi Wisata Berbasis Machine Learning',
    regStatus: 'PENDING',
    regData: {
      alamat: 'Jl. Dipatiukur No. 112, Bandung',
      tempatLahir: 'Bandung',
      tanggalLahir: '2003-05-12',
      ipk: '3.45',
      toefl: '500',
    },
    regFiles: {
      proposal: { name: 'proposal-budi.pdf', size: 2456789 },
      nilaiBimbingan: { name: 'nilai-bimbingan.pdf', size: 456789 },
      pembayaran: { name: 'bukti-bayar.pdf', size: 234567 },
      frs: { name: 'frs-semester.pdf', size: 189012 },
      toefl: { name: 'sertifikat-toefl.pdf', size: 345678 },
      formTA: { name: 'form-ta-skripsi.pdf', size: 234567 },
      lsp: { name: 'sertifikat-lsp.pdf', size: 234567 },
      pkm: { name: 'sertifikat-pkm.pdf', size: 234567 },
    },
    regSubmittedAt: '2026-10-01T08:30:00.000Z',
    proposedSupervisors: ['d1', 'd3'],
  },
  {
    nim: '2210002',
    name: 'Siti Nurhaliza',
    email: 'siti@student.widyatama.ac.id',
    phone: '081234567891',
    track: 'JURNAL',
    regular: 'B',
    title: 'Analisis Sentimen Media Sosial dengan Deep Learning',
    regStatus: 'APPROVED',
    regData: {
      alamat: 'Jl. Sukajadi No. 45, Bandung',
      tempatLahir: 'Cimahi',
      tanggalLahir: '2003-03-20',
      ipk: '3.72',
      toefl: '520',
    },
    regFiles: {
      proposal: { name: 'proposal-siti.pdf', size: 2456789 },
      formTA: { name: 'form-ta-jurnal.pdf', size: 234567 },
      // ...dst
    },
    regSubmittedAt: '2026-09-28T10:15:00.000Z',
    proposedSupervisors: ['d2', 'd4'],
  },
  {
    nim: '2210003',
    name: 'Andi Wijaya',
    email: 'andi@student.widyatama.ac.id',
    phone: '081234567892',
    track: 'SKRIPSI',
    regular: 'A',
    title: 'Pengembangan Aplikasi Mobile untuk Monitoring Kesehatan',
    regStatus: 'APPROVED',
    regData: {
      alamat: 'Jl. Pasteur No. 20, Bandung',
      ipk: '3.55',
    },
    regFiles: {},
    regSubmittedAt: '2026-09-25T14:00:00.000Z',
    proposedSupervisors: ['d1', 'd5'],
    mainSupervisor: byId('d1'),
    coSupervisor: byId('d5'),
    defenseStatus: 'PENDING',
    defenseData: {
      judul: 'Pengembangan Aplikasi Mobile untuk Monitoring Kesehatan',
      dospem: 'Dr. Ratna Wulandari, S.T., M.T.',
      ipk: '3.55',
      toefl: '510',
    },
    defenseFiles: {
      pasFoto: { name: 'foto-andi.jpg', size: 123456 },
      draf: { name: 'draf-laporan.pdf', size: 5678901 },
      kartuBimbingan: { name: 'kartu-bimbingan.pdf', size: 345678 },
      // ...dst (8 lampiran)
    },
    defenseSubmittedAt: '2026-10-02T09:00:00.000Z',
  },
  {
    nim: '2210004',
    name: 'Dewi Lestari',
    email: 'dewi@student.widyatama.ac.id',
    phone: '081234567893',
    track: 'SKRIPSI',
    regular: 'A',
    title: 'Deteksi Anomali Jaringan Menggunakan Algoritma Random Forest',
    regStatus: 'APPROVED',
    regData: {
      alamat: 'Jl. Setiabudi No. 100, Bandung',
      ipk: '3.80',
    },
    regFiles: {},
    regSubmittedAt: '2026-09-20T11:30:00.000Z',
    proposedSupervisors: ['d3', 'd6'],
    mainSupervisor: byId('d3'),
    coSupervisor: byId('d6'),
    defenseStatus: 'APPROVED',
    defenseData: {
      judul: 'Deteksi Anomali Jaringan Menggunakan Algoritma Random Forest',
      dospem: 'Dr. Agus Prasetyo, S.Kom., M.Sc.',
      ipk: '3.80',
      toefl: '530',
    },
    defenseFiles: {},
    defenseSubmittedAt: '2026-09-30T13:00:00.000Z',
    examiners: [],
  },
  {
    nim: '2210005',
    name: 'Rudi Hartono',
    email: 'rudi@student.widyatama.ac.id',
    phone: '081234567894',
    track: 'SKRIPSI',
    regular: 'A',
    title: 'Sistem Pakar Diagnosa Penyakit Menggunakan Certainty Factor',
    regStatus: 'APPROVED',
    regData: {
      alamat: 'Jl. Buah Batu No. 50, Bandung',
      ipk: '3.60',
    },
    regFiles: {},
    regSubmittedAt: '2026-09-15T09:00:00.000Z',
    proposedSupervisors: ['d1', 'd4'],
    mainSupervisor: byId('d1'),
    coSupervisor: byId('d4'),
    defenseStatus: 'APPROVED',
    defenseData: {
      judul: 'Sistem Pakar Diagnosa Penyakit Menggunakan Certainty Factor',
      dospem: 'Dr. Ratna Wulandari, S.T., M.T.',
      ipk: '3.60',
      toefl: '495',
    },
    defenseFiles: {},
    defenseSubmittedAt: '2026-09-22T10:00:00.000Z',
    examiners: [LECTURERS[2], LECTURERS[4]],
    schedule: { date: '2026-12-20', time: '10:00', room: 'Ruang 3.1' },
  },
];

/* ───────────────────────── Helpers ───────────────────────── */

const delay = (ms = 400) => new Promise<void>((r) => setTimeout(r, ms));
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const now = () => new Date().toISOString();

function computeStats(students: StudentTA[]): StaffStats {
  return {
    pendingRegistration: students.filter((s) => s.regStatus === 'PENDING').length,
    pendingSupervisors: students.filter(
      (s) => s.regStatus === 'APPROVED' && !s.mainSupervisor,
    ).length,
    pendingDefense: students.filter((s) => s.defenseStatus === 'PENDING').length,
    scheduledDefense: students.filter(
      (s) => s.defenseStatus === 'APPROVED' && s.schedule,
    ).length,
  };
}

/* ───────────────────────── API ───────────────────────── */

export const taStaffApi = {
  async getSnapshot(): Promise<Snapshot> {
    await delay(350);
    return clone({
      staff: { name: 'Siti Rahma, S.Kom.', email: 'staff@widyatama.ac.id' },
      students: STUDENTS,
      lecturers: LECTURERS,
      stats: computeStats(STUDENTS),
    });
  },

  /* ─── TA-S-01: Verifikasi Pendaftaran ─── */
  async approveRegistration(nim: string) {
    await delay();
    const s = STUDENTS.find((x) => x.nim === nim);
    if (s) s.regStatus = 'APPROVED';
  },

  async rejectRegistration(nim: string, note: string) {
    await delay();
    const s = STUDENTS.find((x) => x.nim === nim);
    if (s) {
      s.regStatus = 'REJECTED';
      s.regNote = note;
    }
  },

  /* ─── TA-S-02: Penetapan Dospem & Co ─── */
  async setSupervisors(nim: string, mainId: string, coId: string) {
    await delay();
    const s = STUDENTS.find((x) => x.nim === nim);
    if (!s) return;
    s.mainSupervisor = byId(mainId);
    s.coSupervisor = byId(coId);
  },

  /* ─── TA-S-03: Verifikasi Dokumen Sidang ─── */
  async approveDefense(nim: string) {
    await delay();
    const s = STUDENTS.find((x) => x.nim === nim);
    if (s) s.defenseStatus = 'APPROVED';
  },

  async rejectDefense(nim: string, note: string) {
    await delay();
    const s = STUDENTS.find((x) => x.nim === nim);
    if (s) {
      s.defenseStatus = 'REJECTED';
      s.defenseNote = note;
    }
  },

  /* ─── TA-S-04: Plot Penguji & Jadwal Sidang ─── */
  async scheduleDefense(
    nim: string,
    examinerIds: string[],
    schedule: { date: string; time: string; room: string },
  ) {
    await delay();
    const s = STUDENTS.find((x) => x.nim === nim);
    if (!s) return;
    s.examiners = examinerIds.map((id) => byId(id)!).filter(Boolean);
    s.schedule = schedule;
    s.defenseStatus = 'APPROVED';
  },
};

/* ───────────────────────── Dev helpers ─────────────────────────
 * Simulasi aksi Mahasiswa dari console browser:
 *   __taStaff.reset()
 *   __taStaff.simulateNewRegistration()
 */
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__taStaff = {
    reset() {
      STUDENTS.forEach((s, i) => {
        if (i === 0) {
          s.regStatus = 'PENDING';
          s.mainSupervisor = undefined;
          s.coSupervisor = undefined;
          s.defenseStatus = undefined;
          s.examiners = undefined;
          s.schedule = undefined;
        }
      });
    },
    simulateNewRegistration() {
      STUDENTS.push({
        nim: `221000${STUDENTS.length + 1}`,
        name: `Mahasiswa Baru ${STUDENTS.length + 1}`,
        email: `mhs${STUDENTS.length + 1}@student.widyatama.ac.id`,
        phone: '081234567899',
        track: 'SKRIPSI',
        regular: 'A',
        title: 'Judul TA Baru (Simulasi)',
        regStatus: 'PENDING',
        regData: {
          alamat: 'Jl. Contoh No. 1, Bandung',
          ipk: '3.50',
        },
        regFiles: {
          proposal: { name: 'proposal.pdf', size: 1234567 },
        },
        regSubmittedAt: now(),
        proposedSupervisors: ['d1', 'd2'],
      });
    },
  };
}