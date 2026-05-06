import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FormComponentPropertyEditor from '../FormComponentPropertyEditor';
import { DraftInput } from '../DraftPropertyFields';
import {
  parseBoundedInteger,
  parsePositiveNumberList,
  parseTrimmedStringList,
} from '../draftPropertyParsers';
import type { PageComponent } from '../../../../../../types/websiteBuilder';

describe('DraftPropertyFields', () => {
  it('keeps an in-progress value visible while parent props are stale', () => {
    const onCommit = vi.fn();
    const { rerender } = render(
      <DraftInput aria-label="Draft value" value="25, 50" onCommit={onCommit} />
    );

    const input = screen.getByLabelText('Draft value');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '12,' } });

    rerender(<DraftInput aria-label="Draft value" value="25, 50" onCommit={onCommit} />);

    expect(input).toHaveValue('12,');
    expect(onCommit).not.toHaveBeenCalled();

    fireEvent.blur(input);

    expect(onCommit).toHaveBeenCalledWith('12,');
  });

  it('parses draft commits only when callers ask for normalized values', () => {
    expect(parsePositiveNumberList('12,')).toEqual([12]);
    expect(parsePositiveNumberList('25, 0, nope, 75.5')).toEqual([25, 75.5]);
    expect(parseTrimmedStringList(' intake, , referral ')).toEqual(['intake', 'referral']);
    expect(parseBoundedInteger('', 10, 1, 30)).toBe(10);
    expect(parseBoundedInteger('99', 10, 1, 30)).toBe(30);
  });
});

describe('website builder property fields', () => {
  it('lets suggested amount lists hold partial comma input until blur', () => {
    const onUpdateComponent = vi.fn();

    render(
      <FormComponentPropertyEditor
        selectedComponent={
          {
            id: 'donation-1',
            type: 'donation-form',
            suggestedAmounts: [25, 50],
          } as PageComponent
        }
        onUpdateComponent={onUpdateComponent}
      />
    );

    const input = screen.getByDisplayValue('25, 50');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '12,' } });

    expect(input).toHaveValue('12,');
    expect(onUpdateComponent).not.toHaveBeenCalled();

    fireEvent.blur(input);

    expect(onUpdateComponent).toHaveBeenCalledWith('donation-1', {
      suggestedAmounts: [12],
    });
  });

  it('allows default-backed text fields to be deleted while focused', () => {
    const onUpdateComponent = vi.fn();

    render(
      <FormComponentPropertyEditor
        selectedComponent={{ id: 'form-1', type: 'contact-form' } as PageComponent}
        onUpdateComponent={onUpdateComponent}
      />
    );

    const input = screen.getByDisplayValue('Send Message');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '' } });

    expect(input).toHaveValue('');
    expect(onUpdateComponent).not.toHaveBeenCalled();

    fireEvent.blur(input);

    expect(onUpdateComponent).toHaveBeenCalledWith('form-1', {
      submitText: undefined,
    });
  });

  it('lets currency drafts be blank before committing normalized text on blur', () => {
    const onUpdateComponent = vi.fn();

    render(
      <FormComponentPropertyEditor
        selectedComponent={
          {
            id: 'pledge-1',
            type: 'donation-pledge-form',
            currency: 'CAD',
          } as PageComponent
        }
        onUpdateComponent={onUpdateComponent}
      />
    );

    const input = screen.getByDisplayValue('CAD');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '' } });

    expect(input).toHaveValue('');
    expect(onUpdateComponent).not.toHaveBeenCalled();

    fireEvent.blur(input);

    expect(onUpdateComponent).toHaveBeenCalledWith('pledge-1', {
      currency: undefined,
    });
  });
});
