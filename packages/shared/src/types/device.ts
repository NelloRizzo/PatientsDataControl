export type DeviceProvider = 'fitbit' | 'google_fit' | 'google_health' | 'apple_health' | 'garmin' | 'custom';

export type OAuthType = 'fitbit' | 'google';

export interface IDeviceConnection {
  _id: string;
  userId: string;
  provider: DeviceProvider;
  oauthType: OAuthType;
  name: string;
  active: boolean;
  lastSync?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IApiKey {
  _id: string;
  userId: string;
  name: string;
  key: string;
  active: boolean;
  lastUsed?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceWebhookPayload {
  deviceId: string;
  apiKey: string;
  measurements: Array<{
    type: string;
    value: number | Record<string, number>;
    unit: string;
    timestamp: string;
  }>;
}
