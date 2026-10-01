import React, { ReactElement } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './Auth';
import Layout from './components/Layout';
import Login from './pages/Login';
import { Modules } from './pages/Select';
import { Dashboard, Register, Logbook, Completion, Extension } from './pages/kp/mahasiswa';
import Notifications from './pages/Notifications';

// ─── KP Staff (folder baru) ───
import {
  KpStaffDashboard,
  KpStaffVerify,
  KpStaffCompletion,
  KpStaffExtension,
} from './pages/kp/staff';

// ─── KP Dosen (dari Advisees yang dipindah) ───
import DosenKP from './pages/kp/dosen';

// ─── TA Mahasiswa ───
import TADashboard from './pages/ta/mahasiswa/Dashboard';
import TARegister from './pages/ta/mahasiswa/Register';
import TAStatus from './pages/ta/mahasiswa/Status';
import TAExtension from './pages/ta/mahasiswa/Extension';
import TADefense from './pages/ta/mahasiswa/Defense';
import TADefenseStatus from './pages/ta/mahasiswa/DefenseStatus';
import TARevision from './pages/ta/mahasiswa/Revision';
import TACompletion from './pages/ta/mahasiswa/Completion';

// ─── TA Staff ───
import {
  TaStaffDashboard,
  TaStaffVerify,
  TaStaffSupervisors,
  TaStaffVerifyDefense,
  TaStaffScheduleDefense,
} from './pages/ta/staff';

function Guard({ need, children }: { need: 'user' | 'mod' | 'role'; children: ReactElement }) {
  const a = useAuth();
  if (!a.user) return <Navigate to="/login" replace />;
  if (need !== 'user' && !a.mod) return <Navigate to="/modules" replace />;
  if (need === 'role' && !a.role) return <Navigate to="/roles" replace />;
  return children;
}

function Only({ r, children }: { r: 'm' | 's' | 'd'; children: ReactElement }) {
  const { role } = useAuth();
  const k = role === 'mahasiswa' ? 'm' : role?.startsWith('dosen') ? 'd' : 's';
  return k === r ? children : <Navigate to="/app" replace />;
}

/** Index /app — KP. Render sesuai role. */
function Index() {
  const { mod, role } = useAuth();
  if (mod === 'ta') return <Navigate to="/app/ta" replace />;

  // Staff/Sekprodi/Kaprodi → dashboard staff KP
  if (role !== 'mahasiswa' && !role?.startsWith('dosen')) return <KpStaffDashboard />;
  // Dosen → dashboard dosen KP
  if (role?.startsWith('dosen')) return <DosenKP />;
  // Mahasiswa → dashboard mahasiswa KP
  return <Dashboard />;
}

/** Index /app/ta — render sesuai role. */
function TAIndex() {
  const { role } = useAuth();
  if (role === 'mahasiswa') return <TADashboard />;
  return <TaStaffDashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/modules"
            element={
              <Guard need="user">
                <Modules />
              </Guard>
            }
          />
          <Route path="/roles" element={<Navigate to="/modules" replace />} />

          {/* ═══ Modul KP ═══ */}
          <Route
            path="/app"
            element={
              <Guard need="role">
                <Layout />
              </Guard>
            }
          >
            <Route index element={<Index />} />

            {/* Mahasiswa KP */}
            <Route path="pendaftaran" element={<Only r="m"><Register /></Only>} />
            <Route path="logbook" element={<Only r="m"><Logbook /></Only>} />
            <Route path="penyelesaian" element={<Only r="m"><Completion /></Only>} />
            <Route path="perpanjangan" element={<Only r="m"><Extension /></Only>} />

            {/* Staff KP */}
            <Route path="verifikasi" element={<Only r="s"><KpStaffVerify /></Only>} />
            <Route path="penyelesaian-kp" element={<Only r="s"><KpStaffCompletion /></Only>} />
            <Route path="perpanjangan-kp" element={<Only r="s"><KpStaffExtension /></Only>} />

            {/* Dosen KP */}
            <Route path="bimbingan" element={<Only r="d"><DosenKP /></Only>} />

            <Route path="notifikasi" element={<Notifications />} />
          </Route>

          {/* ═══ Modul TA ═══ */}
          <Route
            path="/app/ta"
            element={
              <Guard need="role">
                <Layout />
              </Guard>
            }
          >
            <Route index element={<TAIndex />} />

            {/* Mahasiswa TA */}
            <Route path="pendaftaran" element={<Only r="m"><TARegister /></Only>} />
            <Route path="status-pendaftaran" element={<Only r="m"><TAStatus /></Only>} />
            <Route path="perpanjangan" element={<Only r="m"><TAExtension /></Only>} />
            <Route path="pengajuan-sidang" element={<Only r="m"><TADefense /></Only>} />
            <Route path="status-sidang" element={<Only r="m"><TADefenseStatus /></Only>} />
            <Route path="revisi" element={<Only r="m"><TARevision /></Only>} />
            <Route path="penyelesaian" element={<Only r="m"><TACompletion /></Only>} />

            {/* Staff TA */}
            <Route path="verifikasi" element={<Only r="s"><TaStaffVerify /></Only>} />
            <Route path="dospem" element={<Only r="s"><TaStaffSupervisors /></Only>} />
            <Route path="verifikasi-sidang" element={<Only r="s"><TaStaffVerifyDefense /></Only>} />
            <Route path="jadwal-sidang" element={<Only r="s"><TaStaffScheduleDefense /></Only>} />

            <Route path="notifikasi" element={<Notifications />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}