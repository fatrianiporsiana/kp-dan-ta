import {useState} from 'react';
import {Db,User} from './types';
/* MOCK DATA LAYER. Saat integrasi Laravel: ganti login/loginGoogle dengan
   POST `${API}/auth/login` | `${API}/auth/google`, dan loadDb/saveDb dengan GET/PUT `${API}/kp/...`.
   Komponen UI tidak perlu diubah. */
export const API=process.env.REACT_APP_API_URL||'http://localhost:8000/api';
type U=User&{password:string};
const USERS:U[]=[
{id:1,name:'Budi Santoso',email:'budi@student.widyatama.ac.id',nim:'2210001',password:'password',roles:['mahasiswa']},
{id:2,name:'Siti Rahma, S.Kom.',email:'staff@widyatama.ac.id',password:'password',roles:['staff']},
{id:3,name:'Dr. Andi Wijaya, M.T.',email:'kaprodi@widyatama.ac.id',password:'password',roles:['kaprodi','dosen_pembimbing','dosen_penguji']},
{id:4,name:'Ir. Dewi Lestari, M.Kom.',email:'sekprodi@widyatama.ac.id',password:'password',roles:['sekprodi','dosen_pembimbing','dosen_penguji']},
{id:5,name:'Rudi Hartono, M.T.',email:'dosen@widyatama.ac.id',password:'password',roles:['dosen_pembimbing','dosen_penguji']}];
const strip=({password,...u}:U):User=>u;
export async function login(email:string,pw:string):Promise<User>{
  const u=USERS.find(x=>x.email===email.trim().toLowerCase()&&x.password===pw);
  if(!u)throw new Error('Email atau kata sandi salah.');return strip(u)}
export async function loginGoogle(email:string):Promise<User>{
  const u=USERS.find(x=>x.email===email.trim().toLowerCase());
  if(!u)throw new Error('Akun Google tidak terdaftar di sistem.');return strip(u)}
const K='kp_db';const I={status:'NONE'} as const;
const init=():Db=>({reg:{...I},c1:{...I},c2:{...I},ext:{...I},notifs:[]});
export const loadDb=():Db=>{try{return JSON.parse(localStorage.getItem(K)||'')}catch{return init()}};
export const saveDb=(d:Db)=>localStorage.setItem(K,JSON.stringify(d));
export const notify=(d:Db,text:string):Db=>({...d,notifs:[{id:Date.now(),text,read:false},...d.notifs]});
export function useDb():[Db,(f:(d:Db)=>Db)=>void]{
  const [db,set]=useState<Db>(loadDb);
  return [db,f=>{const n=f(loadDb());saveDb(n);set(n)}]}
