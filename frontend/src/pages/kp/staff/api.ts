/**
 * Layer data modul Kerja Praktek (role Staff).
 * Mengikuti pola ta/staff/api.ts — pakai in-memory mock.
 * Ganti isi `kpStaffApi.*` dengan fetch backend tanpa mengubah halaman.
 */

/* ───────────────────────── Types ───────────────────────── */

export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';

export interface UploadedFile {
  name: string;
  size: number;
}

export interface StudentKP {
  nim: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  field: string; // bidang usaha
  companyAddress: string;
  city: string;
  companyContact: string;
  fieldSupervisor: string; // pembimbing lapangan

  // ─── Pendaftaran ───
  regStatus: ReviewStatus;
  regData: Record<string, string>;
  regFiles: Record<string, UploadedFile>;
  regSubmittedAt: string;
  regNote?: string;

  // ─── Pembimbing ───
  mainSupervisor?: { id: string; name: string; nidn: string };

  // ─── Penyelesaian Tahap 1 ───
  c1Status?: ReviewStatus;
  c1Data?: Record<string, string>;
  c1Files?: Record<string, UploadedFile>;
  c1SubmittedAt?: string;
  c1Note?: string;

  // ─── Penyelesaian Tahap 2 ───
  c2Status?: ReviewStatus;
  c2Data?: Record<string, string>;
  c2Files?: Record<string, UploadedFile>;
  c2SubmittedAt?: string;

  // ─── Perpanjangan ───
  extStatus?: ReviewStatus;
  extData?: Record<string, string>;
  extFiles?: Record<string, UploadedFile>;
  extSubmittedAt?: string;
  extNote?: string;
}

export interface StaffStats {
  pendingRegistration: number;
  pendingCompletion: number;
  pendingExtension: number;
  completedKP: number;
}

export interface Snapshot {
  staff: { name: string; email: string };
  students: StudentKP[];
  stats: StaffStats;
}

/* ───────────────────────── Mock data ───────────────────────── */

const STUDENTS: StudentKP[] = [
  {
    nim: '2210001',
    name: 'Budi Santoso',
    email: 'budi@student.widyatama.ac.id',
    phone: '081234567890',
    company: 'PT Teknologi Nusantara',
    field: 'Pengembangan Perangkat Lunak',
    companyAddress: 'Jl. Soekarno Hatta No. 450, Bandung',
    city: 'Bandung',
    companyContact: 'hrd@teknusantara.co.id',
    fieldSupervisor: 'Bapak Andi Pratama, S.T.',
    regStatus: 'PENDING',
    regData: {
      alamat: 'Jl. Dipatiukur No. 112, Bandung',
      tempatLahir: 'Bandung',
      tanggalLahir: '2003-05-12',
      ipk: '3.45',
      judul: 'Sistem Informasi Manajemen Inventori Berbasis Web',
    },
    regFiles: {
      transkrip: { name: 'transkrip-budi.pdf', size: 2456789 },
      krs: { name: 'krs-semester.pdf', size: 189012 },
      bayar: { name: 'bukti-bayar.pdf', size: 234567 },
    },
    regSubmittedAt: '2026-10-01T08:30:00.000Z',
  },
  {
    nim: '2210002',
    name: 'Siti Nurhaliza',
    email: 'siti@student.widyatama.ac.id',
    phone: '081234567891',
    company: 'CV Digital Kreatif',
    field: 'Desain & Multimedia',
    companyAddress: 'Jl. Sukajadi No. 45, Bandung',
    city: 'Bandung',
    companyContact: '081234567000',
    fieldSupervisor: 'Ibu Rina Marlina',
    regStatus: 'APPROVED',
    regData: {
      alamat: 'Jl. Sukajadi No. 45, Bandung',
      tempatLahir: 'Cimahi',
      tanggalLahir: '2003-03-20',
      ipk: '3.72',
      judul: 'Pengembangan Media Pembelajaran Interaktif',
    },
    regFiles: {},
    regSubmittedAt: '2026-09-28T10:15:00.000Z',
    mainSupervisor: { id: 'd1', name: 'Dr. Ratna Wulandari, S.T., M.T.', nidn: '0411038201' },
    c1Status: 'PENDING',
    c1Data: {
      laporan: 'laporan-kp-siti.pdf',
      kartu: 'kartu-bimbingan.pdf',
      kuesioner: 'kuesioner.pdf',
    },
    c1Files: {
      laporan: { name: 'laporan-kp-siti.pdf', size: 5678901 },
      kartu: { name: 'kartu-bimbingan.pdf', size: 345678 },
      kuesioner: { name: 'kuesioner.pdf', size: 456789 },
    },
    c1SubmittedAt: '2026-10-02T09:00:00.000Z',
  },
  {
    nim: '2210003',
    name: 'Andi Wijaya',
    email: 'andi@student.widyatama.ac.id',
    phone: '081234567892',
    company: 'PT Bank Mandiri',
    field: 'Perbankan',
    companyAddress: 'Jl. Asia Afrika No. 118, Bandung',
    city: 'Bandung',
    companyContact: 'hrd@bankmandiri.co.id',
    fieldSupervisor: 'Bapak Surya Wijaya',
    regStatus: 'APPROVED',
    regData: {
      alamat: 'Jl. Pasteur No. 20, Bandung',
      ipk: '3.55',
      judul: 'Analisis Sistem Keamanan Transaksi Perbankan Digital',
    },
    regFiles: {},
    regSubmittedAt: '2026-09-25T14:00:00.000Z',
    mainSupervisor: { id: 'd2', name: 'Ir. Hendra Gunawan, M.Kom.', nidn: '0415067502' },
    c1Status: 'APPROVED',
    c1Data: {},
    c1Files: {},
    c1SubmittedAt: '2026-09-30T13:00:00.000Z',
    c2Status: 'COMPLETED',
    c2Data: {},
    c2Files: {
      final: { name: 'laporan-final-andi.pdf', size: 8901234 },
      perpus: { name: 'tanda-terima-perpus.pdf', size: 234567 },
    },
    c2SubmittedAt: '2026-10-05T08:00:00.000Z',
  },
  {
    nim: '2210004',
    name: 'Dewi Lestari',
    email: 'dewi@student.widyatama.ac.id',
    phone: '081234567893',
    company: 'RSUD Kota Bandung',
    field: 'Kesehatan',
    companyAddress: 'Jl. Rumah Sakit No. 22, Bandung',
    city: 'Bandung',
    companyContact: 'info@rsudbandung.go.id',
    fieldSupervisor: 'Ibu Kartika Sari, S.Kep.',
    regStatus: 'APPROVED',
    regData: {
      alamat: 'Jl. Setiabudi No. 100, Bandung',
      ipk: '3.80',
      judul: 'Sistem Rekam Medis Elektronik di RSUD',
    },
    regFiles: {},
    regSubmittedAt: '2026-09-20T11:30:00.000Z',
    mainSupervisor: { id: 'd3', name: 'Dr. Agus Prasetyo, S.Kom., M.Sc.', nidn: '0421098003' },
    extStatus: 'PENDING',
    extData: {
      alasan: 'Data penelitian belum lengkap, perlu waktu tambahan untuk pengumpulan data di lapangan.',
      durasi: '2',
    },
    extFiles: {
      bukti: { name: 'kartu-bimbingan.pdf', size: 345678 },
    },
    extSubmittedAt: '2026-10-03T14:00:00.000Z',
  },
  {
    nim: '2210005',
    name: 'Rudi Hartono',
    email: 'rudi@student.widyatama.ac.id',
    phone: '081234567894',
    company: 'PT Telkom Indonesia',
    field: 'Telekomunikasi',
    companyAddress: 'Jl. Japati No. 1, Bandung',
    city: 'Bandung',
    companyContact: 'hrd@telkom.co.id',
    fieldSupervisor: 'Bapak Hendra Wijaya, S.T.',
    regStatus: 'APPROVED',
    regData: {
      alamat: 'Jl. Buah Batu No. 50, Bandung',
      ipk: '3.60',
      judul: 'Optimasi Jaringan Fiber Optik di Area Bandung',
    },
    regFiles: {},
    regSubmittedAt: '2026-09-15T09:00:00.000Z',
    mainSupervisor: { id: 'd4', name: 'Siti Nurhaliza, S.T., M.Cs.', nidn: '0403128804' },
    c1Status: 'REJECTED',
    c1Data: {},
    c1Files: {},
    c1SubmittedAt: '2026-09-28T10:00:00.000Z',
    c1Note: 'Scan kartu bimbingan kurang jelas, mohon diunggah ulang.',
  },
];

/* ───────────────────────── Helpers ───────────────────────── */

const delay = (ms = 400) => new Promise<void>((r) => setTimeout(r, ms));
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

function computeStats(students: StudentKP[]): StaffStats {
  return {
    pendingRegistration: students.filter((s) => s.regStatus === 'PENDING').length,
    pendingCompletion: students.filter(
      (s) => s.c1Status === 'PENDING' || (s.c2Status && s.c2Status !== 'COMPLETED'),
    ).length,
    pendingExtension: students.filter((s) => s.extStatus === 'PENDING').length,
    completedKP: students.filter((s) => s.c2Status === 'COMPLETED').length,
  };
}

/* ───────────────────────── API ───────────────────────── */

export const kpStaffApi = {
  async getSnapshot(): Promise<Snapshot> {
    await delay(350);
    return clone({
      staff: { name: 'Siti Rahma, S.Kom.', email: 'staff@widyatama.ac.id' },
      students: STUDENTS,
      stats: computeStats(STUDENTS),
    });
  },

  /* ─── Verifikasi Pendaftaran ─── */
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

  /* ─── Verifikasi Penyelesaian Tahap 1 ─── */
  async approveC1(nim: string) {
    await delay();
    const s = STUDENTS.find((x) => x.nim === nim);
    if (s) s.c1Status = 'APPROVED';
  },

  async rejectC1(nim: string, note: string) {
    await delay();
    const s = STUDENTS.find((x) => x.nim === nim);
    if (s) {
      s.c1Status = 'REJECTED';
      s.c1Note = note;
    }
  },

  /* ─── Verifikasi Penyelesaian Tahap 2 ─── */
  async approveC2(nim: string) {
    await delay();
    const s = STUDENTS.find((x) => x.nim === nim);
    if (s) s.c2Status = 'COMPLETED';
  },

  /* ─── Konfirmasi Perpanjangan ─── */
  async approveExtension(nim: string) {
    await delay();
    const s = STUDENTS.find((x) => x.nim === nim);
    if (s) s.extStatus = 'APPROVED';
  },

  async rejectExtension(nim: string, note: string) {
    await delay();
    const s = STUDENTS.find((x) => x.nim === nim);
    if (s) {
      s.extStatus = 'REJECTED';
      s.extNote = note;
    }
  },
};

/* ───────────────────────── Dev helpers ─────────────────────────
 * Simulasi aksi Mahasiswa dari console browser:
 *   __kpStaff.reset()
 */
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__kpStaff = {
    reset() {
      STUDENTS[0].regStatus = 'PENDING';
      STUDENTS[1].c1Status = 'PENDING';
      STUDENTS[3].extStatus = 'PENDING';
      STUDENTS[4].c1Status = 'REJECTED';
    },
  };
}