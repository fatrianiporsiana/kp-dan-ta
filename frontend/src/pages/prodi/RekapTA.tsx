import { useState } from 'react';
import {
  Card,
  EmptyState,
  FilterBar,
  GradeBadge,
  LecturerCell,
  LoadError,
  Page,
  PageHeader,
  PageLoader,
  StageBadge,
  fmtDate,
  useFilteredRows,
  useSnapshot,
} from './shared';

export default function RekapTA() {
  const { data, loading, error, reload } = useSnapshot();
  const [search, setSearch] = useState('');
  const [filterJalur, setFilterJalur] = useState('');
  const [filterStage, setFilterStage] = useState('');

  // Hook harus dipanggil sebelum return — jadi panggil dulu
  const rows = data?.rekapTA ?? [];
  const filteredByJalur = rows.filter((r) => {
    if (filterJalur && r.track !== filterJalur) return false;
    return true;
  });
  const filtered = useFilteredRows(filteredByJalur, search, 'stage', filterStage);

  if (loading) return <PageLoader />;
  if (error || !data)
    return (
      <Page>
        <LoadError message={error ?? 'Data kosong.'} onRetry={reload} />
      </Page>
    );

  return (
    <Page>
      <PageHeader
        title="Rekap Tugas Akhir"
        subtitle="Daftar seluruh mahasiswa TA beserta status, dosen pembimbing, dan nilai akhir."
      />

      <div className="space-y-5">
        <Card>
          <FilterBar
            search={search}
            onSearch={setSearch}
            filters={[
              {
                label: 'Semua Jalur',
                value: filterJalur,
                options: [
                  { value: 'SKRIPSI', label: 'Skripsi' },
                  { value: 'JURNAL', label: 'Jurnal' },
                ],
                onChange: setFilterJalur,
              },
              {
                label: 'Semua Tahap',
                value: filterStage,
                options: [
                  { value: 'PENDAFTARAN', label: 'Pendaftaran' },
                  { value: 'BIMBINGAN', label: 'Bimbingan' },
                  { value: 'SIDANG', label: 'Sidang' },
                  { value: 'REVISI', label: 'Revisi' },
                  { value: 'SELESAI', label: 'Selesai' },
                ],
                onChange: setFilterStage,
              },
            ]}
          />

          {filtered.length === 0 ? (
            <EmptyState title="Tidak ada data">
              Coba ubah filter atau kata kunci pencarian.
            </EmptyState>
          ) : (
            <>
              {/* ─── Desktop: Table ─── */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase text-slate-500">
                      <th className="px-3 py-2">NIM</th>
                      <th className="px-3 py-2">Nama</th>
                      <th className="px-3 py-2">Judul</th>
                      <th className="px-3 py-2">Jalur</th>
                      <th className="px-3 py-2">Pembimbing</th>
                      <th className="px-3 py-2">Tahap</th>
                      <th className="px-3 py-2 text-center">Nilai</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => (
                      <tr
                        key={r.nim}
                        className="border-b border-slate-100 hover:bg-slate-50 transition"
                      >
                        <td className="px-3 py-3 font-mono text-xs text-slate-600">{r.nim}</td>
                        <td className="px-3 py-3 font-medium text-slate-900">{r.name}</td>
                        <td className="px-3 py-3 text-slate-700 max-w-xs">
                          <p className="line-clamp-2">{r.title}</p>
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-xs text-slate-600">
                            {r.track === 'SKRIPSI' ? 'Skripsi' : 'Jurnal'}
                            <br />
                            <span className="text-slate-400">Reg {r.regular}</span>
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="space-y-1">
                            <LecturerCell lecturer={r.mainSupervisor} />
                            {r.coSupervisor && <LecturerCell lecturer={r.coSupervisor} />}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <StageBadge stage={r.stage} />
                        </td>
                        <td className="px-3 py-3 text-center">
                          {r.finalScore != null ? (
                            <div>
                              <p className="text-sm font-bold text-slate-900">{r.finalScore}</p>
                              <GradeBadge grade={r.grade} />
                            </div>
                          ) : (
                            <GradeBadge grade={r.grade} />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ─── Mobile: Cards ─── */}
              <div className="lg:hidden space-y-3">
                {filtered.map((r) => (
                  <div
                    key={r.nim}
                    className="rounded-lg border border-slate-200 bg-white p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">{r.name}</p>
                        <p className="font-mono text-xs text-slate-500">{r.nim}</p>
                      </div>
                      <StageBadge stage={r.stage} />
                    </div>
                    <p className="text-sm text-slate-700 line-clamp-2">{r.title}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-slate-500">Jalur</p>
                        <p className="text-slate-800">
                          {r.track === 'SKRIPSI' ? 'Skripsi' : 'Jurnal'} · Reg {r.regular}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Nilai</p>
                        <p className="text-slate-800">
                          {r.finalScore ?? '-'} <GradeBadge grade={r.grade} />
                        </p>
                      </div>
                    </div>
                    <div className="border-t border-slate-100 pt-2">
                      <p className="text-xs text-slate-500 mb-1">Pembimbing</p>
                      <LecturerCell lecturer={r.mainSupervisor} />
                      {r.coSupervisor && <LecturerCell lecturer={r.coSupervisor} />}
                    </div>
                  </div>
                ))}
              </div>

              {/* ─── Footer info ─── */}
              <p className="mt-4 text-xs text-slate-500">
                Menampilkan <b>{filtered.length}</b> dari <b>{rows.length}</b> mahasiswa TA.
              </p>
            </>
          )}
        </Card>
      </div>
    </Page>
  );
}