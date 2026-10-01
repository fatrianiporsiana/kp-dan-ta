import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardCheck, FileCheck2, UserCheck, CalendarCheck } from 'lucide-react';
import {
  Alert,
  Card,
  LoadError,
  Page,
  PageHeader,
  PageLoader,
  taStaffPath,
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

  const { stats, staff } = data;

  const cards: {
    label: string;
    value: number;
    icon: React.ElementType;
    to: string;
    tone: string;
  }[] = [
    {
      label: 'Pendaftaran menunggu',
      value: stats.pendingRegistration,
      icon: ClipboardCheck,
      to: taStaffPath('verifikasi'),
      tone: 'blue',
    },
    {
      label: 'Penetapan dospem',
      value: stats.pendingSupervisors,
      icon: UserCheck,
      to: taStaffPath('dospem'),
      tone: 'orange',
    },
    {
      label: 'Dokumen sidang menunggu',
      value: stats.pendingDefense,
      icon: FileCheck2,
      to: taStaffPath('verifikasi-sidang'),
      tone: 'blue',
    },
    {
      label: 'Sidang terjadwal',
      value: stats.scheduledDefense,
      icon: CalendarCheck,
      to: taStaffPath('jadwal-sidang'),
      tone: 'green',
    },
  ];

  const toneCls: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-800 ring-blue-100',
    orange: 'bg-orange-50 text-orange-700 ring-orange-100',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  };

  return (
    <Page>
      <PageHeader
        title="Dashboard Staff"
        subtitle="Verifikasi pengajuan mahasiswa Tugas Akhir dari pendaftaran sampai penjadwalan sidang."
      />

      <div className="space-y-5">
        <Alert tone="info" title={`Halo, ${staff.name}!`}>
          Ada {stats.pendingRegistration + stats.pendingSupervisors + stats.pendingDefense}{' '}
          pengajuan yang butuh perhatian Anda hari ini.
        </Alert>

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

        <Card title="Panduan Singkat">
          <ol className="space-y-2 text-sm text-slate-700">
            <li>
              <b>1. Verifikasi Pendaftaran</b> — cek kelengkapan berkas, setujui atau tolak dengan catatan.
            </li>
            <li>
              <b>2. Penetapan Dospem</b> — tetapkan dosen pembimbing utama & co-pembimbing.
            </li>
            <li>
              <b>3. Verifikasi Dokumen Sidang</b> — periksa 10 lampiran, pastikan lengkap sebelum sidang.
            </li>
            <li>
              <b>4. Plot Penguji & Jadwal</b> — tetapkan dosen penguji dan jadwal sidang.
            </li>
          </ol>
        </Card>
      </div>
    </Page>
  );
}