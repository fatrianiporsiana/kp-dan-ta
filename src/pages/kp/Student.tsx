import React,{useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useAuth} from '../../Auth';
import {useDb} from '../../store';
import {Card,Btn,Field,FileField,Badge,Alert,btnCls} from '../../components/ui';
type Form=Record<string,string>;
type F=[string,string,string?][];
const S1:F=[['alamat','Alamat Tempat Tinggal Sekarang'],['ttl','Tempat Lahir'],['tgl','Tanggal Lahir','date'],['email','Email Widyatama (@widyatama.ac.id)','email'],['telp','Nomor Telepon/WhatsApp','tel'],['ipk','IPK Terakhir','number'],['judul','Judul KP (Rencana Topik)'],['dosen','Usulan Dosen Pembimbing 1'],['dosen2','Usulan Dosen Pembimbing 2']];
const S2:F=[['perusahaan','Nama Perusahaan/Instansi'],['bidang','Bidang Usaha/Industri'],['alamatp','Alamat Lengkap Perusahaan'],['kota','Kota/Kabupaten'],['kontak','Nomor Telepon/Email Perusahaan'],['lapangan','Nama Pembimbing di Lapangan (Mentor Industri)']];
const S3:F=[['transkrip','Transkrip Nilai Sementara'],['krs','KRS Semester Berjalan'],['bayar','Histori Pembayaran Terbaru (Portal PUPD)']];
const STEPS=['Pendaftaran','Bimbingan','Penyelesaian'];

const WIDE=['alamat','judul','alamatp'];
export function Dashboard(){
  const {user}=useAuth();const [db]=useDb();const d=db.reg.data||{};
  const cur=db.c2.status==='COMPLETED'?3:db.c1.status==='APPROVED'?2:db.reg.status==='APPROVED'?1:0;
  return <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
    <Card className="lg:col-span-2"><h2 className="text-xl font-bold">Halo, {user?.name}!</h2><p className="text-sm text-slate-500">{user?.nim}</p></Card>
    <Card><div className="flex justify-between text-sm mb-5"><h3 className="font-bold text-primary-700">↗ Progres Kerja Praktek</h3><span className="text-slate-500 text-xs">Tahap {Math.min(cur+1,3)} dari 3</span></div>
      <div className="relative"><div className="absolute top-[18px] left-[16.6%] right-[16.6%] h-0.5 bg-primary-100"/>
      <ol className="relative flex">{STEPS.map((s,i)=>{const done=i<cur,act=i===cur;return <li key={s} className="flex-1 text-center">
        <div className={`mx-auto w-9 h-9 rounded-full grid place-items-center text-sm font-bold text-white ${done?'bg-green-500':act?'bg-accent-500 ring-4 ring-accent-50':'bg-primary-100 !text-primary-700'}`}>{done?'✓':i+1}</div>
        <p className="mt-2 text-xs sm:text-sm">{s}</p>
        <p className={`text-[11px] ${done?'text-green-600':act?'text-accent-600':'text-slate-400'}`}>{done?'Selesai':act?'Sedang Berjalan':'Menunggu'}</p></li>})}</ol></div></Card>
    <Card><div className="flex justify-between text-sm mb-3"><h3 className="font-bold">Pembimbing Kerja Praktek</h3><span className="text-slate-500 text-xs">2 Pembimbing</span></div>
      <div className="space-y-3">
        <div className="rounded-xl bg-primary-50 p-3"><p className="text-xs text-accent-600 font-semibold">Dosen Pembimbing</p><p className="font-bold text-sm">{db.reg.status==='APPROVED'?d.dosen:'Menunggu penetapan'}</p><p className="text-xs text-slate-500">NIDN: -</p></div>
        <div className="rounded-xl bg-primary-50 p-3"><p className="text-xs text-accent-600 font-semibold">Pembimbing Lapangan</p><p className="font-bold text-sm">{d.lapangan||'-'}</p></div></div></Card>
    {db.reg.status==='APPROVED'&&<Card className="lg:col-span-2"><h3 className="font-bold mb-3">Template KP</h3><div className="flex flex-wrap gap-2">
      <a className={btnCls('primary')} href="/templates/kuesioner-kp.docx" download>Template Kuesioner KP</a>
      <a className={btnCls('primary')} href="/templates/laporan-kp.docx" download>Template Laporan KP</a></div></Card>}
    <Card className="lg:col-span-2"><h3 className="font-bold mb-2">Pengumuman Prodi</h3><p className="text-sm text-slate-500">Belum ada pengumuman terbaru.</p></Card></div>}

export function Register(){
  const {user}=useAuth();const nav=useNavigate();const [db,upd]=useDb();
  const [step,setStep]=useState(0);const [err,setErr]=useState('');const [agree,setAgree]=useState(false);
  const [f,setF]=useState<Form>(()=>{try{return JSON.parse(sessionStorage.getItem('kp_draft')||'')}catch{return{}}});
  const st=db.reg.status;
  if(st!=='NONE'&&st!=='REJECTED')return <Card><h2 className="font-bold text-lg mb-3">Status Pendaftaran KP</h2><Badge s={st}/>
    <p className="mt-3 text-sm text-slate-600">{st==='APPROVED'?'Pendaftaran disetujui. Silakan lanjut ke Logbook & Penyelesaian KP.':'Permohonan Anda sedang menunggu verifikasi Staff/Admin.'}</p></Card>;
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
      <div className={`w-9 h-9 rounded-full grid place-items-center text-sm font-bold ${i<step?'bg-primary-700 text-white':i===step?'bg-accent-500 text-white ring-4 ring-accent-50':'bg-primary-100 text-primary-700'}`}>{i<step?'✓':i+1}</div>
      {i<2&&<div className={`h-0.5 w-14 sm:w-28 ${i<step?'bg-accent-500':'bg-primary-100'}`}/>}</React.Fragment>)}</div>
    {st==='REJECTED'&&<Alert t="error">Pendaftaran ditolak. Catatan: {db.reg.note}. Silakan perbaiki dan kirim ulang.</Alert>}
    <Card>{step<2?<div className="grid gap-4 sm:grid-cols-2">
      {step===0&&<><Field label="Nama Lengkap" value={user!.name} readOnly/><Field label="Nomor Pokok Mahasiswa (NPM)" value={user!.nim||''} readOnly/></>}
      {fields.map(([k,l,t])=><div key={k} className={WIDE.includes(k)?'sm:col-span-2':''}><Field label={l} type={t||'text'} value={f[k]||''} onChange={e=>set(k,e.target.value)}/></div>)}</div>
    :<div className="space-y-5"><h3 className="font-bold">Form Kerja Praktek</h3>
      <div className="flex items-center justify-between gap-2 rounded-lg border border-primary-100 p-2 pl-3 text-sm font-medium">Template Form Pengajuan Kerja Praktek
        <a href="/templates/form-pengajuan-kp.docx" download className={btnCls('primary')}>⬇ Unduh</a></div>
      {S3.map(([k,l])=><FileField key={k} label={l} max={2} value={f[k]} onChange={n=>set(k,n)}/>)}
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1 accent-orange-500" checked={agree} onChange={e=>setAgree(e.target.checked)}/>Saya menyatakan bahwa data dan berkas yang dilampirkan adalah benar dan dapat dipertanggungjawabkan sesuai ketentuan akademik.</label></div>}</Card>
    {err&&<p className="text-sm text-red-600">{err}</p>}
    {step===0&&<Btn className="w-full py-3" onClick={next}>Selanjutnya</Btn>}
    {step===1&&<div className="flex gap-3"><Btn v="primary" className="flex-1 py-3" onClick={()=>setStep(0)}>← Sebelumnya</Btn><Btn className="flex-[2] py-3" onClick={next}>Selanjutnya →</Btn></div>}
    {step===2&&<><Btn className="w-full py-3" onClick={submit}>✓ Kirim Permohonan KP</Btn><Btn v="soft" className="w-full py-3" onClick={()=>setStep(1)}>← Sebelumnya</Btn></>}</div>}

const DL=({t,base,ic}:{t:string;base:string;ic:string})=><Card><div className="flex items-center gap-3 mb-4"><span className="bg-primary-50 rounded-lg p-2 text-xl">{ic}</span><h3 className="font-bold">{t}</h3></div><div className="grid gap-2">
  <a className={`${btnCls('accent')} py-3`} href={`/templates/${base}.docx`} download>⬇ Download Template (.DOCX)</a>
  <a className={`${btnCls('soft')} py-3`} href={`/templates/${base}.pdf`} download>Unduh PDF (.PDF)</a></div></Card>;
export function Logbook(){return <div className="space-y-4 lg:space-y-6">
  <div className="grid gap-4 lg:gap-6 md:grid-cols-2"><DL t="Logbook Aktivitas Harian KP" base="logbook" ic="📖"/><DL t="Berita Acara Bimbingan KP" base="berita-acara" ic="📋"/></div>
  <Card><h3 className="font-bold mb-3">Ketentuan & Tata Cara Pengisian</h3><ol className="space-y-2 text-sm">
    {['Isi data identitas (NPM, Nama, Instansi) secara lengkap sebelum mencetak format formulir.','Minimal asistensi kartu bimbingan adalah 8 kali pertemuan dengan Dosen Pembimbing KP.','Gunakan stempel resmi instansi/perusahaan mitra pada halaman evaluasi akhir logbook KP.'].map((t,i)=>
      <li key={i} className="flex gap-3"><span className="h-6 w-6 shrink-0 rounded-full bg-primary-100 text-primary-700 text-xs font-bold grid place-items-center">{i+1}</span>{t}</li>)}</ol></Card></div>}

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
      {c1.status!=='APPROVED'?<span className="text-xs">🔒 Terkunci</span>:<Badge s={c2.status}/>}</div>
      {c1.status!=='APPROVED'?<p className="text-sm text-slate-500">Terbuka setelah Tahap 1 disetujui Staff.</p>
      :c2.status==='COMPLETED'?<Alert t="ok">Selesai / Menunggu Validasi Akhir. Anda bebas tanggungan KP.</Alert>
      :<div className="space-y-3">
        <FileField label="Softfile Laporan KP Final (beserta scan tanda tangan) - PDF" max={10} value={f.final} onChange={n=>set('final',n)}/>
        <FileField label="Surat Tanda Terima Perpustakaan - PDF/JPG" max={2} types=".pdf,.jpg,.jpeg" value={f.perpus} onChange={n=>set('perpus',n)}/>
        {err&&<p className="text-sm text-red-600">{err}</p>}<Btn onClick={send2}>Selesaikan KP</Btn></div>}</Card></div>}

export function Extension(){
  const [db,upd]=useDb();const [f,setF]=useState<Form>({});const [err,setErr]=useState('');const e=db.ext;
  const send=()=>{if(!f.alasan||!f.durasi||!f.bukti)return setErr('Lengkapi alasan, durasi, dan bukti pendukung.');upd(d=>({...d,ext:{status:'PENDING',data:f}}));setF({})};
  return <Card><h2 className="font-bold text-lg text-primary-900 mb-3">Perpanjangan Kerja Praktek</h2>
    {e.status!=='NONE'&&<p className="mb-3 text-sm">Status: <Badge s={e.status}/> {e.note&&<span className="text-red-600"> Catatan: {e.note}</span>}</p>}
    {(e.status==='NONE'||e.status==='REJECTED')&&<div className="space-y-3">
      <label className="block text-sm font-medium">Alasan Perpanjangan<textarea rows={3} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" value={f.alasan||''} onChange={x=>setF({...f,alasan:x.target.value})}/></label>
      <Field label="Durasi Perpanjangan (bulan)" type="number" min={1} value={f.durasi||''} onChange={x=>setF({...f,durasi:x.target.value})}/>
      <FileField label="Bukti Pendukung (PDF)" max={2} value={f.bukti} onChange={n=>setF({...f,bukti:n})}/>
      {err&&<p className="text-sm text-red-600">{err}</p>}<Btn onClick={send}>Kirim Pengajuan</Btn></div>}</Card>}
