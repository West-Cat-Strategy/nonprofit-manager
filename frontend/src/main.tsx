import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store';
import './index.css';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './contexts/ToastContext';
import { BrandingProvider } from './contexts/BrandingContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <Provider store={store}>
        <ToastProvider>
          <BrandingProvider>
            <App />
          </BrandingProvider>
        </ToastProvider>
      </Provider>
    </ErrorBoundary>
  </StrictMode>
);
