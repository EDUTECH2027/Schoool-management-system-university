import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import ForcePasswordChange from './pages/ForcePasswordChange';

// Each role only ever needs its own route tree — lazy-loading these means a
// parent's session, for example, never downloads the admin/teacher/platform
// page bundles at all, instead of every role's code shipping to every user.
const AdminRoutes    = lazy(() => import('./routes/AdminRoutes'));
const TeacherRoutes  = lazy(() => import('./routes/TeacherRoutes'));
const StudentRoutes  = lazy(() => import('./routes/StudentRoutes'));
const ParentRoutes   = lazy(() => import('./routes/ParentRoutes'));
const PlatformRoutes = lazy(() => import('./routes/PlatformRoutes'));
const FinanceRoutes  = lazy(() => import('./routes/FinanceRoutes'));
const AcademicRoutes = lazy(() => import('./routes/AcademicRoutes'));
const LibrarianRoutes = lazy(() => import('./routes/LibrarianRoutes'));
const VerifyDocument = lazy(() => import('./pages/VerifyDocument'));

function RouteLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function AppRoutes() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  // Public document verification (QR codes on printed documents): no login required.
  if (pathname.startsWith('/verify')) {
    return <Suspense fallback={<RouteLoadingFallback />}><Routes><Route path="/verify/:code?" element={<VerifyDocument />} /><Route path="*" element={<VerifyDocument />} /></Routes></Suspense>;
  }

  if (!user) return <Login />;
  if (user.must_change_password) return <ForcePasswordChange />;

  let RoleRoutes: typeof AdminRoutes | null = null;
  if (user.role === 'platform_owner' || user.role === 'platform_admin') RoleRoutes = PlatformRoutes;
  else if (user.role === 'super_admin' || user.role === 'head_teacher') RoleRoutes = AdminRoutes;
  else if (user.role === 'teacher') RoleRoutes = TeacherRoutes;
  else if (user.role === 'student') RoleRoutes = StudentRoutes;
  else if (user.role === 'parent')  RoleRoutes = ParentRoutes;
  else if (user.role === 'finance_officer') RoleRoutes = FinanceRoutes;
  else if (user.role === 'academic_officer') RoleRoutes = AcademicRoutes;
  else if (user.role === 'librarian') RoleRoutes = LibrarianRoutes;

  if (!RoleRoutes) return <Routes><Route path="*" element={<Login />} /></Routes>;

  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <RoleRoutes />
    </Suspense>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
