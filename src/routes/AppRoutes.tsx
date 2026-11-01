import { lazy, Suspense } from "react";
import {
  BrowserRouter,
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { Button } from "@/components/ui";
import { LoginPage } from "@/pages/LoginPage";
const MonitoringPage = lazy(() =>
  import("@/pages/MonitoringPage").then((module) => ({
    default: module.MonitoringPage,
  })),
);
const MasterPage = lazy(() =>
  import("@/pages/MasterPage").then((module) => ({
    default: module.MasterPage,
  })),
);
const EmployeesPage = lazy(() =>
  import("@/pages/EmployeesPage").then((module) => ({
    default: module.EmployeesPage,
  })),
);

function AdminLayout() {
  const { isLoggedIn } = useAuth();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return (
    <div className="admin-app">
      <AdminHeader />
      <nav className="admin-nav" aria-label="Navigasi admin">
        <NavLink to="/" end>
          Pemantauan Absensi
        </NavLink>
        <NavLink to="/karyawan">Karyawan</NavLink>
        <NavLink to="/mitra">Mitra</NavLink>
        <NavLink to="/bidang">Bidang</NavLink>
      </nav>
      <div className="admin-content">
        <Suspense
          fallback={
            <div className="page-loading" role="status">
              Memuat halaman…
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </div>
    </div>
  );
}
export function AppRoutes() {
  const { isLoggedIn, loading, sessionError, checkSession } = useAuth();
  if (loading)
    return (
      <div className="session-state" role="status">
        <span className="spinner" />
        Memeriksa sesi admin…
      </div>
    );
  if (sessionError)
    return (
      <div className="session-state">
        <p role="alert">{sessionError}</p>
        <Button onClick={() => void checkSession()}>Coba lagi</Button>
      </div>
    );
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route
          path="/login"
          element={isLoggedIn ? <Navigate to="/" replace /> : <LoginPage />}
        />
        <Route element={<AdminLayout />}>
          <Route index element={<MonitoringPage />} />
          <Route
            path="mitra"
            element={<MasterPage key="mitra" kind="mitra" />}
          />
          <Route
            path="bidang"
            element={<MasterPage key="bidang" kind="bidang" />}
          />
          <Route path="karyawan" element={<EmployeesPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
