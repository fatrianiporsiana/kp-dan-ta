import {useState} from 'react';
import {Lock} from 'lucide-react';
import {useDb} from '../../../store';
import {Card,Btn,FileField,Badge,Alert} from '../../../components/ui';
import {Form} from './shared';

export function Completion(){
  const [db,upd]=useDb();const [f,setF]=useState<Form>({});const [err,setErr]=useState('');
  const {c1,c2}=db;const set=(k:string,v:string)=>setF(o=>({...o,[k]:v}));
  if(db.reg.status!=='APPROVED')return <Alert>Penyelesaian KP dapat diakses setelah pendaftaran KP disetujui Staff.</Alert>;
  const send1=()=>{if(!f.laporan||!f.kartu||!f.kuesioner)return setErr('Semua berkas wajib diunggah.');setErr('');upd(d=>({...d,c1:{status:'PENDING',data:f}}));setF({})};
  const send2=()=>{if(!f.final||!f.perpus)return setErr('Semua berkas wajib diunggah.');setErr('');upd(d=>({...d,c2:{status:'COMPLETED',data:f}}));setF({})};
  const open1=c1.status==='NONE'||c1.status==='REJECTED';
  return <div className="space-y-4"><h2 className="font-bold text-lg text-primary-900">Penyelesaian Kerja Praktek</h2>
    <Card><div className="flex justify-between items-center mb-3"><h3 className="font-semibold">Tahap 1: Upload Berkas</h3><Badge s={c1.status}/></div>
      {c1.status==='REJECTED'&&<div className="mb-3"><Alert t="error">Ditolak. Catatan Staff: {c1.note}. Silakan upload ulang.</Alert></div>}
      {c1.status==='PENDING'&&<Alert>Menunggu Verifikasi Staff.</Alert>}
      {c1.status==='APPROVED'&&<Alert t="ok">Disetujui. Silakan cetak laporan dan lakukan pengumpulan final (hardcover), lalu lanjut ke Tahap 2.</Alert>}
      {open1&&<div className="space-y-3">
        <FileField label="Softfile Laporan KP (tanpa tanda tangan) - PDF" max={10} value={f.laporan} onChange={n=>set('laporan',n)}/>
        <FileField label="Scan Kartu Bimbingan (ttd Pembimbing & Sekprodi) - PDF/JPG" max={2} types=".pdf,.jpg,.jpeg" value={f.kartu} onChange={n=>set('kartu',n)}/>
        <FileField label="Kuesioner (ttd Pembimbing Lapangan) - PDF/JPG" max={2} types=".pdf,.jpg,.jpeg" value={f.kuesioner} onChange={n=>set('kuesioner',n)}/>
        {err&&<p className="text-sm text-red-600">{err}</p>}<Btn onClick={send1}>{c1.status==='REJECTED'?'Upload Ulang':'Kirim Berkas'}</Btn></div>}</Card>
    <Card className={c1.status==='APPROVED'?'':'opacity-60'}><div className="flex justify-between items-center mb-3"><h3 className="font-semibold">Tahap 2: Bukti Penyerahan Perpustakaan</h3>
      {c1.status!=='APPROVED'?<span className="text-xs inline-flex items-center gap-1"><Lock className="w-3.5 h-3.5"/>Terkunci</span>:<Badge s={c2.status}/>}</div>
      {c1.status!=='APPROVED'?<p className="text-sm text-slate-500">Terbuka setelah Tahap 1 disetujui Staff.</p>
      :c2.status==='COMPLETED'?<Alert t="ok">Selesai / Menunggu Validasi Akhir. Anda bebas tanggungan KP.</Alert>
      :<div className="space-y-3">
        <FileField label="Softfile Laporan KP Final (beserta scan tanda tangan) - PDF" max={10} value={f.final} onChange={n=>set('final',n)}/>
        <FileField label="Surat Tanda Terima Perpustakaan - PDF/JPG" max={2} types=".pdf,.jpg,.jpeg" value={f.perpus} onChange={n=>set('perpus',n)}/>
        {err&&<p className="text-sm text-red-600">{err}</p>}<Btn onClick={send2}>Selesaikan KP</Btn></div>}</Card></div>}