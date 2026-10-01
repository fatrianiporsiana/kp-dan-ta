import { Check, TrendingUp } from 'lucide-react';
import { useAuth } from '../../../Auth';
import { Card } from '../../../components/ui';
import { TemplateKP, KP_STAGES, computeStage, useSnapshot } from './shared';

export function Dashboard() {
  const { user } = useAuth();
  const { data, loading } = useSnapshot();

  if (loading || !data) {
    return <Card><p className="text-sm text-slate-500">Memuat data…</p></Card>;
  }

  const d = data.reg.data || {};
  const cur = computeStage(data);

  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
      <Card className="lg:col-span-2">
        <h2 className="text-xl font-bold">Halo, {user?.name}!</h2>
        <p className="text-sm text-slate-500">{user?.nim}</p>
      </Card>

      <Card>
        <div className="flex justify-between text-sm mb-5">
          <h3 className="font-bold text-primary-700 inline-flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4" />Progres Kerja Praktek
          </h3>
          <span className="text-slate-500 text-xs">
            Tahap {Math.min(cur + 1, 3)} dari 3
          </span>
        </div>
        <div className="relative">
          <div className="absolute top-[18px] left-[16.6%] right-[16.6%] h-0.5 bg-primary-100" />
          <ol className="relative flex">
            {KP_STAGES.map((s, i) => {
              const done = i < cur;
              const act = i === cur;
              return (
                <li key={s} className="flex-1 text-center">
                  <div
                    className={`mx-auto w-9 h-9 rounded-full grid place-items-center text-sm font-bold text-white ${
                      done ? 'bg-primary-700' : act ? 'bg-accent-500 ring-4 ring-accent-50' : 'bg-primary-100 !text-primary-700'
                    }`}
                  >
                    {done ? <Check className="w-5 h-5" /> : i + 1}
                  </div>
                  <p className="mt-2 text-xs sm:text-sm">{s}</p>
                  <p className={`text-[11px] ${done ? 'text-primary-700' : act ? 'text-accent-600' : 'text-slate-400'}`}>
                    {done ? 'Selesai' : act ? 'Sedang Berjalan' : 'Menunggu'}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      </Card>

      <Card>
        <div className="flex justify-between text-sm mb-3">
          <h3 className="font-bold">Pembimbing Kerja Praktek</h3>
          <span className="text-slate-500 text-xs">2 Pembimbing</span>
        </div>
        <div className="space-y-3">
          <div className="rounded-xl bg-primary-50 p-3">
            <p className="text-xs text-accent-600 font-semibold">Dosen Pembimbing</p>
            <p className="font-bold text-sm">
              {data.reg.status === 'APPROVED' ? d.dosen : 'Menunggu penetapan'}
            </p>
            <p className="text-xs text-slate-500">NIDN: -</p>
          </div>
          <div className="rounded-xl bg-primary-50 p-3">
            <p className="text-xs text-accent-600 font-semibold">Pembimbing Lapangan</p>
            <p className="font-bold text-sm">{d.lapangan || '-'}</p>
          </div>
        </div>
      </Card>

      {data.reg.status === 'APPROVED' && <TemplateKP className="lg:col-span-2" />}

      <Card className="lg:col-span-2">
        <h3 className="font-bold mb-2">Pengumuman Prodi</h3>
        {data.announcements.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada pengumuman terbaru.</p>
        ) : (
          <ul className="space-y-3">
            {data.announcements.map((a) => (
              <li key={a.id}>
                <p className="text-sm font-medium">{a.title}</p>
                <p className="text-sm text-slate-600">{a.body}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}