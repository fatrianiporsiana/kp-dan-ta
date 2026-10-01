import { useAuth, ROLE_LABEL } from '../../../Auth';
import { useDb } from '../../../store';
import { Card } from '../../../components/ui';

export default function DosenKP() {
  const { user, role } = useAuth();
  const [db] = useDb();
  const d = db.reg.data || {};

  return (
    <div className="space-y-4">
      <Card className="!bg-primary-700 !border-primary-700 text-white">
        <h2 className="text-xl font-bold">Halo, {user?.name}!</h2>
        <p className="text-sm text-blue-100">{role ? ROLE_LABEL[role] : '-'}</p>
      </Card>

      <h2 className="font-bold text-lg text-primary-900">Mahasiswa Bimbingan</h2>

      {db.reg.status === 'APPROVED' ? (
        <Card>
          <p className="font-semibold">
            {d.nama}{' '}
            <span className="text-slate-500 font-normal">({d.nim})</span>
          </p>
          <p className="text-sm">Judul: {d.judul}</p>
          <p className="text-sm">Instansi: {d.perusahaan}</p>
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-slate-500">Belum ada mahasiswa bimbingan.</p>
        </Card>
      )}
    </div>
  );
}