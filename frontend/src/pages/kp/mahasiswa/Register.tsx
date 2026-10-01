import React,{useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Check,Download,ArrowLeft,ArrowRight} from 'lucide-react';
import {useAuth} from '../../../Auth';
import {useDb} from '../../../store';
import {Card,Btn,Field,FileField,Badge,Alert,btnCls} from '../../../components/ui';
import {Form,F,TemplateKP} from './shared';

const S1:F=[['alamat','Alamat Tempat Tinggal Sekarang'],['ttl','Tempat Lahir'],['tgl','Tanggal Lahir','date'],['email','Email Widyatama (@widyatama.ac.id)','email'],['telp','Nomor Telepon/WhatsApp','tel'],['ipk','IPK Terakhir','number'],['judul','Judul KP (Rencana Topik)'],['dosen','Usulan Dosen Pembimbing 1'],['dosen2','Usulan Dosen Pembimbing 2']];
const S2:F=[['perusahaan','Nama Perusahaan/Instansi'],['bidang','Bidang Usaha/Industri'],['alamatp','Alamat Lengkap Perusahaan'],['kota','Kota/Kabupaten'],['kontak','Nomor Telepon/Email Perusahaan'],['lapangan','Nama Pembimbing di Lapangan (Mentor Industri)']];
const S3:F=[['transkrip','Transkrip Nilai Sementara'],['krs','KRS Semester Berjalan'],['bayar','Histori Pembayaran Terbaru (Portal PUPD)']];
const WIDE=['alamat','judul','alamatp'];

export function Register(){
  const {user}=useAuth();const nav=useNavigate();const [db,upd]=useDb();
  const [step,setStep]=useState(0);const [err,setErr]=useState('');const [agree,setAgree]=useState(false);
  const [f,setF]=useState<Form>(()=>{try{return JSON.parse(sessionStorage.getItem('kp_draft')||'')}catch{return{}}});
  const st=db.reg.status;
  if(st!=='NONE'&&st!=='REJECTED')return <div className="space-y-4"><Card><h2 className="font-bold text-lg mb-3">Status Pendaftaran KP</h2><Badge s={st}/>
    <p className="mt-3 text-sm text-slate-600">{st==='APPROVED'?'Pendaftaran disetujui. Silakan lanjut ke Logbook & Penyelesaian KP.':'Permohonan Anda sedang menunggu verifikasi Staff/Admin.'}</p></Card>
    {st==='APPROVED'&&<TemplateKP/>}</div>;
  const set=(k:string,v:string)=>{const n={...f,[k]:v};setF(n);sessionStorage.setItem('kp_draft',JSON.stringify(n))};
  const fields=step===0?S1:S2;
  const next=()=>{if(fields.some(([k])=>k!=='dosen2'&&!f[k]?.trim()))return setErr('Lengkapi semua data terlebih dahulu.');setErr('');setStep(step+1)};
  const submit=()=>{
    if(S3.some(([k])=>!f[k]))return setErr('Unggah semua dokumen persyaratan.');
    if(!agree)return setErr('Centang pernyataan kebenaran data.');
    upd(d=>({...d,reg:{status:'PENDING',data:{...f,nama:user!.name,nim:user!.nim||''}}}));
    sessionStorage.removeItem('kp_draft');nav('/app')};
  return <div className="max-w-3xl mx-auto space-y-4">
    <div className="flex items-center justify-center">{[0,1,2].map(i=><React.Fragment key={i}>
      <div className={`w-9 h-9 rounded-full grid place-items-center text-sm font-bold ${i<step?'bg-primary-700 text-white':i===step?'bg-accent-500 text-white ring-4 ring-accent-50':'bg-primary-100 text-primary-700'}`}>{i<step?<Check className="w-5 h-5"/>:i+1}</div>
      {i<2&&<div className={`h-0.5 w-14 sm:w-28 ${i<step?'bg-accent-500':'bg-primary-100'}`}/>}</React.Fragment>)}</div>
    {st==='REJECTED'&&<Alert t="error">Pendaftaran ditolak. Catatan: {db.reg.note}. Silakan perbaiki dan kirim ulang.</Alert>}
    <Card>{step<2?<div className="grid gap-4 sm:grid-cols-2">
      {step===0&&<><Field label="Nama Lengkap" value={user!.name} readOnly/><Field label="Nomor Pokok Mahasiswa (NPM)" value={user!.nim||''} readOnly/></>}
      {fields.map(([k,l,t])=><div key={k} className={WIDE.includes(k)?'sm:col-span-2':''}>
        {/* REVISI: Tambahkan class wrapper agar input lebih terlihat */}
        <div className="[&_input]:!border-slate-300 [&_input]:!bg-white [&_input]:!shadow-sm [&_input]:focus:!border-orange-500 [&_input]:focus:!ring-2 [&_input]:focus:!ring-orange-200 [&_input]:!rounded-lg [&_input]:!py-2.5 [&_input]:!px-3.5 [&_input]:!text-slate-800 [&_input]:!transition-all">
          <Field label={l} type={t||'text'} value={f[k]||''} onChange={e=>set(k,e.target.value)}/>
        </div>
      </div>)}</div>
    :<div className="space-y-5"><h3 className="font-bold">Form Kerja Praktek</h3>
      <div className="flex items-center justify-between gap-2 rounded-lg border border-primary-100 p-2 pl-3 text-sm font-medium">Template Form Pengajuan Kerja Praktek
        <a href="/templates/form-pengajuan-kp.docx" download className={`${btnCls('primary')} inline-flex items-center gap-1.5`}><Download className="w-4 h-4"/>Unduh</a></div>
      {S3.map(([k,l])=><FileField key={k} label={l} max={2} value={f[k]} onChange={n=>set(k,n)}/>)}
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1 accent-orange-500" checked={agree} onChange={e=>setAgree(e.target.checked)}/>Saya menyatakan bahwa data dan berkas yang dilampirkan adalah benar dan dapat dipertanggungjawabkan sesuai ketentuan akademik.</label></div>}</Card>
    {err&&<p className="text-sm text-red-600">{err}</p>}
    {step===0&&<Btn className="w-full py-3" onClick={next}>Selanjutnya</Btn>}
    {step===1&&<div className="flex gap-3"><Btn v="primary" className="flex-1 py-3" onClick={()=>setStep(0)}><ArrowLeft className="inline w-4 h-4 -mt-0.5 mr-1"/>Sebelumnya</Btn><Btn className="flex-[2] py-3" onClick={next}>Selanjutnya<ArrowRight className="inline w-4 h-4 -mt-0.5 ml-1"/></Btn></div>}
    {step===2&&<><Btn className="w-full py-3" onClick={submit}><Check className="inline w-4 h-4 -mt-0.5 mr-1.5"/>Kirim Permohonan KP</Btn><Btn v="soft" className="w-full py-3" onClick={()=>setStep(1)}><ArrowLeft className="inline w-4 h-4 -mt-0.5 mr-1"/>Sebelumnya</Btn></>}</div>}