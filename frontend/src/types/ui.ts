export interface UiAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  ariaLabel?: string;
}

export interface UiStateProps {
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  retry?: () => void;
  primaryAction?: UiAction;
}

export interface PageContract {
  title: string;
  description?: string;
  primaryAction?: UiAction;
  loading?: boolean;
  error?: string | null;
}
