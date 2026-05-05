import { render, screen } from '@testing-library/react';
import AdminPanelLayout from '../AdminPanelLayout';
import { AdminActionGroup, AdminFilterToolbar } from '../AdminWorkspacePrimitives';

describe('AdminPanelLayout', () => {
  it('renders header, sidebar, and content slots', () => {
    render(
      <AdminPanelLayout
        title="Admin Test"
        description="Layout description"
        actions={<button type="button">Header Action</button>}
        sidebar={<div>Sidebar Content</div>}
        mobileNav={<div>Mobile Navigation</div>}
      >
        <div>Main Content</div>
      </AdminPanelLayout>
    );

    expect(screen.getByRole('heading', { name: /admin test/i })).toBeInTheDocument();
    expect(screen.getByText(/layout description/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /header action/i })).toBeInTheDocument();
    expect(screen.getByText(/sidebar content/i)).toBeInTheDocument();
    expect(screen.getByText(/mobile navigation/i)).toBeInTheDocument();
    expect(screen.getByText(/main content/i)).toBeInTheDocument();
  });

  it('keeps admin filter and action primitives responsive by default', () => {
    render(
      <div>
        <AdminFilterToolbar>
          <input aria-label="Filter field" />
        </AdminFilterToolbar>
        <AdminActionGroup>
          <button type="button">Approve Request</button>
          <button type="button">Reject Request</button>
        </AdminActionGroup>
      </div>
    );

    expect(screen.getByLabelText('Filter field').parentElement?.className).toContain(
      'repeat(auto-fit'
    );
    expect(screen.getByRole('button', { name: /approve request/i }).parentElement?.className).toContain(
      '[&>*]:w-full'
    );
  });
});
