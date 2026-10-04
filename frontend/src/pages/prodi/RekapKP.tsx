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
  useFilteredRows,
  useSnapshot,
} from './shared';

export default function RekapKP() {
  const { data, loading, error, reload } = useSnapshot();
  const [search, setSearch] = useState('');
  const [filterStage, setFilterStage] = useState('');

  const rows = data?.rekapKP ?? [];
  const filtered = useFilteredRows(rows, search, 'stage', filterStage);

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
        title="Rekap Kerja Praktek"
        subtitle="Daftar seluruh mahasiswa KP beserta instansi, dosen pembimbing, dan status penyelesaian."
      />

      <div className="space-y-5">
        <Card>
          <FilterBar
            search={search}
            onSearch={setSearch}
            filters={[
              {
                label: 'Semua Tahap',
                value: filterStage,
                options: [
                  { value: 'PENDAFTARAN', label: 'Pendaftaran' },
                  { value: 'BIMBINGAN', label: 'Bimbingan' },
                  { value: 'PENYELESAIAN', label: 'Penyelesaian' },
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
                      <th className="px-3 py-2">Instansi</th>
                      <th className="px-3 py-2">Bidang</th>
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
                        <td className="px-3 py-3 text-slate-700">{r.company}</td>
                        <td className="px-3 py-3 text-xs text-slate-600">{r.field}</td>
                        <td className="px-3 py-3">
                          <div className="space-y-1">
                            <LecturerCell lecturer={r.supervisor} />
                            {r.fieldSupervisor && (
                              <p className="text-xs text-slate-500 truncate" title={r.fieldSupervisor}>
                                Lapangan: {r.fieldSupervisor}
                              </p>
                            )}
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
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-slate-500">Instansi</p>
                        <p className="text-slate-800">{r.company}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Bidang</p>
                        <p className="text-slate-800">{r.field}</p>
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
                      <LecturerCell lecturer={r.supervisor} />
                      {r.fieldSupervisor && (
                        <p className="text-xs text-slate-500 mt-1">
                          Lapangan: {r.fieldSupervisor}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-xs text-slate-500">
                Menampilkan <b>{filtered.length}</b> dari <b>{rows.length}</b> mahasiswa KP.
              </p>
            </>
          )}
        </Card>
      </div>
    </Page>
  );
}