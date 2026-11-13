/** GET /api/auth/status: public, so the UI can tell whether to show the login page. */
export interface AuthStatus {
  /** True when requests need an API key or a login token. */
  authEnabled: boolean;
  /** True when the admin login is configured. */
  loginEnabled: boolean;
}
