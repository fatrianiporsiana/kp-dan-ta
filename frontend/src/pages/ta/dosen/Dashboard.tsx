import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Users,
  ClipboardCheck,
  CalendarCheck,
  FileCheck2,
} from 'lucide-react';
import {
  Alert,
  Card,
  LoadError,
  Page,
  PageHeader,
  PageLoader,
  StageBadge,
  taDosenPath,
  useSnapshot,
} from './shared';

export default function Dashboard() {
  const { data, loading, error, reload } = useSnapshot();

  if (loading) return <PageLoader />;
  if (error || !data)
    return (
      <Page>
        <LoadError message={error ?? 'Data kosong.'} onRetry={reload} />
      </Page>
    );

  const { dosen, stats, advisees, examinees } = data;

  const cards: {
    label: string;
    value: number;
    icon: React.ElementType;
    to: string;
    tone: string;
    show: boolean;
  }[] = [
    {
      label: 'Mahasiswa bimbingan',
      value: stats.totalAdvisees,
      icon: Users,
      to: taDosenPath('bimbingan'),
      tone: 'blue',
      show: dosen.isPembimbing,
    },
    {
      label: 'Sidang mahasiswa bimbingan',
      value: stats.pendingDefense,
      icon: ClipboardCheck,
      to: taDosenPath('bimbingan'),
      tone: 'orange',
      show: dosen.isPembimbing,
    },
    {
      label: 'Sidang diuji',
      value: stats.totalExaminees,
      icon: CalendarCheck,
      to: taDosenPath('jadwal-menguji'),
      tone: 'blue',
      show: dosen.isPenguji,
    },
    {
      label: 'BAP belum diisi',
      value: stats.pendingBAP,
      icon: FileCheck2,
      to: taDosenPath('bap-sidang'),
      tone: 'orange',
      show: dosen.isPenguji,
    },
  ].filter((c) => c.show);

  const toneCls: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-800 ring-blue-100',
    orange: 'bg-orange-50 text-orange-700 ring-orange-100',
  };

  return (
    <Page>
      <PageHeader
        title="Dashboard Dosen"
        subtitle={`Selamat datang, ${dosen.name}. Berikut ringkasan aktivitas Tugas Akhir Anda.`}
      />

      <div className="space-y-5">
        <Alert tone="info" title={`Halo, ${dosen.name}!`}>
          {dosen.isPembimbing && dosen.isPenguji
            ? 'Anda terdaftar sebagai Dosen Pembimbing dan Dosen Penguji TA.'
            : dosen.isPembimbing
            ? 'Anda terdaftar sebagai Dosen Pembimbing TA.'
            : 'Anda terdaftar sebagai Dosen Penguji TA.'}
        </Alert>

        {/* ─── Statistik ─── */}
        <div className={`grid gap-4 sm:grid-cols-2 ${cards.length <= 2 ? 'lg:grid-cols-2' : 'lg:grid-cols-4'}`}>
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.label}
                to={c.to}
                className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ring-1 ring-inset ${toneCls[c.tone]}`}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-orange-500" />
                </div>
                <p className="mt-3 text-3xl font-bold text-slate-900">{c.value}</p>
                <p className="mt-0.5 text-sm text-slate-600">{c.label}</p>
              </Link>
            );
          })}
        </div>

        {/* ─── Ringkasan Bimbingan ─── */}
        {dosen.isPembimbing && advisees.length > 0 && (
          <Card title="Mahasiswa Bimbingan (Ringkas)">
            <ul className="space-y-3">
              {advisees.slice(0, 5).map((a) => (
                <li key={a.nim} className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {a.name} · <span className="text-slate-500 font-normal">{a.nim}</span>
                    </p>
                    <p className="truncate text-xs text-slate-500">{a.title}</p>
                  </div>
                  <StageBadge stage={a.stage} />
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* ─── Ringkasan Sidang ─── */}
        {dosen.isPenguji && examinees.length > 0 && (
          <Card title="Sidang Mendatang (Ringkas)">
            <ul className="space-y-3">
              {examinees.slice(0, 5).map((e) => (
                <li key={e.nim} className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {e.name} · <span className="text-slate-500 font-normal">{e.nim}</span>
                    </p>
                    <p className="truncate text-xs text-slate-500">{e.schedule.date} · {e.schedule.time} · {e.schedule.room}</p>
                  </div>
                  {e.bapStatus === 'FILLED' ? (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200">
                      BAP terisi
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200">
                      BAP belum
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </Page>
  );
}