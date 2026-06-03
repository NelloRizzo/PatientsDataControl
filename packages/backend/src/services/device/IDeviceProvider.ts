export interface OAuthTokenResult {
  accessToken: string;
  refreshToken: string;
  expiresAt?: Date;
  userId?: string;
}

export interface MeasurementEntry {
  type: string;
  values: Record<string, number>;
  units: Record<string, string>;
  date: Date;
}

export interface SyncResult {
  measurements: MeasurementEntry[];
  errors: string[];
}

export interface IDeviceProvider {
  readonly providerName: string;
  readonly displayName: string;
  getOAuthUrl(state: string, redirectUri: string): string;
  exchangeCode(code: string, redirectUri: string): Promise<OAuthTokenResult>;
  refreshAccessToken(refreshToken: string): Promise<OAuthTokenResult>;
  syncMeasurements(accessToken: string, fromDate?: Date): Promise<SyncResult>;
}
