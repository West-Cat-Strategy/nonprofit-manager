import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PeopleCard from '../PeopleCard';

describe('PeopleCard', () => {
  it('uses stronger heading contrast on neutral cards', () => {
    const { container } = render(
      <PeopleCard
        person={{
          id: 'person-1',
          firstName: 'Riley',
          lastName: 'Chen',
          fullName: 'Riley Chen',
          email: 'riley@example.org',
          role: 'board',
          status: 'active',
          title: 'Board Chair',
          cardColor: 'gray',
        }}
      />
    );

    expect(container.firstChild).toHaveClass('bg-app-surface-elevated');
    expect(screen.getByRole('heading', { name: 'Riley Chen' }).className).toContain(
      'text-app-text-heading'
    );
  });

  it('keeps bright cards on brutal-ink text for readable demo names', () => {
    render(
      <PeopleCard
        person={{
          id: 'person-2',
          firstName: 'Avery',
          lastName: 'Stone',
          fullName: 'Avery Stone',
          email: 'avery@example.org',
          role: 'staff',
          status: 'active',
          title: 'Outreach Lead',
          cardColor: 'pink',
        }}
      />
    );

    expect(screen.getByRole('heading', { name: 'Avery Stone' }).className).toContain('text-black');
  });
});
