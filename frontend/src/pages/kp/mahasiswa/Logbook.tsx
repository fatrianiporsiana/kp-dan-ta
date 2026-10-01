import React from 'react';
import {Download,BookOpen,ClipboardList} from 'lucide-react';
import {Card,btnCls} from '../../../components/ui';

const DL=({t,base,Icon}:{t:string;base:string;Icon:React.ElementType})=><Card><div className="flex items-center gap-3 mb-4"><span className="bg-primary-50 text-primary-700 rounded-lg p-2"><Icon className="w-6 h-6"/></span><h3 className="font-bold">{t}</h3></div><div className="grid gap-2">
  <a className={`${btnCls('accent')} py-3 inline-flex items-center justify-center gap-2`} href={`/templates/${base}.docx`} download><Download className="w-4 h-4"/>Download Template (.DOCX)</a>
  <a className={`${btnCls('soft')} py-3`} href={`/templates/${base}.pdf`} download>Unduh PDF (.PDF)</a></div></Card>;

export function Logbook(){return <div className="space-y-4 lg:space-y-6">
  <div className="grid gap-4 lg:gap-6 md:grid-cols-2"><DL t="Logbook Aktivitas Harian KP" base="logbook" Icon={BookOpen}/><DL t="Berita Acara Bimbingan KP" base="berita-acara" Icon={ClipboardList}/></div>
  <Card><h3 className="font-bold mb-3">Ketentuan & Tata Cara Pengisian</h3><ol className="space-y-2 text-sm">
    {['Isi data identitas (NPM, Nama, Instansi) secara lengkap sebelum mencetak format formulir.','Minimal asistensi kartu bimbingan adalah 8 kali pertemuan dengan Dosen Pembimbing KP.','Gunakan stempel resmi instansi/perusahaan mitra pada halaman evaluasi akhir logbook KP.'].map((t,i)=>
      <li key={i} className="flex gap-3"><span className="h-6 w-6 shrink-0 rounded-full bg-primary-100 text-primary-700 text-xs font-bold grid place-items-center">{i+1}</span>{t}</li>)}</ol></Card></div>}