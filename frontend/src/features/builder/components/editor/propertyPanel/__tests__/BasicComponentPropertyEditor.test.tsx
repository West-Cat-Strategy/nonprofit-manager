import { fireEvent, render } from '@testing-library/react';
import { vi } from 'vitest';
import BasicComponentPropertyEditor from '../BasicComponentPropertyEditor';

describe('BasicComponentPropertyEditor URL handling', () => {
  it('blocks executable button href values before they are persisted', () => {
    const onUpdateComponent = vi.fn();

    const { container } = render(
      <BasicComponentPropertyEditor
        selectedComponent={{
          id: 'button-1',
          type: 'button',
          text: 'Learn more',
          href: 'https://example.com',
        }}
        onUpdateComponent={onUpdateComponent}
      />
    );

    const inputs = container.querySelectorAll('input[type="text"]');
    const hrefInput = inputs[1] as HTMLInputElement;

    fireEvent.change(hrefInput, {
      target: { value: 'javascript:alert(1)' },
    });

    expect(onUpdateComponent).toHaveBeenCalledWith('button-1', { href: '' });
  });

  it('blocks executable image src values before they are persisted', () => {
    const onUpdateComponent = vi.fn();

    const { container } = render(
      <BasicComponentPropertyEditor
        selectedComponent={{
          id: 'image-1',
          type: 'image',
          src: 'https://example.com/photo.jpg',
          alt: 'Photo',
        }}
        onUpdateComponent={onUpdateComponent}
      />
    );

    const srcInput = container.querySelector('input[type="text"]') as HTMLInputElement;

    fireEvent.change(srcInput, {
      target: { value: 'data:text/html,<svg onload=alert(1)>' },
    });

    expect(onUpdateComponent).toHaveBeenCalledWith('image-1', { src: '' });
  });
});
