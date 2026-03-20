import { lazy, Suspense, ReactNode } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useAdminAuth } from './contexts/AdminAuthContext';
import { SDKProvider } from './contexts/SDKContext';
import AppLayout from './layouts/AppLayout';
import AuthLayout from './layouts/AuthLayout';
import AdminLayout from './layouts/AdminLayout';

// Regular portal pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Members = lazy(() => import('./pages/Members'));
const Events = lazy(() => import('./pages/Events'));
const Sacraments = lazy(() => import('./pages/Sacraments'));
const Finance = lazy(() => import('./pages/Finance'));
const LoginPage = lazy(() => import('./pages/LoginPage'));

// Admin portal pages
const AdminLoginPage       = lazy(() => import('./pages/admin/AdminLoginPage'));
const AdminDashboard       = lazy(() => import('./pages/admin/Dashboard'));
const AdminChurchUnits     = lazy(() => import('./pages/admin/ChurchUnits'));
const AdminChurchUnitDetail = lazy(() => import('./pages/admin/ChurchUnitDetail'));
const AdminParishioners    = lazy(() => import('./pages/admin/Parishioners'));
const AdminParishionerDetail = lazy(() => import('./pages/admin/ParishionerDetail'));
const AdminCommunities     = lazy(() => import('./pages/admin/Communities'));
const AdminCommunityDetail = lazy(() => import('./pages/admin/CommunityDetail'));
const AdminSocieties       = lazy(() => import('./pages/admin/Societies'));
const AdminSocietyDetail   = lazy(() => import('./pages/admin/SocietyDetail'));
const AdminSacraments      = lazy(() => import('./pages/admin/Sacraments'));
const AdminSacramentDetail = lazy(() => import('./pages/admin/SacramentDetail'));
const AdminFinance         = lazy(() => import('./pages/admin/Finance'));
const AdminSettings        = lazy(() => import('./pages/admin/Settings'));
const AdminUsers           = lazy(() => import('./pages/admin/Users'));
const AdminEvents          = lazy(() => import('./pages/admin/Events'));
const AdminLeadership      = lazy(() => import('./pages/admin/Leadership'));
const AdminRoles           = lazy(() => import('./pages/admin/Roles'));
const AdminAddParishioner  = lazy(() => import('./pages/admin/AddParishioner'));

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <svg className="animate-spin h-6 w-6 text-olive" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    </div>
  );
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function AdminPrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAdminAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login/admin" replace />;
}

function AdminSDKProvider({ children }: { children: ReactNode }) {
  const { logout } = useAdminAuth();
  return (
    <SDKProvider baseUrl={API_BASE_URL} tokenKey="admin_token" onUnauthorized={logout}>
      {children}
    </SDKProvider>
  );
}

export function App() {
  return (
    <Routes>

      {/* ── Regular auth ── */}
      <Route element={<Suspense fallback={<PageLoader />}><AuthLayout /></Suspense>}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* ── Regular app ── */}
      <Route element={<Suspense fallback={<PageLoader />}><PrivateRoute><AppLayout /></PrivateRoute></Suspense>}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/members" element={<Members />} />
        <Route path="/events" element={<Events />} />
        <Route path="/sacraments" element={<Sacraments />} />
        <Route path="/finance" element={<Finance />} />
      </Route>

      {/* ── Admin auth ── */}
      <Route path="/login/admin" element={<Suspense fallback={<PageLoader />}><AdminLoginPage /></Suspense>} />

      {/* ── Admin portal — Suspense lives inside AdminLayout so sidebar never unmounts ── */}
      <Route element={
        <AdminPrivateRoute>
          <AdminSDKProvider>
            <AdminLayout />
          </AdminSDKProvider>
        </AdminPrivateRoute>
      }>
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/dashboard"         element={<AdminDashboard />} />
        <Route path="/admin/church-units"      element={<AdminChurchUnits />} />
        <Route path="/admin/church-units/:id"  element={<AdminChurchUnitDetail />} />
        <Route path="/admin/parishioners"          element={<AdminParishioners />} />
        <Route path="/admin/parishioners/new"   element={<AdminAddParishioner />} />
        <Route path="/admin/parishioners/:id"  element={<AdminParishionerDetail />} />
        <Route path="/admin/communities"       element={<AdminCommunities />} />
        <Route path="/admin/communities/:id"   element={<AdminCommunityDetail />} />
        <Route path="/admin/societies"         element={<AdminSocieties />} />
        <Route path="/admin/societies/:id"     element={<AdminSocietyDetail />} />
        <Route path="/admin/sacraments"        element={<AdminSacraments />} />
        <Route path="/admin/sacraments/:id"    element={<AdminSacramentDetail />} />
        <Route path="/admin/finance"           element={<AdminFinance />} />
        <Route path="/admin/settings"          element={<AdminSettings />} />
        <Route path="/admin/users"             element={<AdminUsers />} />
        <Route path="/admin/events"            element={<AdminEvents />} />
        <Route path="/admin/leadership"        element={<AdminLeadership />} />
        <Route path="/admin/roles"             element={<AdminRoles />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
