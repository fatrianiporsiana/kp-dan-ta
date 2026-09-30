import React,{useState} from 'react';
import {NavLink,Outlet,useNavigate} from 'react-router-dom';
import {useAuth,ROLE_LABEL} from '../Auth';
import {useDb} from '../store';
import {Footer} from './ui';
type M=[string,string][];
const HOME:M=[['/app','Dashboard Utama']];
const MENU:Record<string,M>={
  m:[...HOME,['/app/pendaftaran','Pendaftaran Kerja Praktek'],['/app/logbook','Logbook & Berita Acara'],['/app/perpanjangan','Perpanjangan Kerja Praktek'],['/app/penyelesaian','Penyelesaian Kerja Praktek']],
  s:[...HOME,['/app/verifikasi','Verifikasi Pengajuan']],
  d:[...HOME,['/app/bimbingan','Mahasiswa Bimbingan']]};
export default function Layout(){
  const {user,mod,role,signOut}=useAuth();const nav=useNavigate();
  const [db,upd]=useDb();const [open,setOpen]=useState(false);const [dd,setDd]=useState<''|'n'|'u'>('');
  if(!user||!role)return null;
  const k=role==='mahasiswa'?'m':role.startsWith('dosen')?'d':'s';
  const menu=mod==='ta'?HOME:MENU[k];const title=mod==='kp'?'Kerja Praktek':'Tugas Akhir';
  const notifs=role==='mahasiswa'?db.notifs:[];const unread=notifs.filter(n=>!n.read).length;
  const bell=()=>{setDd(dd==='n'?'':'n');if(unread)upd(d=>({...d,notifs:d.notifs.map(n=>({...n,read:true}))}))};
  const go=(p:string)=>{setDd('');nav(p)};
  return <div className="min-h-screen flex">
    {open&&<div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={()=>setOpen(false)}/>}
    <aside className={`fixed inset-y-0 left-0 z-40 w-72 lg:w-64 bg-white border-r border-slate-200 flex flex-col transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${open?'translate-x-0':'-translate-x-full'}`}>
      <div className="p-5 flex items-start justify-between border-b border-slate-100"><div>
        <div className="flex gap-2 mb-3"><img src="/images/logowidit.jpg" alt="Widyatama" className="h-9 object-contain"/><img src="/images/logoif.jpg" alt="IF" className="h-9 object-contain"/></div>
        <p className="font-bold text-primary-900">{title}</p><p className="text-xs text-slate-500">Teknik Informatika</p>
        <p className="mt-1 text-xs font-semibold text-accent-600">{ROLE_LABEL[role]}</p></div>
        <button className="lg:hidden text-xl text-slate-500" aria-label="Tutup" onClick={()=>setOpen(false)}>✕</button></div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">{menu.map(([to,l])=>
        <NavLink key={to} to={to} end={to==='/app'} onClick={()=>setOpen(false)}
          className={({isActive})=>`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm ${isActive?'bg-primary-50 text-primary-700 font-semibold':'text-slate-600 hover:bg-slate-50'}`}>
          {({isActive})=><><span>{l}</span>{isActive&&<span className="h-2 w-2 rounded-full bg-accent-500"/>}</>}</NavLink>)}</nav>
      <button onClick={signOut} className="m-3 rounded-lg px-3 py-2 text-sm text-left text-red-600 hover:bg-red-50">⎋ Keluar</button>
    </aside>
    <div className="flex-1 min-w-0 flex flex-col">
      <header className="sticky top-0 z-20 bg-primary-700 text-white h-16 px-4 sm:px-6 flex items-center gap-3">
        <button className="lg:hidden text-2xl" aria-label="Menu" onClick={()=>setOpen(true)}>☰</button>
        <div className="flex-1 min-w-0"><h1 className="font-bold truncate">{title}</h1><p className="text-xs text-blue-200 truncate">Teknik Informatika</p></div>
        <div className="relative"><button onClick={bell} aria-label="Notifikasi" className="relative text-xl">🔔
          {unread>0&&<span className="absolute -top-0.5 -right-1 h-2.5 w-2.5 bg-red-500 rounded-full"/>}</button>
          {dd==='n'&&<div className="absolute right-0 mt-3 w-72 max-w-[85vw] bg-white text-slate-800 rounded-xl shadow-lg p-2 max-h-80 overflow-y-auto">
            {notifs.length?notifs.map(n=><p key={n.id} className="text-sm p-2 border-b last:border-0">{n.text}</p>):<p className="text-sm p-2 text-slate-500">Belum ada notifikasi.</p>}</div>}</div>
        <div className="relative"><button onClick={()=>setDd(dd==='u'?'':'u')} aria-label="Profil" className="h-9 w-9 rounded-full bg-accent-500 font-bold">{user.name[0]}</button>
          {dd==='u'&&<div className="absolute right-0 mt-3 w-60 bg-white text-slate-800 rounded-xl shadow-lg py-2 text-sm">
            <div className="px-4 pb-2 border-b"><p className="font-semibold">{user.name}</p><p className="text-xs text-slate-500">{ROLE_LABEL[role]}</p></div>
            {user.roles.length>1&&<button className="w-full text-left px-4 py-2 hover:bg-slate-100" onClick={()=>go('/modules')}>Ganti Role</button>}
            <button className="w-full text-left px-4 py-2 hover:bg-slate-100" onClick={()=>go('/modules')}>Ganti Modul</button>
            <button className="w-full text-left px-4 py-2 text-red-600 hover:bg-slate-100" onClick={signOut}>Keluar</button></div>}</div>
      </header>
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl w-full mx-auto"><Outlet/></main>
      <Footer/>
    </div></div>}
