export interface Info {
  version: string;
  buildDate: string;
  insideDocker: boolean;
  /** Docker engine version, or null when the engine cannot be reached. */
  dockerVersion?: string | null;
  /** True when requests need an API key or a login token. */
  authEnabled?: boolean;
  /** True when the admin login is configured. */
  loginEnabled?: boolean;
}
