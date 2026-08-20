import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, Navigate, Outlet } from 'react-router-dom';
import { ReactNode } from 'react';
import { Layout } from './components/Layout';
import { DashboardLayout } from './components/DashboardLayout';
import { Home } from './pages/Home';
import { Auth } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { Admin } from './pages/Admin';
import Workers from './pages/Workers';
import { Transactions } from './pages/Transactions';
import { VerifyEmail } from './pages/VerifyEmail';
import { Terms } from './pages/Terms';
import { Privacy } from './pages/Privacy';
import { Transparency } from './pages/Transparency';
import { Education } from './pages/Education';
import { Community } from './pages/Community';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PwaProvider, usePwa } from './contexts/PwaContext';
import { SessionSecurityProvider } from './contexts/SessionSecurityContext';
import { CurrencyProvider } from './contexts/CurrencyContext';
import { GlobalConfigProvider, useConfig } from './contexts/GlobalConfigContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Toaster } from '@/components/ui/sonner';
import { useVisitorTracker } from './hooks/useVisitorTracker';
import { MaintenancePage } from './components/MaintenancePage';
import { SplashScreen } from './components/SplashScreen';
import { useAuth, AuthProvider } from './hooks/useAuth';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, auth } from './lib/firebase';
import { SupportHub } from './components/SupportHub';

function ProtectedRoute({ children, isEmailVerified, user }: { children?: ReactNode, isEmailVerified: boolean, user: any }) {
  const location = useLocation();
  if (!user) {
    const encodedPath = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth/login?redirect=${encodedPath}`} replace />;
  }
  if (!isEmailVerified) {
    return <Navigate to="/verify-email" replace />;
  }
  return children ? <>{children}</> : <Outlet />;
}

function RoleProtectedRoute({ children, isEmailVerified, user, isAllowed, redirectPath }: { children?: ReactNode, isEmailVerified: boolean, user: any, isAllowed: boolean, redirectPath: string }) {
  const location = useLocation();
  if (!user) {
    const encodedPath = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth/login?redirect=${encodedPath}`} replace />;
  }
  if (!isEmailVerified) {
    return <Navigate to="/verify-email" replace />;
  }
  if (!isAllowed) {
    return <Navigate to={redirectPath} replace />;
  }
  return children ? <>{children}</> : <Outlet />;
}

function AppContent() {
  const { isAppReady, maintenanceMode } = useConfig();
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isWorker, setIsWorker] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(true);
  const [checkingAuthData, setCheckingAuthData] = useState(true);
  const navigate = useNavigate();
  const { pathname, search, hash } = useLocation();

  // App Mode & Splash Screen State
  const [isAppMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const isStandaloneElement = window.matchMedia('(display-mode: standalone)').matches;
      const navStandalone = (navigator as any).standalone;
      const hasPwaQuery = window.location.search.includes('source=pwa') || window.location.search.includes('utm_source=pwa');
      return !!(isStandaloneElement || navStandalone || hasPwaQuery);
    }
    return false;
  });

  const [splashFinished, setSplashFinished] = useState(false);
  const [hasFullyBooted, setHasFullyBooted] = useState(false);

  const isAppInitializing = !isAppReady || authLoading || (user && checkingAuthData) || (!user && auth.currentUser);

  // Show splash screen only in standalone/PWA mode on first load of the session
  const [showSplash] = useState(() => {
    if (typeof window !== 'undefined') {
      if (isAppMode) {
        if (!sessionStorage.getItem('pwa_splash_shown')) {
          sessionStorage.setItem('pwa_splash_shown', 'true');
          return true;
        }
      }
    }
    return false;
  });

  useEffect(() => {
    if (!showSplash) {
      setHasFullyBooted(true);
    }
  }, [showSplash]);

  useEffect(() => {
    if (showSplash && splashFinished) {
      setHasFullyBooted(true);
    }
  }, [showSplash, splashFinished]);

  // Smooth scroll to hash anchors
  useEffect(() => {
    if (pathname === '/' && hash) {
      const elementId = hash.replace('#', '');
      const element = document.getElementById(elementId);
      if (element) {
        const timeoutId = setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [pathname, hash]);

  useVisitorTracker(user, isAdmin);

  // Redirect logic for App Mode
  useEffect(() => {
    if (isAppMode && hasFullyBooted && !authLoading && (pathname === '/' || pathname === '/transparency' || pathname === '/education' || pathname === '/community')) {
      if (user) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/auth', { replace: true });
      }
    }
  }, [isAppMode, hasFullyBooted, pathname, user, authLoading, navigate]);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setIsWorker(false);
      setIsEmailVerified(true);
      setCheckingAuthData(false);
      return;
    }

    setCheckingAuthData(true);
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      const emailLower = user.email?.toLowerCase() || "";
      const isAdminEmail = emailLower === 'admin@aetheris.com' || emailLower === 'samdenic01@gmail.com';
      if (docSnap.exists()) {
        const data = docSnap.data();
        const isAdminUser = data.role === 'admin' || isAdminEmail;
        setIsAdmin(isAdminUser);
        setIsWorker(data.role === 'worker' || isAdminUser);
        const verified = isAdminUser ? true : data.email_verified !== false;
        setIsEmailVerified(verified);
        if (verified) {
          localStorage.removeItem('recent_successful_signup');
        }
      } else {
        setIsAdmin(isAdminEmail);
        setIsWorker(isAdminEmail);
        const bypass = localStorage.getItem('registration_in_progress') === 'true' || localStorage.getItem('recent_successful_signup') === 'true';
        setIsEmailVerified(isAdminEmail ? true : bypass);
      }
      setCheckingAuthData(false);
    }, (error) => {
      console.error("Firestore loading error:", error);
      setCheckingAuthData(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Handle route guarding
  useEffect(() => {
    const isAuthSyncing = !user && auth.currentUser;
    
    if (!authLoading && !checkingAuthData && !isAuthSyncing) {
      const isSignupBypass = localStorage.getItem('recent_successful_signup') === 'true' || localStorage.getItem('registration_in_progress') === 'true';
      const actualEmailVerified = isEmailVerified || isSignupBypass;

      if (user && !actualEmailVerified) {
        const isRestrictedPath = pathname.startsWith('/dashboard') || 
                                 pathname.startsWith('/transactions') || 
                                 pathname.startsWith('/myadmin') || 
                                 pathname.startsWith('/worker');
        if (isRestrictedPath) {
          navigate('/verify-email', { replace: true });
        }
      } else if (!user && pathname === '/verify-email') {
        const searchParams = new URLSearchParams(search);
        if (!searchParams.get('token')) {
          navigate('/auth', { replace: true });
        }
      } else if (user && actualEmailVerified && pathname === '/verify-email') {
        const searchParams = new URLSearchParams(search);
        if (!searchParams.get('token')) {
          navigate('/dashboard', { replace: true });
        }
      }
    }
  }, [user, isEmailVerified, authLoading, checkingAuthData, pathname, search, navigate]);

  if (!hasFullyBooted || isAppInitializing) {
    return <SplashScreen onComplete={() => setSplashFinished(true)} />;
  }

  if (maintenanceMode && !isAdmin) {
    return <MaintenancePage />;
  }

  return (
    <>
      <Routes>
        <Route path="/" element={isAppMode ? <Navigate to={user ? "/dashboard" : "/auth"} replace /> : <Layout />}>
          <Route index element={<Home />} />
          <Route path="transparency" element={<Transparency />} />
          <Route path="education" element={<Education />} />
          <Route path="community" element={<Community />} />
        </Route>
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/login" element={<Auth />} />
        <Route path="/auth/signup" element={<Auth />} />
        <Route path="/auth/magic-login" element={<Auth />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        
        <Route element={<ProtectedRoute user={user} isEmailVerified={isEmailVerified}><DashboardLayout /></ProtectedRoute>}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="transactions" element={<Transactions />} />
        </Route>

        <Route element={<ProtectedRoute user={user} isEmailVerified={isEmailVerified} />}>
          <Route path="worker" element={<Workers />} />
          <Route path="workers" element={<Navigate to="/worker" replace />} />
        </Route>

        <Route path="myadmin" element={<Admin />} />
        <Route path="admin" element={<Navigate to="/myadmin" replace />} />
      </Routes>
      <SupportHub />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <PwaProvider>
          <GlobalConfigProvider>
            <AuthProvider>
              <SessionSecurityProvider>
                <ThemeProvider>
                  <CurrencyProvider>
                    <AppContent />
                    <OfflineIndicator />
                    <Toaster richColors position="top-center" />
                  </CurrencyProvider>
                </ThemeProvider>
              </SessionSecurityProvider>
            </AuthProvider>
          </GlobalConfigProvider>
        </PwaProvider>
      </Router>
    </ErrorBoundary>
  );
}
