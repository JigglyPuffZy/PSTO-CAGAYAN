import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';

// Each page (and its heavy libraries: charts, Leaflet) loads only when first opened.
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const FirmsPage = lazy(() => import('./pages/FirmsPage').then((m) => ({ default: m.FirmsPage })));
const MapPage = lazy(() => import('./pages/MapPage').then((m) => ({ default: m.MapPage })));
const AboutPage = lazy(() => import('./pages/AboutPage').then((m) => ({ default: m.AboutPage })));

function PageFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-[var(--dost-pale)] border-t-[var(--dost-primary)]" />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route index element={<DashboardPage />} />
                <Route path="firms" element={<FirmsPage />} />
                <Route path="map" element={<MapPage />} />
                <Route path="about" element={<AboutPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
