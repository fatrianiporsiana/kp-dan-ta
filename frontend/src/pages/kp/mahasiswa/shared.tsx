import { useCallback, useEffect, useState } from 'react';
import { Card, btnCls } from '../../../components/ui';
import { kpApi, type Snapshot, type ReviewStatus } from './api';

export type Form = Record<string, string>;
export type F = [string, string, string?][];

/* ───────────── Path helper ───────────── */
export const KP_BASE = '/kp/mahasiswa';
export const kpPath = (sub = '') => (sub ? `${KP_BASE}/${sub}` : KP_BASE);

/* ───────────── useSnapshot (pola sama dengan TA) ───────────── */
export function useSnapshot() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setError(null);
      setData(await kpApi.getSnapshot());
    } catch {
      setError('Data tidak dapat dimuat.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, error, reload };
}

/* ───────────── Progres helper ───────────── */
export const KP_STAGES = ['Pendaftaran', 'Bimbingan', 'Penyelesaian'];

export function computeStage(s: Snapshot): number {
  if (s.c2.status === 'COMPLETED') return 3;
  if (s.c1.status === 'APPROVED') return 2;
  if (s.reg.status === 'APPROVED') return 1;
  return 0;
}

/* ───────────── Label & Badge ───────────── */
export const LABELS: Record<ReviewStatus, string> = {
  NONE: 'Belum ada',
  PENDING: 'Menunggu verifikasi',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
  COMPLETED: 'Selesai',
};

/* ───────────── Template KP ───────────── */
export const TemplateKP = ({ className = '' }: { className?: string }) => (
  <Card className={className}>
    <h3 className="font-bold mb-3">Template KP</h3>
    <div className="flex flex-wrap gap-2">
      <a className={btnCls('primary')} href="/templates/kuesioner-kp.docx" download>
        Template Kuesioner KP
      </a>
      <a className={btnCls('primary')} href="/templates/laporan-kp.docx" download>
        Template Laporan KP
      </a>
    </div>
  </Card>
);