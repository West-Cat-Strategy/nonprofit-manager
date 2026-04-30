import { DndContext } from '@dnd-kit/core';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import EditorCanvas from '../EditorCanvas';
import type { PageSection, TemplateTheme } from '../../../../../types/websiteBuilder';

const theme: TemplateTheme = {
  colors: {
    primary: '#f8e36b',
    secondary: '#17324d',
    accent: '#0e7490',
    background: '#ffffff',
    surface: '#f8fafc',
    text: '#102030',
    textMuted: '#475569',
    border: '#cbd5e1',
    error: '#b91c1c',
    success: '#15803d',
    warning: '#b45309',
  },
  typography: {
    fontFamily: 'Inter',
    headingFontFamily: 'Inter',
    baseFontSize: '16px',
    lineHeight: '1.5',
    headingLineHeight: '1.2',
    fontWeightNormal: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    xxl: '3rem',
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '1rem',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.15)',
  },
};

const sections: PageSection[] = [
  {
    id: 'section-1',
    name: 'Hero',
    components: [
      {
        id: 'button-1',
        type: 'button',
        text: 'Donate now',
        variant: 'primary',
        size: 'md',
      },
    ],
  },
];

const editorCanvasDefaults = {
  theme,
  selectedComponentId: null,
  selectedSectionId: null,
  onSelectComponent: vi.fn(),
  onSelectSection: vi.fn(),
  onAddSection: vi.fn(),
  onDeleteSection: vi.fn(),
  onDeleteComponent: vi.fn(),
  onDuplicateSection: vi.fn(),
  onDuplicateComponent: vi.fn(),
  onMoveSection: vi.fn(),
  onMoveComponent: vi.fn(),
};

describe('EditorCanvas', () => {
  it('uses a readable foreground color for light builder primary buttons', () => {
    render(
      <DndContext>
        <EditorCanvas
          sections={sections}
          {...editorCanvasDefaults}
        />
      </DndContext>
    );

    const donateButton = screen
      .getAllByRole('button', { name: 'Donate now' })
      .find((element) => element.tagName === 'BUTTON');

    expect(donateButton).toBeTruthy();
    expect(donateButton?.style.backgroundColor).toBe('rgb(248, 227, 107)');
    expect(donateButton?.style.color).toBe('rgb(16, 32, 48)');
  });

  it('calls selected component duplicate and move controls with boundary states', () => {
    const onDuplicateComponent = vi.fn();
    const onMoveComponent = vi.fn();
    const componentSections: PageSection[] = [
      {
        id: 'section-1',
        name: 'Hero',
        components: [
          {
            id: 'button-1',
            type: 'button',
            text: 'Donate now',
          },
          {
            id: 'text-1',
            type: 'text',
            content: 'Welcome',
          },
        ],
      },
    ];

    render(
      <DndContext>
        <EditorCanvas
          sections={componentSections}
          {...editorCanvasDefaults}
          selectedComponentId="text-1"
          onDuplicateComponent={onDuplicateComponent}
          onMoveComponent={onMoveComponent}
        />
      </DndContext>
    );

    expect(screen.getAllByLabelText('Duplicate component')).toHaveLength(1);

    fireEvent.click(screen.getByLabelText('Duplicate component'));
    fireEvent.click(screen.getByLabelText('Move component up'));

    expect(onDuplicateComponent).toHaveBeenCalledWith('text-1');
    expect(onMoveComponent).toHaveBeenCalledWith('text-1', 'up');
    expect(screen.getByLabelText('Move component down')).toBeDisabled();
  });

  it('calls selected section duplicate and move controls with boundary states', () => {
    const onDuplicateSection = vi.fn();
    const onMoveSection = vi.fn();
    const sectionSections: PageSection[] = [
      {
        id: 'section-1',
        name: 'Hero',
        components: [],
      },
      {
        id: 'section-2',
        name: 'Details',
        components: [],
      },
    ];

    render(
      <DndContext>
        <EditorCanvas
          sections={sectionSections}
          {...editorCanvasDefaults}
          selectedSectionId="section-1"
          onDuplicateSection={onDuplicateSection}
          onMoveSection={onMoveSection}
        />
      </DndContext>
    );

    expect(screen.getAllByLabelText('Duplicate section')).toHaveLength(1);

    fireEvent.click(screen.getByLabelText('Duplicate section'));
    fireEvent.click(screen.getByLabelText('Move section down'));

    expect(onDuplicateSection).toHaveBeenCalledWith('section-1');
    expect(onMoveSection).toHaveBeenCalledWith('section-1', 'down');
    expect(screen.getByLabelText('Move section up')).toBeDisabled();
  });
});
