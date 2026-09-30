import React from 'react';
import {useAuth,ROLE_LABEL} from '../../Auth';
import {useDb,notify} from '../../store';
import {Db} from '../../types';
import {Card,Btn,Badge} from '../../components/ui';
type K='reg'|'c1'|'ext';
const ITEMS:[K,string][]=[['reg','Pendaftaran KP'],['c1','Penyelesaian KP - Tahap 1'],['ext','Perpanjangan KP']];
export function Home(){
  const {user,role}=useAuth();const [db]=useDb();const n=ITEMS.filter(([k])=>db[k].status==='PENDING').length;
  return <div className="space-y-4"><Card className="!bg-primary-700 !border-primary-700 text-white"><h2 className="text-xl font-bold">Halo, {user?.name}!</h2><p className="text-sm text-blue-100">{ROLE_LABEL[role!]}</p></Card>
    <Card><p className="text-sm">Pengajuan menunggu verifikasi: <b className="text-accent-600 text-lg">{n}</b></p></Card></div>}
export function Verify(){
  const [db,upd]=useDb();
  const act=(k:K,title:string,ok:boolean)=>{
    let note='';if(!ok){note=window.prompt('Catatan penolakan/revisi:')||'';if(!note)return}
    upd(d=>{const n:Db={...d};n[k]={...d[k],status:ok?'APPROVED':'REJECTED',note};
      return notify(n,`${title} ${ok?'disetujui':'ditolak'}${note?`: ${note}`:''}`)})};
  const list=ITEMS.filter(([k])=>db[k].status==='PENDING');
  return <div className="space-y-4"><h2 className="font-bold text-lg text-primary-900">Verifikasi Pengajuan</h2>
    {!list.length&&<Card><p className="text-sm text-slate-500">Tidak ada pengajuan yang menunggu verifikasi.</p></Card>}
    {list.map(([k,t])=><Card key={k}><div className="flex justify-between items-center mb-3"><h3 className="font-semibold">{t}</h3><Badge s={db[k].status}/></div>
      <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-2 text-sm">{Object.entries(db[k].data||{}).map(([a,b])=>
        <div key={a} className="break-words"><dt className="inline text-slate-500">{a}: </dt><dd className="inline font-medium">{b}</dd></div>)}</dl>
      <div className="mt-4 flex gap-2"><Btn v="primary" onClick={()=>act(k,t,true)}>Setujui</Btn><Btn v="ghost" onClick={()=>act(k,t,false)}>Tolak</Btn></div></Card>)}</div>}
export function Advisees(){
  const [db]=useDb();const d=db.reg.data||{};
  return <div className="space-y-4"><h2 className="font-bold text-lg text-primary-900">Mahasiswa Bimbingan</h2>
    {db.reg.status==='APPROVED'?<Card><p className="font-semibold">{d.nama} <span className="text-slate-500 font-normal">({d.nim})</span></p>
      <p className="text-sm">Judul: {d.judul}</p><p className="text-sm">Instansi: {d.perusahaan}</p></Card>
    :<Card><p className="text-sm text-slate-500">Belum ada mahasiswa bimbingan.</p></Card>}</div>}
