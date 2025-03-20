type FormFieldProps = {
  label: string;
  type: "email" | "password";
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
};

export function FormField({
  label,
  type,
  placeholder,
  value,
  onChange,
  required = false,
  disabled = false,
}: FormFieldProps) {
  return (
    <div className="mb-4">
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border p-2"
        required={required}
        disabled={disabled}
      />
    </div>
  );
}

type SubmitButtonProps = {
  text: string;
  loadingText: string;
  isLoading: boolean;
  disabled?: boolean;
};

export function SubmitButton({
  text,
  loadingText,
  isLoading,
  disabled = false,
}: SubmitButtonProps) {
  return (
    <div className="mb-4 flex justify-center">
      <button
        type="submit"
        className="bg-primary hover:bg-opacity-90 focus:ring-primary rounded-full px-4 py-2 focus:ring-2 focus:ring-offset-2 focus:outline-none"
        disabled={isLoading || disabled}
      >
        {isLoading ? loadingText : text}
      </button>
    </div>
  );
}

type ErrorMessageProps = {
  message: string | null;
};

export function ErrorMessage({ message }: ErrorMessageProps) {
  if (!message) return null;

  return (
    <div className="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
      {message}
    </div>
  );
}

export function validateEmail(email: string): {
  isValid: boolean;
  error?: string;
} {
  if (!email || email.trim() === "") {
    return { isValid: false, error: "Email is required" };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: "Invalid email format" };
  }

  return { isValid: true };
}

export function validatePassword(password: string): {
  isValid: boolean;
  error?: string;
} {
  if (!password) {
    return { isValid: false, error: "Password is required" };
  }

  if (password.length < 6) {
    return { isValid: false, error: "Password must be at least 6 characters" };
  }

  return { isValid: true };
}

export function validatePasswordConfirmation(
  password: string,
  confirmPassword: string,
): { isValid: boolean; error?: string } {
  if (password !== confirmPassword) {
    return { isValid: false, error: "Passwords do not match" };
  }

  return { isValid: true };
}
