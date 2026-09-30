import React,{createContext,useContext,useState,ReactNode} from 'react';
import {User,Role,Mod} from './types';
interface S{user:User|null;mod:Mod|null;role:Role|null}
interface C extends S{signIn:(u:User)=>void;setMod:(m:Mod)=>void;setRole:(r:Role)=>void;signOut:()=>void}
export const ROLE_LABEL:Record<Role,string>={mahasiswa:'Mahasiswa',dosen_pembimbing:'Dosen Pembimbing',dosen_penguji:'Dosen Penguji',kaprodi:'Ketua Program Studi',sekprodi:'Sekretaris Program Studi',staff:'Staff'};
const empty:S={user:null,mod:null,role:null};
const Ctx=createContext<C>(null as unknown as C);
export const useAuth=()=>useContext(Ctx);
export function AuthProvider({children}:{children:ReactNode}){
  const [s,set]=useState<S>(()=>{try{return JSON.parse(localStorage.getItem('session')||'')}catch{return empty}});
  const up=(p:Partial<S>)=>set(o=>{const n={...o,...p};localStorage.setItem('session',JSON.stringify(n));return n});
  const v:C={...s,signIn:u=>up({user:u,mod:null,role:null}),setMod:m=>up({mod:m,role:null}),setRole:r=>up({role:r}),
    signOut:()=>{localStorage.removeItem('session');set(empty)}};
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>}
