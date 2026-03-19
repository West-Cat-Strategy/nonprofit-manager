import { THEME_REGISTRY, type ThemeId } from '../../theme/themeRegistry';
import { classNames } from '../ui/classNames';

interface ThemePreviewSwatchProps {
  themeId: ThemeId;
  size?: 'card' | 'menu';
  className?: string;
}

export default function ThemePreviewSwatch({
  themeId,
  size = 'card',
  className,
}: ThemePreviewSwatchProps) {
  const option = THEME_REGISTRY[themeId];

  return (
    <div
      aria-hidden="true"
      data-theme-preview={themeId}
      data-preview-size={size}
      className={classNames(
        'theme-preview-swatch relative isolate overflow-hidden border border-app-border/70',
        size === 'card' ? 'min-h-[7.25rem] rounded-[22px]' : 'h-11 w-14 rounded-[14px]',
        className
      )}
    >
      <div className="theme-preview-swatch__backdrop" />
      <div className="theme-preview-swatch__glow" />
      <div className="theme-preview-swatch__panel">
        <div className="theme-preview-swatch__badge-row">
          <span className="theme-preview-swatch__badge">{option.shortLabel}</span>
          <span className="theme-preview-swatch__badge theme-preview-swatch__badge--ghost" />
        </div>

        <div className="theme-preview-swatch__heading">
          <span className="theme-preview-swatch__line theme-preview-swatch__line--display" />
          <span className="theme-preview-swatch__line theme-preview-swatch__line--body" />
        </div>

        <div className="theme-preview-swatch__footer">
          <span className="theme-preview-swatch__pill theme-preview-swatch__pill--accent" />
          <span className="theme-preview-swatch__pill" />
        </div>
      </div>
    </div>
  );
}
