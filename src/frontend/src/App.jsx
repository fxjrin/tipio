import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { TipioLoaderWithText } from '@/components/TipioLoader';
import { Toaster } from 'sonner';

// Suspense fallback component
const LoadingFallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <TipioLoaderWithText text="Loading..." size={80} variant="colored" />
  </div>
);

// Lazy load pages for better performance
const Home = lazy(() => import('@/pages/Home'));
const Register = lazy(() => import('@/pages/Register'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Settings = lazy(() => import('@/pages/Settings'));
const Links = lazy(() => import('@/pages/Links'));
const Activity = lazy(() => import('@/pages/Activity'));
const Analytics = lazy(() => import('@/pages/Analytics'));
const TipPage = lazy(() => import('@/pages/TipPage'));
const SupportedTokens = lazy(() => import('@/pages/TokenManagement'));

// Protected route wrapper - requires Internet Identity authentication
function ProtectedRoute({ children }) {
  const { identity, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <TipioLoaderWithText text="Loading..." size={80} variant="colored" />
      </div>
    );
  }

  if (!identity.isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}

// Route that redirects if user doesn't have username
function RequireUsername({ children }) {
  const { hasUsername, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <TipioLoaderWithText text="Loading..." size={80} variant="colored" />
      </div>
    );
  }

  if (!hasUsername) {
    return <Navigate to="/register" replace />;
  }

  return children;
}

// Suspense wrapper untuk lazy loaded components
function SuspenseWrapper({ children }) {
  return <Suspense fallback={<LoadingFallback />}>{children}</Suspense>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <SuspenseWrapper>
            <Home />
          </SuspenseWrapper>
        }
      />
      <Route
        path="/register"
        element={
          <SuspenseWrapper>
            <ProtectedRoute>
              <Register />
            </ProtectedRoute>
          </SuspenseWrapper>
        }
      />
      <Route
        path="/dashboard"
        element={
          <SuspenseWrapper>
            <ProtectedRoute>
              <RequireUsername>
                <Dashboard />
              </RequireUsername>
            </ProtectedRoute>
          </SuspenseWrapper>
        }
      />
      <Route
        path="/settings"
        element={
          <SuspenseWrapper>
            <ProtectedRoute>
              <RequireUsername>
                <Settings />
              </RequireUsername>
            </ProtectedRoute>
          </SuspenseWrapper>
        }
      />
      <Route
        path="/links"
        element={
          <SuspenseWrapper>
            <ProtectedRoute>
              <RequireUsername>
                <Links />
              </RequireUsername>
            </ProtectedRoute>
          </SuspenseWrapper>
        }
      />
      <Route
        path="/analytics"
        element={
          <SuspenseWrapper>
            <ProtectedRoute>
              <Analytics />
            </ProtectedRoute>
          </SuspenseWrapper>
        }
      />
      <Route
        path="/activity"
        element={
          <SuspenseWrapper>
            <ProtectedRoute>
              <RequireUsername>
                <Activity />
              </RequireUsername>
            </ProtectedRoute>
          </SuspenseWrapper>
        }
      />
      <Route
        path="/tokens"
        element={
          <SuspenseWrapper>
            <SupportedTokens />
          </SuspenseWrapper>
        }
      />
      <Route
        path="/:username"
        element={
          <SuspenseWrapper>
            <TipPage />
          </SuspenseWrapper>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--card)',
              color: 'var(--foreground)',
              border: '2px solid var(--brand-yellow)',
              borderRadius: '12px',
              boxShadow: '0 0 15px rgba(247, 147, 26, 0.3)',
            },
            className: 'toast-custom',
          }}
          richColors
        />
      </AuthProvider>
    </Router>
  );
}
