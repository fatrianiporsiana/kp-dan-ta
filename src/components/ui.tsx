import React,{ReactNode,useState} from 'react';
import {Status} from '../types';
export const Card=({children,className=''}:{children:ReactNode;className?:string})=>
  <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 ${className}`}>{children}</div>;
const cls={accent:'bg-accent-500 hover:bg-accent-600 text-white',primary:'bg-primary-700 hover:bg-primary-900 text-white',soft:'bg-primary-100 text-primary-700 hover:bg-primary-500 hover:text-white',ghost:'border border-slate-300 text-slate-700 hover:bg-slate-100'};
export const btnCls=(v:keyof typeof cls='accent')=>`inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${cls[v]}`;
export function Btn({v='accent',className='',...p}:React.ButtonHTMLAttributes<HTMLButtonElement>&{v?:keyof typeof cls}){
  return <button {...p} className={`${btnCls(v)} ${className}`}/>}
export function Field({label,...p}:{label:string}&React.InputHTMLAttributes<HTMLInputElement>){
  return <label className="block text-sm font-medium text-slate-700">{label}
    <input {...p} className="mt-1 w-full rounded-lg border border-transparent bg-primary-50 px-3 py-2.5 text-sm read-only:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"/></label>}
export function FileField({label,max,types='.pdf',value,onChange}:{label:string;max:number;types?:string;value?:string;onChange:(n:string)=>void}){
  const [err,setErr]=useState('');
  const check=(f?:File)=>{if(!f)return;
    if(!types.split(',').some(t=>f.name.toLowerCase().endsWith(t)))return setErr(`Format harus ${types}`);
    if(f.size>max*1048576)return setErr(`Ukuran maksimal ${max}MB`);
    setErr('');onChange(f.name)};
  return <div><div className="flex justify-between gap-2 text-sm font-semibold"><span>{label} <span className="text-red-500">*</span></span>
    <span className="text-[11px] font-normal text-slate-500 text-right">Format {types.replace(/\./g,'').replace(/,/g,'/').toUpperCase()} (Maks. {max} MB)</span></div>
    <label onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();check(e.dataTransfer.files[0])}}
      className="mt-2 flex flex-col items-center text-center gap-1 rounded-xl border-2 border-dashed border-primary-100 bg-white p-5 cursor-pointer hover:border-accent-500">
      <span className="text-2xl bg-primary-50 rounded-lg p-2">📄</span>
      <span className="text-sm font-medium break-all">{value||'Klik untuk memilih berkas'}</span>
      <span className="text-xs text-slate-500">atau seret dan lepas berkas ke sini</span>
      <span className="text-xs bg-primary-100 text-primary-700 font-semibold px-3 py-1 rounded">Pilih Berkas</span>
      <input type="file" accept={types} className="hidden" onChange={e=>check(e.target.files?.[0])}/></label>
    {err&&<p className="text-xs text-red-600 mt-1">{err}</p>}</div>}
export const Footer=()=><footer className="bg-primary-700 text-center text-xs py-2 text-accent-500">© Made with love in Informatika</footer>;
const BC:Record<Status,[string,string]>={NONE:['Belum ada','bg-slate-100 text-slate-600'],PENDING:['Menunggu verifikasi','bg-amber-100 text-amber-700'],IN_REVIEW:['Sedang direview','bg-blue-100 text-blue-700'],REJECTED:['Ditolak','bg-red-100 text-red-700'],APPROVED:['Disetujui','bg-green-100 text-green-700'],COMPLETED:['Selesai','bg-green-100 text-green-700']};
export const Badge=({s}:{s:Status})=><span className={`px-2 py-1 rounded-full text-xs font-semibold ${BC[s][1]}`}>{BC[s][0]}</span>;
export const Alert=({t='info',children}:{t?:'info'|'error'|'ok';children:ReactNode})=>
  <div className={`rounded-lg p-3 text-sm border ${t==='error'?'bg-red-50 border-red-300 text-red-700':t==='ok'?'bg-green-50 border-green-300 text-green-700':'bg-primary-50 border-primary-100 text-primary-700'}`}>{children}</div>;
