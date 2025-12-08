interface FormInputProps {
  id: string;
  label: string;
  type: string;
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
  <div>
    <label htmlFor={id}>{label}</label>
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
    />
    {error && <p>{error}</p>}
  </div>
);
