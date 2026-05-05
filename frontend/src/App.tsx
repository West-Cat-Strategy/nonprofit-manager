import { lazy, useEffect, Suspense } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import ToastHost from './components/ToastHost';
import PageLoader from './components/PageLoader';
import ErrorBoundary from './components/ErrorBoundary';
import { useAppDispatch } from './store/hooks';
import { initializeAuth } from './features/auth/state';
import './App.css';

const AppRoutes = lazy(() => import('./routes'));

const AppRouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-app-bg text-app-text-muted">
    <PageLoader />
  </div>
);

function App() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(initializeAuth());
  }, [dispatch]);

  useEffect(() => {
    document.body.classList.add('ui-redesign');
    return () => {
      document.body.classList.remove('ui-redesign');
    };
  }, []);

  return (
    <Router>
      <ErrorBoundary>
        <div className="min-h-screen bg-app-bg text-app-text transition-colors duration-300">
          <ThemeProvider>
            <Suspense fallback={<AppRouteFallback />}>
              <AppRoutes />
            </Suspense>
            <ToastHost />
          </ThemeProvider>
        </div>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
