import { lazy, useEffect, Suspense } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import ToastHost from './components/ToastHost';
import PageLoader from './components/PageLoader';
import { useAppDispatch } from './store/hooks';
import { initializeAuth } from './store/slices/authSlice';
import './App.css';

const AppRoutes = lazy(() => import('./routes'));

const AppRouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-app-bg text-app-text-muted">
    <PageLoader />
  </div>
);

function App() {
  const dispatch = useAppDispatch();
  const uiRedesignEnabled = import.meta.env.VITE_UI_REDESIGN_ENABLED === 'true';

  useEffect(() => {
    dispatch(initializeAuth());
  }, [dispatch]);

  useEffect(() => {
    if (uiRedesignEnabled) {
      document.body.classList.add('ui-redesign');
    } else {
      document.body.classList.remove('ui-redesign');
    }
    return () => {
      document.body.classList.remove('ui-redesign');
    };
  }, [uiRedesignEnabled]);

  return (
    <Router>
      <div className="min-h-screen bg-app-bg text-app-text transition-colors duration-300">
        <ThemeProvider>
          <Suspense fallback={<AppRouteFallback />}>
            <AppRoutes />
          </Suspense>
          <ToastHost />
        </ThemeProvider>
      </div>
    </Router>
  );
}

export default App;
