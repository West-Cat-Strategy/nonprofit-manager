import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import GrantsPage from './features/grants/pages/GrantsPage';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element not found');
}

createRoot(root).render(
  <MemoryRouter initialEntries={['/grants/awards']}>
    <div className="min-h-screen bg-app-bg text-app-text">
      <Routes>
        <Route path="/grants/awards" element={<GrantsPage />} />
      </Routes>
    </div>
  </MemoryRouter>
);
