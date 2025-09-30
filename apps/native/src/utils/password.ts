export type PasswordStrength = 'weak' | 'medium' | 'strong';

export interface PasswordStrengthInfo {
  strength: PasswordStrength;
  color: string;
  width: string;
}

export function getPasswordStrength(password: string): PasswordStrength {
  if (password.length < 8) return 'weak';

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const criteriaMet = [hasLower, hasUpper, hasNumber, hasSpecial].filter(
    Boolean
  ).length;

  if (criteriaMet >= 4 && password.length >= 12) return 'strong';
  if (criteriaMet >= 3 && password.length >= 8) return 'medium';
  return 'weak';
}

export function getPasswordStrengthInfo(
  password: string
): PasswordStrengthInfo {
  const strength = getPasswordStrength(password);

  const config: Record<PasswordStrength, { color: string; width: string }> = {
    weak: { color: 'bg-red-500', width: 'w-1/3' },
    medium: { color: 'bg-yellow-500', width: 'w-2/3' },
    strong: { color: 'bg-green-500', width: 'w-full' },
  };

  return {
    strength,
    color: config[strength].color,
    width: config[strength].width,
  };
}
