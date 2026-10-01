export type ReviewStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';

export interface UploadedFile {
  name: string;
  size: number;
}

export interface Registration {
  status: ReviewStatus;
  data: Record<string, string>;
  note?: string;
  submittedAt?: string;
}

export interface CompletionStage {
  status: ReviewStatus;
  data: Record<string, string>;
  note?: string;
  submittedAt?: string;
}

export interface Extension {
  status: ReviewStatus;
  data: Record<string, string>;
  note?: string;
  submittedAt?: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  at: string;
}

export interface Snapshot {
  /** Status pendaftaran KP */
  reg: Registration;
  c1: CompletionStage;
  c2: CompletionStage;
  ext: Extension;
  announcements: Announcement[];
}

/* Mock store */

const db: Snapshot = {
  reg: { status: 'NONE', data: {} },
  c1: { status: 'NONE', data: {} },
  c2: { status: 'NONE', data: {} },
  ext: { status: 'NONE', data: {} },
  announcements: [
    {
      id: 'kp-a1',
      title: 'Batas pengumpulan laporan KP',
      body: 'Laporan KP hardcover diterima paling lambat 20 Desember 2026.',
      at: '2026-09-28',
    },
  ],
};

const delay = (ms = 400) => new Promise<void>((r) => setTimeout(r, ms));
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const now = () => new Date().toISOString();

/* API */

export const kpApi = {
  async getSnapshot(): Promise<Snapshot> {
    await delay(350);
    return clone(db);
  },

  async submitRegistration(data: Record<string, string>) {
    await delay();
    db.reg = { status: 'PENDING', data, submittedAt: now() };
  },

  async submitCompletionStage1(data: Record<string, string>) {
    await delay();
    db.c1 = { status: 'PENDING', data, submittedAt: now() };
  },

  async submitCompletionStage2(data: Record<string, string>) {
    await delay();
    db.c2 = { status: 'COMPLETED', data, submittedAt: now() };
  },

  async submitExtension(data: Record<string, string>) {
    await delay();
    db.ext = { status: 'PENDING', data, submittedAt: now() };
  },
};

/* Dev helpers */
if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__kp = {
    approveRegistration() {
      db.reg.status = 'APPROVED';
    },
    rejectRegistration(note = 'Dokumen belum lengkap.') {
      db.reg.status = 'REJECTED';
      db.reg.note = note;
    },
    approveStage1() {
      db.c1.status = 'APPROVED';
    },
    rejectStage1(note = 'Berkas belum sesuai ketentuan.') {
      db.c1.status = 'REJECTED';
      db.c1.note = note;
    },
    approveExtension() {
      db.ext.status = 'APPROVED';
    },
    rejectExtension(note = 'Bukti pendukung tidak valid.') {
      db.ext.status = 'REJECTED';
      db.ext.note = note;
    },
    reset() {
      db.reg = { status: 'NONE', data: {} };
      db.c1 = { status: 'NONE', data: {} };
      db.c2 = { status: 'NONE', data: {} };
      db.ext = { status: 'NONE', data: {} };
    },
  };
}