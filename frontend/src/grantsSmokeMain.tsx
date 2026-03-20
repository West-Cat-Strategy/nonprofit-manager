import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import GrantsPage from './features/grants/pages/GrantsPage';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <MemoryRouter initialEntries={['/grants/awards']}>
    <div className="min-h-screen bg-app-bg text-app-text">
      <Routes>
        <Route path="/grants/*" element={<GrantsPage />} />
      </Routes>
    </div>
  </MemoryRouter>
);
