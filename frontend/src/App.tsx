import { Suspense } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import ToastHost from './components/ToastHost';
import AppRoutes from './routes/index';
import PageLoader from './components/PageLoader';
import './App.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-app-bg text-app-text transition-colors duration-300">
        <ThemeProvider>
          <Suspense fallback={<PageLoader />}>
            <AppRoutes />
          </Suspense>
          <ToastHost />
        </ThemeProvider>
      </div>
    </Router>
  );
}

export default App;
