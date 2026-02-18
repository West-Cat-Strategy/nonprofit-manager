export interface UiAction {
  label: string;
  onClick: () => void;
}

export interface UiStateProps {
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  retry?: () => void;
  primaryAction?: UiAction;
}

