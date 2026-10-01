import {useEffect} from 'react';
import {Bell} from 'lucide-react';
import {useAuth} from '../Auth';
import {useDb} from '../store';
import {Card} from '../components/ui';

export default function Notifications(){
  const {role}=useAuth();const [db,upd]=useDb();
  const notifs=role==='mahasiswa'?db.notifs:[];

  // tandai semua sudah dibaca saat halaman dibuka
  useEffect(()=>{
    if(notifs.some(n=>!n.read))upd(d=>({...d,notifs:d.notifs.map(n=>({...n,read:true}))}));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  return <div className="space-y-4">
    <div className="flex items-center gap-3">
      <span className="bg-primary-50 text-primary-700 rounded-lg p-2"><Bell className="w-6 h-6"/></span>
      <h2 className="font-bold text-lg text-primary-900">Semua Notifikasi</h2>
    </div>
    <Card className="!p-0 overflow-hidden">
      {notifs.length
        ?<ul className="divide-y divide-slate-100">{notifs.map(n=>
          <li key={n.id} className="flex items-start gap-3 p-4 text-sm">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent-500"/>
            <p className="flex-1">{n.text}</p>
          </li>)}</ul>
        :<div className="p-10 text-center text-slate-500">
          <Bell className="w-10 h-10 mx-auto mb-3 text-slate-300"/>
          <p className="text-sm">Belum ada notifikasi.</p>
        </div>}
    </Card>
  </div>}