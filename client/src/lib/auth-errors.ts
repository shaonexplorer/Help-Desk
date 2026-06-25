/**
 * Better Auth error codes → user-facing messages.
 *
 * The client returns a machine-readable `code` on every error. Map the ones
 * users can actually act on; everything else falls back to a generic line.
 * Full list: https://www.better-auth.com/docs/reference/error-codes
 */
const MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: "Invalid email or password.",
  USER_NOT_FOUND: "No account exists with that email.",
  INVALID_EMAIL: "That email address is not valid.",
  INVALID_PASSWORD: "Password does not meet requirements.",
  EMAIL_NOT_VERIFIED: "Please verify your email before signing in.",
  USER_ALREADY_EXISTS: "An account with that email already exists.",
  PASSWORD_TOO_SHORT: "Password is too short.",
  PASSWORD_TOO_LONG: "Password is too long.",
  ACCOUNT_NOT_FOUND: "Account not found.",
  FAILED_TO_CREATE_USER: "Could not create an account. Try again.",
  NO_SECRET: "Server misconfiguration — contact support.",
  TOKEN_NOT_FOUND: "Session expired. Sign in again.",
  SESSION_EXPIRED: "Your session expired. Sign in again.",
};

export function messageFor(code: string | undefined): string {
  if (!code) return "Something went wrong.";
  return MESSAGES[code] ?? "Something went wrong.";
}
