import React,{ReactElement} from 'react';
import {BrowserRouter,Routes,Route,Navigate} from 'react-router-dom';
import {AuthProvider,useAuth} from './Auth';
import Layout from './components/Layout';
import Login from './pages/Login';
import {Modules} from './pages/Select';
import {Dashboard,Register,Logbook,Completion,Extension} from './pages/kp/Student';
import {Home,Verify,Advisees} from './pages/kp/Staff';
import {Card} from './components/ui';
function Guard({need,children}:{need:'user'|'mod'|'role';children:ReactElement}){
  const a=useAuth();
  if(!a.user)return <Navigate to="/login" replace/>;
  if(need!=='user'&&!a.mod)return <Navigate to="/modules" replace/>;
  if(need==='role'&&!a.role)return <Navigate to="/roles" replace/>;
  return children}
function Only({r,children}:{r:'m'|'s'|'d';children:ReactElement}){
  const {role}=useAuth();const k=role==='mahasiswa'?'m':role?.startsWith('dosen')?'d':'s';
  return k===r?children:<Navigate to="/app" replace/>}
function Index(){
  const {mod,role}=useAuth();
  if(mod==='ta')return <Card><h2 className="font-bold text-lg text-primary-900">Modul Tugas Akhir</h2><p className="text-sm text-slate-500 mt-2">Segera hadir (Coming Soon).</p></Card>;
  return role==='mahasiswa'?<Dashboard/>:<Home/>}
export default function App(){
  return <AuthProvider><BrowserRouter><Routes>
    <Route path="/login" element={<Login/>}/>
    <Route path="/modules" element={<Guard need="user"><Modules/></Guard>}/>
    <Route path="/roles" element={<Navigate to="/modules" replace/>}/>
    <Route path="/app" element={<Guard need="role"><Layout/></Guard>}>
      <Route index element={<Index/>}/>
      <Route path="pendaftaran" element={<Only r="m"><Register/></Only>}/>
      <Route path="logbook" element={<Only r="m"><Logbook/></Only>}/>
      <Route path="penyelesaian" element={<Only r="m"><Completion/></Only>}/>
      <Route path="perpanjangan" element={<Only r="m"><Extension/></Only>}/>
      <Route path="verifikasi" element={<Only r="s"><Verify/></Only>}/>
      <Route path="bimbingan" element={<Only r="d"><Advisees/></Only>}/>
    </Route>
    <Route path="*" element={<Navigate to="/login" replace/>}/>
  </Routes></BrowserRouter></AuthProvider>}
