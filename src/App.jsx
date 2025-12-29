
import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import RegisterWithInvitation from '@/pages/RegisterWithInvitation';
import Dashboard from '@/pages/Dashboard';
import StorePage from '@/pages/StorePage';
import ProductDetailPage from '@/pages/ProductDetailPage';
import SuccessPage from '@/pages/SuccessPage';
import SubscriptionPlansPage from '@/pages/SubscriptionPlansPage';
import SubscriptionSuccessPage from '@/pages/SubscriptionSuccessPage';
import AdminLogin from '@/pages/admin/AdminLogin';
import WebDevConsole from '@/pages/admin/WebDevConsole';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider, useAuth } from '@/contexts/SupabaseAuthContext';
import { CartProvider } from '@/hooks/useCart';
import { SubscriptionProvider } from '@/hooks/useSubscription';
import { GeolocationProvider } from '@/contexts/GeolocationContext';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Debug wrapper to log current route
const RouteDebug = ({ children }) => {
  const location = useLocation();
  return children;
};

// Protected Route Wrapper for Users
const UserRoute = ({ children }) => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return session ? children : <Navigate to="/login" />;
};

// Protected Route Wrapper for Admins
const AdminRoute = ({ children }) => {
  const { session, loading } = useAuth();

  if (loading) {
    return <div className="flex h-screen w-full items-center justify-center bg-slate-950"><Loader2 className="animate-spin text-white" /></div>;
  }

  if (!session) {
    return <Navigate to="/admin/login" />;
  }

  return children;
};

function AppRoutes() {
  const { loading } = useAuth();
  const [showSpinner, setShowSpinner] = useState(true);
  const [longLoad, setLongLoad] = useState(false);

  useEffect(() => {
    // Stop spinner immediately when auth is ready
    if (!loading) {
      setShowSpinner(false);
      return;
    }

    // Safety timeout 1: Show "taking longer" message after 3s
    const longLoadTimer = setTimeout(() => {
      if (loading) setLongLoad(true);
    }, 3000);

    // Safety timeout 2: Force stop spinner after 6s regardless of auth state
    const forceStopTimer = setTimeout(() => {
      setShowSpinner(false);
    }, 6000);

    return () => {
      clearTimeout(longLoadTimer);
      clearTimeout(forceStopTimer);
    };
  }, [loading]);

  if (loading && showSpinner) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#020617] text-white px-4">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
          </div>
        </div>

        <p className="text-slate-400 text-sm mt-6 font-medium tracking-wide animate-pulse">
          STARTING STOKCER...
        </p>

        {longLoad && (
          <div className="mt-8 flex flex-col items-center animate-in fade-in slide-in-from-bottom-2">
            <p className="text-xs text-slate-500 mb-3 max-w-xs text-center">
              Connection is slower than usual.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="border-slate-700 text-slate-300 hover:text-white"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <Router>
      <RouteDebug>
        <Routes>
          {/* Public Landing & Auth */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register-invite" element={<RegisterWithInvitation />} />

          {/* Public Store Routes */}
          <Route path="/store" element={<StorePage />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
          <Route path="/success" element={<SuccessPage />} />
          <Route path="/pricing" element={<SubscriptionPlansPage />} />

          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/console" element={
            <AdminRoute>
              <WebDevConsole />
            </AdminRoute>
          } />
          <Route path="/admin/dashboard" element={
            <AdminRoute>
              <WebDevConsole />
            </AdminRoute>
          } />

          {/* User Routes */}
          <Route path="/dashboard" element={
            <UserRoute>
              <Dashboard />
            </UserRoute>
          } />
          <Route path="/subscription/success" element={
            <UserRoute>
              <SubscriptionSuccessPage />
            </UserRoute>
          } />

          {/* Catch all - Redirect to root */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </RouteDebug>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <GeolocationProvider>
          <CartProvider>
            <Helmet>
              <title>Stokcer - Modern Inventory Management</title>
              <meta name="description" content="Stokcer - The ultimate inventory management system for modern businesses." />
            </Helmet>
            <AppRoutes />
            <Toaster />
          </CartProvider>
        </GeolocationProvider>
      </SubscriptionProvider>
    </AuthProvider>
  );
}

export default App;
