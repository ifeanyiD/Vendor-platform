import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AdminProvider, useAdmin } from './context/AdminContext';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';

// Eager-load critical paths
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Lazy-load heavier pages
const DashboardPage      = lazy(() => import('./pages/DashboardPage'));
const StorePage          = lazy(() => import('./pages/StorePage'));
const SetupStorePage     = lazy(() => import('./pages/SetupStorePage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage  = lazy(() => import('./pages/ResetPasswordPage'));
const VerifyEmailPage    = lazy(() => import('./pages/VerifyEmailPage'));
const AdminLoginPage     = lazy(() => import('./pages/Admin/AdminLoginPage'));
const AdminDashboard     = lazy(() => import('./pages/Admin/AdminDashboard'));

import './styles/globals.scss';

const PageLoader = () => (
  <div className="page-loader"><div className="spinner" /></div>
);

// ── Session expiry listener ───────────────────────────────────────────────────
function SessionWatcher() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    const handler = () => {
      logout();
      toast.error('Your session expired. Please log in again.');
      navigate('/login');
    };
    window.addEventListener('vendora:session-expired', handler);
    return () => window.removeEventListener('vendora:session-expired', handler);
  }, [navigate, logout]);

  return null;
}

// ── Route guards ──────────────────────────────────────────────────────────────
const ProtectedRoute = ({ children }) => {
  const { vendor, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!vendor) return <Navigate to="/login" replace />;
  return children;
};

const PublicOnlyRoute = ({ children }) => {
  const { vendor, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (vendor) return <Navigate to="/dashboard" replace />;
  return children;
};

const AdminRoute = ({ children }) => {
  const { admin, loading } = useAdmin();
  if (loading) return <PageLoader />;
  if (!admin) return <Navigate to="/admin" replace />;
  return children;
};

// ── Routes ────────────────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <>
      <SessionWatcher />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public */}
          <Route path="/"              element={<LandingPage />} />
          <Route path="/store/:slug"   element={<StorePage />} />
          <Route path="/verify-email"  element={<VerifyEmailPage />} />

          {/* Auth */}
          <Route path="/login"            element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
          <Route path="/register"         element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
          <Route path="/forgot-password"  element={<PublicOnlyRoute><ForgotPasswordPage /></PublicOnlyRoute>} />
          <Route path="/reset-password"   element={<PublicOnlyRoute><ResetPasswordPage /></PublicOnlyRoute>} />

          {/* Vendor Protected */}
          <Route path="/dashboard"    element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/setup-store"  element={<ProtectedRoute><SetupStorePage /></ProtectedRoute>} />

          {/* Admin */}
          <Route path="/admin"           element={<AdminLoginPage />} />
          <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

// ── App root ──────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <ErrorBoundary fullPage>
      <ThemeProvider>
        <AdminProvider>
          <AuthProvider>
            <BrowserRouter>
              <AppRoutes />
              <Toaster
                position="top-right"
                toastOptions={{
                  style: {
                    fontFamily: 'DM Sans, sans-serif',
                    borderRadius: '12px',
                    border: '1px solid var(--gray-200)',
                    background: 'var(--white)',
                    color: 'var(--dark)',
                  },
                  success: { iconTheme: { primary: '#2d8653', secondary: '#fff' } }
                }}
              />
            </BrowserRouter>
          </AuthProvider>
        </AdminProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
