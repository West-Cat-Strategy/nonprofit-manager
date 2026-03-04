import { render, screen } from '@testing-library/react';
import AdminPanelLayout from '../AdminPanelLayout';

describe('AdminPanelLayout', () => {
  it('renders header, sidebar, and content slots', () => {
    render(
      <AdminPanelLayout
        title="Admin Test"
        description="Layout description"
        actions={<button type="button">Header Action</button>}
        sidebar={<div>Sidebar Content</div>}
      >
        <div>Main Content</div>
      </AdminPanelLayout>
    );

    expect(screen.getByRole('heading', { name: /admin test/i })).toBeInTheDocument();
    expect(screen.getByText(/layout description/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /header action/i })).toBeInTheDocument();
    expect(screen.getByText(/sidebar content/i)).toBeInTheDocument();
    expect(screen.getByText(/main content/i)).toBeInTheDocument();
  });
});
