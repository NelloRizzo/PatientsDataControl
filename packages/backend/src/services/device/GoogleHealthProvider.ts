import type { IDeviceProvider, OAuthTokenResult, SyncResult } from './IDeviceProvider.js';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const HEALTH_API_BASE = 'https://health.googleapis.com/v4';

const SCOPES = [
  'https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly',
  'https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly',
  'https://www.googleapis.com/auth/googlehealth.profile.readonly',
].join(' ');

interface DataTypeMapping {
  id: string;
  typeKey: string;
  unit: string;
  filterField: string;
}

const DATA_TYPES: DataTypeMapping[] = [
  {
    id: 'heart-rate',
    typeKey: 'heart_rate',
    unit: 'bpm',
    filterField: 'heart_rate',
  },
  {
    id: 'weight',
    typeKey: 'weight',
    unit: 'kg',
    filterField: 'weight',
  },
  {
    id: 'blood-glucose',
    typeKey: 'blood_sugar',
    unit: 'mg/dL',
    filterField: 'blood_glucose',
  },
  {
    id: 'oxygen-saturation',
    typeKey: 'oxygen_saturation',
    unit: '%',
    filterField: 'oxygen_saturation',
  },
  {
    id: 'body-fat',
    typeKey: 'body_fat',
    unit: '%',
    filterField: 'body_fat',
  },
];

export class GoogleHealthProvider implements IDeviceProvider {
  readonly providerName = 'google_health';
  readonly displayName = 'Fitbit (Google Health)';

  constructor(
    private clientId: string,
    private clientSecret: string,
  ) {}

  getOAuthUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: SCOPES,
      state,
      access_type: 'offline',
      prompt: 'consent',
    });
    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokenResult> {
    const body = new URLSearchParams({
      code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });

    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Google OAuth token exchange failed: ${res.status} ${text}`);
    }

    const data = await res.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
      userId: data.id_token,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenResult> {
    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Google OAuth token refresh failed: ${res.status} ${text}`);
    }

    const data = await res.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
    };
  }

  async syncMeasurements(accessToken: string, fromDate?: Date): Promise<SyncResult> {
    const headers = { Authorization: `Bearer ${accessToken}` };
    const measurements: SyncResult['measurements'] = [];
    const errors: string[] = [];

    const since = fromDate ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const sinceStr = since.toISOString().split('T')[0];
    const untilStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const fetches = DATA_TYPES.map((dt) =>
      this.fetchDataType(dt, headers, sinceStr, untilStr, measurements, errors),
    );

    await Promise.allSettled(fetches);

    return { measurements, errors };
  }

  private async fetchDataType(
    dt: DataTypeMapping,
    headers: Record<string, string>,
    sinceStr: string,
    untilStr: string,
    measurements: SyncResult['measurements'],
    errors: string[],
  ): Promise<void> {
    try {
      const filter = `${dt.filterField}.sample_time.civil_time >= "${sinceStr}" AND ${dt.filterField}.sample_time.civil_time < "${untilStr}"`;
      const params = new URLSearchParams({ filter, pageSize: '100' });
      const url = `${HEALTH_API_BASE}/users/me/dataTypes/${dt.id}/dataPoints?${params}`;

      const res = await fetch(url, { headers });
      if (!res.ok) {
        if (res.status === 404 || res.status === 403) {
          return;
        }
        const text = await res.text();
        errors.push(`${dt.id}: HTTP ${res.status} ${text}`);
        return;
      }

      const body = await res.json();
      if (!body.dataPoints?.length) return;

      const aggregated = this.aggregateDataPoints(dt, body.dataPoints);
      if (aggregated) measurements.push(aggregated);
    } catch (e) {
      errors.push(`${dt.id}: ${e instanceof Error ? e.message : 'unknown'}`);
    }
  }

  private aggregateDataPoints(
    dt: DataTypeMapping,
    dataPoints: any[],
  ): SyncResult['measurements'][0] | null {
    const values: number[] = [];
    let date: Date | null = null;

    for (const dp of dataPoints) {
      const entry = dp[dt.typeKey];
      if (!entry) continue;

      let value: number | undefined;

      switch (dt.typeKey) {
        case 'heart_rate':
          value = parseInt(entry.beatsPerMinute, 10);
          date = entry.sampleTime?.physicalTime
            ? new Date(entry.sampleTime.physicalTime)
            : new Date();
          break;
        case 'weight':
          value = entry.weightValue?.weightGrams
            ? entry.weightValue.weightGrams / 1000
            : undefined;
          date = entry.sampleTime?.physicalTime
            ? new Date(entry.sampleTime.physicalTime)
            : new Date();
          break;
        case 'blood_sugar':
          value = entry.bloodGlucoseMilligramsPerDeciliter;
          date = entry.sampleTime?.physicalTime
            ? new Date(entry.sampleTime.physicalTime)
            : new Date();
          break;
        case 'oxygen_saturation':
          value = entry.percentage;
          date = entry.sampleTime?.physicalTime
            ? new Date(entry.sampleTime.physicalTime)
            : new Date();
          break;
        case 'body_fat':
          value = entry.percentage;
          date = entry.sampleTime?.physicalTime
            ? new Date(entry.sampleTime.physicalTime)
            : new Date();
          break;
      }

      if (value != null && !isNaN(value)) {
        values.push(value);
      }
    }

    if (!values.length) return null;

    const avg = dt.typeKey === 'heart_rate'
      ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
      : parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2));

    return {
      type: dt.typeKey,
      values: { value: avg },
      units: { value: dt.unit },
      date: date ?? new Date(),
    };
  }
}
