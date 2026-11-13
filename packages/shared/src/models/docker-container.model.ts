export interface DockerContainer {
  Id: string;
  Name: string;
  Image: string;
  Labels: Record<string, string>;
  /** ISO 8601 timestamp; dates cross the wire as strings. */
  CreatedAt: string;
  Status: string;
  ConfigFiles: string;
  Version?: string;
}
