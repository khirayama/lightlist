import { HTMLInputTypeAttribute } from "react";

interface FormInputProps {
  id: string;
  label: string;
  type: HTMLInputTypeAttribute;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled: boolean;
  placeholder: string;
}

export const FormInput = ({
  id,
  label,
  type,
  value,
  onChange,
  error,
  disabled,
  placeholder,
}: FormInputProps) => (
  <div className="flex flex-col gap-1">
    <label
      htmlFor={id}
      className="text-sm font-medium text-text dark:text-text-dark"
    >
      {label}
    </label>
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${id}-error` : undefined}
      className="rounded-xl border border-border bg-inputBackground px-3 py-2 text-sm text-text shadow-sm focus:border-muted focus:outline-none focus:ring-2 focus:ring-border disabled:cursor-not-allowed disabled:opacity-60 dark:border-border-dark dark:bg-inputBackground-dark dark:text-text-dark dark:focus:border-muted-dark dark:focus:ring-border-dark"
    />
    {error && (
      <p id={`${id}-error`} className="text-xs text-error dark:text-error-dark">
        {error}
      </p>
    )}
  </div>
);
