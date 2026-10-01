import { useState } from 'react';
import { CalendarClock, Send, AlertCircle } from 'lucide-react';
import { Card, Btn, Field, FileField, Badge } from '../../../components/ui';
import { kpApi } from './api';
import { Form, useSnapshot } from './shared'; 

export function Extension() {
  const { data: db, loading, reload } = useSnapshot();
  const [f, setF] = useState<Form>({});
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading || !db) return <Card><p>Memuat…</p></Card>;

  const e = db.ext;

  const send = async () => {
    if (!f.alasan || !f.durasi || !f.bukti) return setErr('Lengkapi alasan, durasi, dan bukti pendukung.');
    setErr('');
    setSubmitting(true);
    try {
      await kpApi.submitExtension(f);
      setF({});
      await reload();
    } catch {
      setErr('Gagal mengirim.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <div className="flex items-center gap-3 mb-4">
        <span className="bg-primary-50 text-primary-700 rounded-lg p-2">
          <CalendarClock className="w-6 h-6" />
        </span>
        <h2 className="font-bold text-lg text-primary-900">Perpanjangan Kerja Praktek</h2>
      </div>

      {e.status !== 'NONE' && (
        <p className="mb-3 text-sm">
          Status: <Badge s={e.status} />{' '}
          {e.note && <span className="text-red-600"> Catatan: {e.note}</span>}
        </p>
      )}

      {(e.status === 'NONE' || e.status === 'REJECTED') && (
        <div className="space-y-3">
          <label className="block text-sm font-medium">
            Alasan Perpanjangan
            <textarea
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={f.alasan || ''}
              onChange={(x) => setF({ ...f, alasan: x.target.value })}
            />
          </label>
          <Field label="Durasi Perpanjangan (bulan)" type="number" min={1} value={f.durasi || ''} onChange={(x) => setF({ ...f, durasi: x.target.value })} />
          <FileField label="Bukti Pendukung (PDF)" max={2} value={f.bukti} onChange={(n) => setF({ ...f, bukti: n })} />
          {err && (
            <p className="text-sm text-red-600 inline-flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />{err}
            </p>
          )}
          <Btn onClick={send} loading={submitting}>
            <Send className="inline w-4 h-4 -mt-0.5 mr-1.5" />Kirim Pengajuan
          </Btn>
        </div>
      )}
    </Card>
  );
}