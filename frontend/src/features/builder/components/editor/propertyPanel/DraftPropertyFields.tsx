import React, { useEffect, useState } from 'react';

type DraftInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange'
> & {
  value: string;
  onCommit: (value: string) => void;
};

type DraftTextareaProps = Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  'value' | 'onChange'
> & {
  value: string;
  onCommit: (value: string) => void;
};

export function DraftInput({ value, onCommit, onFocus, onBlur, ...props }: DraftInputProps) {
  const [draft, setDraft] = useState(value);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setDraft(value);
    }
  }, [isFocused, value]);

  return (
    <input
      {...props}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onFocus={(event) => {
        setIsFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setIsFocused(false);
        onCommit(event.target.value);
        onBlur?.(event);
      }}
    />
  );
}

export function DraftTextarea({
  value,
  onCommit,
  onFocus,
  onBlur,
  ...props
}: DraftTextareaProps) {
  const [draft, setDraft] = useState(value);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setDraft(value);
    }
  }, [isFocused, value]);

  return (
    <textarea
      {...props}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onFocus={(event) => {
        setIsFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setIsFocused(false);
        onCommit(event.target.value);
        onBlur?.(event);
      }}
    />
  );
}
