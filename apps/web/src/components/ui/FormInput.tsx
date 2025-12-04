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
  <div className="space-y-2">
    <label
      htmlFor={id}
      className="block text-xs tracking-[0.08em] uppercase text-slate-600 dark:text-slate-300"
    >
      {label}
    </label>
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`w-full px-4 py-3 rounded-xl bg-white/85 dark:bg-[#0f1324] border shadow-[0_18px_60px_rgba(15,23,42,0.12)] transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#0b1020] ${
        error
          ? "border-red-300 dark:border-red-500"
          : "border-white/60 dark:border-white/10"
      }`}
      placeholder={placeholder}
    />
    {error && <p className="text-sm text-red-500 dark:text-red-300">{error}</p>}
  </div>
);
