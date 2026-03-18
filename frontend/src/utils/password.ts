/**
 * Password must be at least 8 characters and contain uppercase, lowercase, and a number.
 */
export const PASSWORD_RULES = 'At least 8 characters, with uppercase, lowercase, and a number'

export function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters'
  let upper = false
  let lower = false
  let digit = false
  for (let i = 0; i < password.length; i++) {
    const c = password[i]
    if (c >= 'A' && c <= 'Z') upper = true
    else if (c >= 'a' && c <= 'z') lower = true
    else if (c >= '0' && c <= '9') digit = true
    if (upper && lower && digit) return null
  }
  return 'Password must contain uppercase, lowercase, and a number'
}
