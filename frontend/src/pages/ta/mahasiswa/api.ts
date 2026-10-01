/**
 * Layer data modul Tugas Akhir (role Mahasiswa).
 * Saat ini pakai in-memory mock. Ganti isi fungsi `taApi.*` dengan
 * pemanggilan backend (fetch + FormData) tanpa mengubah signature.
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

export interface StudentProfile {
  name: string;
  npm: string;
}

export interface UploadedFile {
  name: string;
  size: number;
}

export interface RegistrationInput {
  track: Track;
  regular: Regular;
  address: string;
  birthPlace: string;
  birthDate: string;
  phone: string;
  email: string;
  title: string;
  proposedSupervisors: [string, string];
  gpa: string;
  toeflScore: string;
}

export interface Registration extends RegistrationInput {
  files: Record<string, UploadedFile>;
  status: ReviewStatus;
  staffNote?: string;
  submittedAt: string;
  mainSupervisor?: Lecturer;
  coSupervisor?: Lecturer;
  templateFile?: UploadedFile;
}

export interface Extension {
  id: string;
  reason: string;
  months: number;
  file: UploadedFile;
  status: ReviewStatus;
  note?: string;
  submittedAt: string;
}

export interface DefenseData {
  address: string;
  birthPlace: string;
  birthDate: string;
  phone: string;
  email: string;
  title: string;
  gpa: string;
  toeflScore: string;
}

export interface Defense {
  data: DefenseData;
  files: Record<string, UploadedFile>;
  status: ReviewStatus;
  staffNote?: string;
  submittedAt: string;
  examiners: Lecturer[];
  schedule?: { date: string; time: string; room: string };
}

export interface RevisionNote {
  id: string;
  from: 'PEMBIMBING' | 'PENGUJI';
  author: string;
  text: string;
  at: string;
}

export interface Revision {
  notes: RevisionNote[];
  file?: UploadedFile;
  submittedAt?: string;
}

export interface CompletionStage1 {
  files: Record<string, UploadedFile>;
  status: ReviewStatus;
  note?: string;
  submittedAt: string;
}

export interface CompletionStage2 {
  files: Record<string, UploadedFile>;
  submittedAt: string;
}

export interface Completion {
  stage1?: CompletionStage1;
  stage2?: CompletionStage2;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  at: string;
}

export interface Snapshot {
  profile: StudentProfile;
  registration?: Registration;
  extensions: Extension[];
  defense?: Defense;
  revision: Revision;
  completion: Completion;
  announcements: Announcement[];
}

/* ───────────────────────── Konstanta ───────────────────────── */

export const PORTAL_AKADEMIK_URL = 'https://portal.widyatama.ac.id';

export const TA_TEMPLATES: Record<Track, { label: string; url: string }> = {
  SKRIPSI: {
    label: 'Bimbingan TA & Penyusunan TA',
    url: '/templates/ta/bimbingan-ta-penyusunan-ta.docx',
  },
  JURNAL: {
    label: 'Permohonan Izin Bimbingan Jurnal',
    url: '/templates/ta/permohonan-izin-bimbingan-jurnal.docx',
  },
};

/* ───────────────────────── Mock store ───────────────────────── */

const LECTURERS: Lecturer[] = [
  { id: 'd1', name: 'Dr. Ratna Wulandari, S.T., M.T.', nidn: '0411038201' },
  { id: 'd2', name: 'Ir. Hendra Gunawan, M.Kom.', nidn: '0415067502' },
  { id: 'd3', name: 'Dr. Agus Prasetyo, S.Kom., M.Sc.', nidn: '0421098003' },
  { id: 'd4', name: 'Siti Nurhaliza, S.T., M.Cs.', nidn: '0403128804' },
  { id: 'd5', name: 'Prof. Dedi Kurniawan, Ph.D.', nidn: '0409077005' },
  { id: 'd6', name: 'Maya Anggraini, S.Kom., M.T.', nidn: '0417098906' },
];

const db: Snapshot = {
  profile: { name: 'Budi Santoso', npm: '0620210012' },
  extensions: [],
  revision: { notes: [] },
  completion: {},
  announcements: [
    {
      id: 'a1',
      title: 'Batas pendaftaran sidang periode Desember',
      body: 'Dokumen sidang diterima paling lambat 15 Desember 2026 pukul 16.00 WIB.',
      at: '2026-09-28',
    },
    {
      id: 'a2',
      title: 'Template Poster A4 diperbarui',
      body: 'Gunakan template terbaru untuk poster pasca sidang jalur Skripsi.',
      at: '2026-09-20',
    },
  ],
};

const delay = (ms = 500) => new Promise<void>((r) => setTimeout(r, ms));
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const now = () => new Date().toISOString();
const meta = (f: File): UploadedFile => ({ name: f.name, size: f.size });
const metaMap = (files: Record<string, File>) =>
  Object.fromEntries(Object.entries(files).map(([k, f]) => [k, meta(f)]));
const byId = (id: string) => LECTURERS.find((l) => l.id === id);

/* ───────────────────────── API ───────────────────────── */

export const taApi = {
  async getSnapshot(): Promise<Snapshot> {
    await delay(350);
    return clone(db);
  },

  async getLecturers(): Promise<Lecturer[]> {
    await delay(150);
    return clone(LECTURERS);
  },

  async submitRegistration(input: RegistrationInput, files: Record<string, File>) {
    await delay();
    db.registration = {
      ...input,
      files: metaMap(files),
      status: 'PENDING',
      submittedAt: now(),
    };
  },

  async uploadRegistrationTemplate(file: File) {
    await delay();
    if (db.registration) db.registration.templateFile = meta(file);
  },

  async submitExtension(input: { reason: string; months: number }, file: File) {
    await delay();
    db.extensions.unshift({
      id: `ext-${Date.now()}`,
      ...input,
      file: meta(file),
      status: 'PENDING',
      submittedAt: now(),
    });
  },

  async submitDefense(data: DefenseData, files: Record<string, File>) {
    await delay();
    db.defense = {
      data,
      files: metaMap(files),
      status: 'PENDING',
      submittedAt: now(),
      examiners: [],
    };
  },

  async submitRevision(file: File) {
    await delay();
    db.revision.file = meta(file);
    db.revision.submittedAt = now();
  },

  async submitCompletionStage1(files: Record<string, File>) {
    await delay();
    db.completion.stage1 = {
      files: metaMap(files),
      status: 'PENDING',
      submittedAt: now(),
    };
  },

  async submitCompletionStage2(files: Record<string, File>) {
    await delay();
    db.completion.stage2 = { files: metaMap(files), submittedAt: now() };
  },
};

/* ───────────────────────── Dev helpers ───────────────────────── */

declare const process: { env: { NODE_ENV?: string } };

if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__ta = {
    approveRegistration() {
      if (!db.registration) return;
      db.registration.status = 'APPROVED';
      db.registration.mainSupervisor = byId(db.registration.proposedSupervisors[0]);
      db.registration.coSupervisor = byId(db.registration.proposedSupervisors[1]);
    },
    rejectRegistration(note = 'Dokumen belum lengkap.') {
      if (!db.registration) return;
      db.registration.status = 'REJECTED';
      db.registration.staffNote = note;
    },
    approveDefenseDocs() {
      if (db.defense) db.defense.status = 'APPROVED';
    },
    rejectDefenseDocs(note = 'Scan akte kelahiran tidak terbaca.') {
      if (!db.defense) return;
      db.defense.status = 'REJECTED';
      db.defense.staffNote = note;
    },
    scheduleDefense() {
      if (!db.defense) return;
      db.defense.examiners = [LECTURERS[2], LECTURERS[4]];
      db.defense.schedule = { date: '2026-12-18', time: '09:00', room: 'Ruang Sidang 2.3' };
    },
    addRevisionNote(from: 'PEMBIMBING' | 'PENGUJI' = 'PENGUJI') {
      db.revision.notes.push({
        id: `n-${Date.now()}`,
        from,
        author: from === 'PENGUJI' ? LECTURERS[2].name : LECTURERS[0].name,
        text: 'Perjelas rumusan masalah pada Bab 1 dan tambahkan pembahasan keterbatasan penelitian.',
        at: now(),
      });
    },
    approveExtension() {
      if (db.extensions[0]) db.extensions[0].status = 'APPROVED';
    },
    rejectExtension(note = 'Kartu bimbingan belum ditandatangani.') {
      if (!db.extensions[0]) return;
      db.extensions[0].status = 'REJECTED';
      db.extensions[0].note = note;
    },
    approveStage1() {
      if (db.completion.stage1) db.completion.stage1.status = 'APPROVED';
    },
    rejectStage1(note = 'Berkas belum sesuai ketentuan.') {
      if (!db.completion.stage1) return;
      db.completion.stage1.status = 'REJECTED';
      db.completion.stage1.note = note;
    },
  };
}