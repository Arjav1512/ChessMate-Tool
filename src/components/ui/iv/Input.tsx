import React, { useId } from 'react';

interface BaseFieldProps {
  label?: string;
  error?: string;
  help?: string;
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement>, BaseFieldProps {}
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement>, BaseFieldProps {}

/** Text input (System Design §6 Inputs). Wraps label + helper/error wiring. */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, help, className = '', id, ...rest },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const describedBy = error ? `${fieldId}-err` : help ? `${fieldId}-help` : undefined;
  return (
    <div className="iv-field">
      {label && <label className="iv-field__label" htmlFor={fieldId}>{label}</label>}
      <input
        ref={ref}
        id={fieldId}
        className={`iv-input ${error ? 'iv-input--error' : ''} ${className}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...rest}
      />
      {error ? (
        <span id={`${fieldId}-err`} className="iv-field__help iv-field__help--error">{error}</span>
      ) : help ? (
        <span id={`${fieldId}-help`} className="iv-field__help">{help}</span>
      ) : null}
    </div>
  );
});

/** Textarea variant (System Design §6 / Import paste zone §4.3). */
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, help, className = '', id, ...rest },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const describedBy = error ? `${fieldId}-err` : help ? `${fieldId}-help` : undefined;
  return (
    <div className="iv-field">
      {label && <label className="iv-field__label" htmlFor={fieldId}>{label}</label>}
      <textarea
        ref={ref}
        id={fieldId}
        className={`iv-textarea ${error ? 'iv-textarea--error' : ''} ${className}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...rest}
      />
      {error ? (
        <span id={`${fieldId}-err`} className="iv-field__help iv-field__help--error">{error}</span>
      ) : help ? (
        <span id={`${fieldId}-help`} className="iv-field__help">{help}</span>
      ) : null}
    </div>
  );
});

export interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  kbdHint?: string;
}

/** Search variant: leading glyph + optional ⌘K kbd hint (System Design §6 Search). */
export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { kbdHint, className = '', 'aria-label': ariaLabel = 'Search', ...rest },
  ref,
) {
  return (
    <div className="iv-search">
      <span className="iv-search__glyph" aria-hidden>⌕</span>
      <input ref={ref} type="search" className={`iv-input ${className}`} aria-label={ariaLabel} {...rest} />
      {kbdHint && <kbd className="iv-search__kbd">{kbdHint}</kbd>}
    </div>
  );
});
