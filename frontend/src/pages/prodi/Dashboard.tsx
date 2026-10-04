import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  CheckCircle2,
  Clock,
  Users,
} from 'lucide-react';
import {
  Alert,
  Card,
  LoadError,
  Page,
  PageHeader,
  PageLoader,
  prodiPath,
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

  const { stats, user } = data;
  const roleLabel = user.isKaprodi ? 'Ketua Program Studi' : 'Sekretaris Program Studi';

  const cards = [
    {
      label: 'Total Mahasiswa TA',
      value: stats.totalTA,
      icon: BookOpen,
      to: prodiPath('rekap-ta'),
      tone: 'blue',
    },
    {
      label: 'TA Selesai',
      value: stats.taSelesai,
      icon: CheckCircle2,
      to: prodiPath('rekap-ta'),
      tone: 'green',
    },
    {
      label: 'Total Mahasiswa KP',
      value: stats.totalKP,
      icon: Briefcase,
      to: prodiPath('rekap-kp'),
      tone: 'orange',
    },
    {
      label: 'KP Selesai',
      value: stats.kpSelesai,
      icon: CheckCircle2,
      to: prodiPath('rekap-kp'),
      tone: 'green',
    },
  ];

  const toneCls: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-800 ring-blue-100',
    orange: 'bg-orange-50 text-orange-700 ring-orange-100',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  };

  const taProgress =
    stats.totalTA > 0 ? Math.round((stats.taSelesai / stats.totalTA) * 100) : 0;
  const kpProgress =
    stats.totalKP > 0 ? Math.round((stats.kpSelesai / stats.totalKP) * 100) : 0;

  return (
    <Page>
      <PageHeader
        title="Dashboard Prodi"
        subtitle="Ringkasan progres Kerja Praktek dan Tugas Akhir mahasiswa Program Studi Informatika."
      />

      <div className="space-y-5">
        <Alert tone="info" title={`Halo, ${user.name}!`}>
          Anda login sebagai <b>{roleLabel}</b>. Berikut ringkasan data mahasiswa.
        </Alert>

        {/* ─── Statistik ─── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

        {/* ─── Progress TA & KP ─── */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Progres Tugas Akhir">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-600">
                  <Clock className="h-4 w-4" /> Berjalan
                </span>
                <b className="text-slate-900">{stats.taBerjalan}</b>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-600">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Selesai
                </span>
                <b className="text-slate-900">{stats.taSelesai}</b>
              </div>
              <div className="pt-2">
                <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                  <span>Persentase selesai</span>
                  <b>{taProgress}%</b>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${taProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card title="Progres Kerja Praktek">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-600">
                  <Clock className="h-4 w-4" /> Berjalan
                </span>
                <b className="text-slate-900">{stats.kpBerjalan}</b>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-600">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Selesai
                </span>
                <b className="text-slate-900">{stats.kpSelesai}</b>
              </div>
              <div className="pt-2">
                <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                  <span>Persentase selesai</span>
                  <b>{kpProgress}%</b>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${kpProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>

        <Card title="Akses Cepat">
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              to={prodiPath('rekap-ta')}
              className="group flex items-center gap-3 rounded-lg border border-slate-200 p-4 hover:border-orange-400 hover:bg-orange-50/30 transition"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-800 group-hover:bg-orange-100 group-hover:text-orange-700">
                <BookOpen className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900 group-hover:text-orange-700">
                  Rekap Tugas Akhir
                </p>
                <p className="text-xs text-slate-500">Lihat seluruh mahasiswa TA</p>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-orange-500" />
            </Link>

            <Link
              to={prodiPath('rekap-kp')}
              className="group flex items-center gap-3 rounded-lg border border-slate-200 p-4 hover:border-orange-400 hover:bg-orange-50/30 transition"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-700 group-hover:bg-orange-100 group-hover:text-orange-700">
                <Briefcase className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900 group-hover:text-orange-700">
                  Rekap Kerja Praktek
                </p>
                <p className="text-xs text-slate-500">Lihat seluruh mahasiswa KP</p>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-orange-500" />
            </Link>
          </div>
        </Card>
      </div>
    </Page>
  );
}