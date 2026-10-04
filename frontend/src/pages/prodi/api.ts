/**
 * Layer data modul Prodi (Kaprodi + Sekprodi).
 */

export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type Track = 'SKRIPSI' | 'JURNAL';
export type Regular = 'A' | 'B';

export interface Lecturer {
  id: string;
  name: string;
  nidn: string;
}

export interface RekapTA {
  nim: string;
  name: string;
  track: Track;
  regular: Regular;
  title: string;
  mainSupervisor?: Lecturer;
  coSupervisor?: Lecturer;
  stage: 'PENDAFTARAN' | 'BIMBINGAN' | 'SIDANG' | 'REVISI' | 'SELESAI';
  finalScore?: number;
  grade?: 'A' | 'A-' | 'B+' | 'B' | 'C+' | 'C' | '-';
  submittedAt: string;
}

export interface RekapKP {
  nim: string;
  name: string;
  company: string;
  field: string;
  supervisor?: Lecturer;
  fieldSupervisor?: string;
  stage: 'PENDAFTARAN' | 'BIMBINGAN' | 'PENYELESAIAN' | 'SELESAI';
  finalScore?: number;
  grade?: 'A' | 'A-' | 'B+' | 'B' | 'C+' | 'C' | '-';
  submittedAt: string;
}

export interface Stats {
  totalTA: number;
  taSelesai: number;
  taBerjalan: number;
  totalKP: number;
  kpSelesai: number;
  kpBerjalan: number;
}

export interface Snapshot {
  user: { name: string; email: string; isKaprodi: boolean; isSekprodi: boolean };
  stats: Stats;
  rekapTA: RekapTA[];
  rekapKP: RekapKP[];
}

const LECTURERS: Lecturer[] = [
  { id: 'd1', name: 'Dr. Ratna Wulandari, S.T., M.T.', nidn: '0411038201' },
  { id: 'd2', name: 'Ir. Hendra Gunawan, M.Kom.', nidn: '0415067502' },
  { id: 'd3', name: 'Dr. Agus Prasetyo, S.Kom., M.Sc.', nidn: '0421098003' },
  { id: 'd4', name: 'Siti Nurhaliza, S.T., M.Cs.', nidn: '0403128804' },
  { id: 'd5', name: 'Prof. Dedi Kurniawan, Ph.D.', nidn: '0409077005' },
];

const byId = (id: string) => LECTURERS.find((l) => l.id === id);

const REKAP_TA: RekapTA[] = [
  { nim: '2210001', name: 'Budi Santoso', track: 'SKRIPSI', regular: 'A', title: 'Sistem Rekomendasi Wisata Berbasis Machine Learning', mainSupervisor: byId('d1'), coSupervisor: byId('d3'), stage: 'SELESAI', finalScore: 88, grade: 'A', submittedAt: '2026-08-15T10:00:00.000Z' },
  { nim: '2210002', name: 'Siti Nurhaliza', track: 'JURNAL', regular: 'B', title: 'Analisis Sentimen Media Sosial dengan Deep Learning', mainSupervisor: byId('d2'), coSupervisor: byId('d4'), stage: 'SIDANG', submittedAt: '2026-09-10T09:00:00.000Z' },
  { nim: '2210003', name: 'Andi Wijaya', track: 'SKRIPSI', regular: 'A', title: 'Pengembangan Aplikasi Mobile untuk Monitoring Kesehatan', mainSupervisor: byId('d1'), coSupervisor: byId('d5'), stage: 'REVISI', submittedAt: '2026-09-20T11:30:00.000Z' },
  { nim: '2210004', name: 'Dewi Lestari', track: 'SKRIPSI', regular: 'A', title: 'Deteksi Anomali Jaringan Menggunakan Algoritma Random Forest', mainSupervisor: byId('d3'), coSupervisor: byId('d4'), stage: 'BIMBINGAN', submittedAt: '2026-09-25T14:00:00.000Z' },
  { nim: '2210005', name: 'Rudi Hartono', track: 'SKRIPSI', regular: 'A', title: 'Sistem Pakar Diagnosa Penyakit Menggunakan Certainty Factor', mainSupervisor: byId('d1'), coSupervisor: byId('d4'), stage: 'SELESAI', finalScore: 85, grade: 'A', submittedAt: '2026-09-15T09:00:00.000Z' },
  { nim: '2210006', name: 'Maya Sari', track: 'JURNAL', regular: 'A', title: 'Optimalisasi Query Database dengan Indexing', mainSupervisor: byId('d5'), coSupervisor: byId('d2'), stage: 'PENDAFTARAN', submittedAt: '2026-10-01T08:00:00.000Z' },
];

const REKAP_KP: RekapKP[] = [
  { nim: '2210001', name: 'Budi Santoso', company: 'PT Teknologi Nusantara', field: 'Pengembangan Perangkat Lunak', supervisor: byId('d1'), fieldSupervisor: 'Bapak Andi Pratama, S.T.', stage: 'SELESAI', finalScore: 87, grade: 'A', submittedAt: '2026-07-10T10:00:00.000Z' },
  { nim: '2210002', name: 'Siti Nurhaliza', company: 'CV Digital Kreatif', field: 'Desain & Multimedia', supervisor: byId('d2'), fieldSupervisor: 'Ibu Rina Marlina', stage: 'PENYELESAIAN', submittedAt: '2026-09-15T09:00:00.000Z' },
  { nim: '2210003', name: 'Andi Wijaya', company: 'PT Bank Mandiri', field: 'Perbankan', supervisor: byId('d3'), fieldSupervisor: 'Bapak Surya Wijaya', stage: 'SELESAI', finalScore: 90, grade: 'A', submittedAt: '2026-08-20T14:00:00.000Z' },
  { nim: '2210004', name: 'Dewi Lestari', company: 'RSUD Kota Bandung', field: 'Kesehatan', supervisor: byId('d4'), fieldSupervisor: 'Ibu Kartika Sari, S.Kep.', stage: 'BIMBINGAN', submittedAt: '2026-09-25T11:00:00.000Z' },
];

const delay = (ms = 400) => new Promise<void>((r) => setTimeout(r, ms));
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

function computeStats(): Stats {
  const taSelesai = REKAP_TA.filter((r) => r.stage === 'SELESAI').length;
  const kpSelesai = REKAP_KP.filter((r) => r.stage === 'SELESAI').length;
  return {
    totalTA: REKAP_TA.length,
    taSelesai,
    taBerjalan: REKAP_TA.length - taSelesai,
    totalKP: REKAP_KP.length,
    kpSelesai,
    kpBerjalan: REKAP_KP.length - kpSelesai,
  };
}

export const prodiApi = {
  async getSnapshot(): Promise<Snapshot> {
    await delay(350);
    return clone({
      user: {
        name: 'Dr. Andi Wijaya, M.T.',
        email: 'kaprodi@widyatama.ac.id',
        isKaprodi: true,
        isSekprodi: false,
      },
      stats: computeStats(),
      rekapTA: REKAP_TA,
      rekapKP: REKAP_KP,
    });
  },
};