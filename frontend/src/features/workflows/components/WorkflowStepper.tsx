import type { ReactNode } from 'react';

export interface WorkflowStep<T extends string = string> {
  key: T;
  label: string;
  description?: string;
}

interface WorkflowStepperProps<T extends string = string> {
  steps: WorkflowStep<T>[];
  currentStep: T;
  onStepClick?: (step: T) => void;
  className?: string;
}

export default function WorkflowStepper<T extends string = string>({
  steps,
  currentStep,
  onStepClick,
  className = '',
}: WorkflowStepperProps<T>) {
  const activeIndex = steps.findIndex((step) => step.key === currentStep);

  return (
    <ol className={`flex flex-col gap-3 md:flex-row md:items-center ${className}`}>
      {steps.map((step, index) => {
        const isActive = step.key === currentStep;
        const isComplete = index < activeIndex;

        const stepNode: ReactNode = (
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${
              isActive
                ? 'bg-app-accent text-[var(--app-accent-foreground)]'
                : isComplete
                  ? 'bg-app-accent-soft text-app-accent'
                  : 'bg-app-surface-muted text-app-text-muted'
            }`}
          >
            <span
              className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-xs ${
                isActive
                  ? 'border-current text-current'
                  : isComplete
                    ? 'border-app-accent text-app-accent'
                    : 'border-app-border text-app-text-muted'
              }`}
            >
              {index + 1}
            </span>
            <span>{step.label}</span>
          </span>
        );

        return (
          <li key={step.key} className="flex items-center gap-3">
            {onStepClick ? (
              <button
                type="button"
                onClick={() => onStepClick(step.key)}
                className="text-left"
                aria-current={isActive ? 'step' : undefined}
              >
                {stepNode}
              </button>
            ) : (
              stepNode
            )}
            {index < steps.length - 1 && <span className="hidden h-px w-12 bg-app-border md:block" />}
          </li>
        );
      })}
    </ol>
  );
}
