import type { IDeviceProvider, OAuthTokenResult, SyncResult } from './IDeviceProvider.js';

const FITBIT_AUTH = 'https://www.fitbit.com/oauth2/authorize';
const FITBIT_TOKEN = 'https://api.fitbit.com/oauth2/token';
const FITBIT_API = 'https://api.fitbit.com/1/user/-';

const SCOPES = [
  'heartrate',
  'weight',
  'oxygen_saturation',
  'blood_pressure',
  'glucose',
  'activity',
  'sleep',
  'profile',
].join('%20');

export class FitbitProvider implements IDeviceProvider {
  readonly providerName = 'fitbit';
  readonly displayName = 'Fitbit';

  constructor(
    private clientId: string,
    private clientSecret: string,
  ) {}

  getOAuthUrl(state: string, redirectUri: string): string {
    return `${FITBIT_AUTH}?response_type=code&client_id=${this.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${SCOPES}&state=${state}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokenResult> {
    const body = new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    const res = await fetch(FITBIT_TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Fitbit token exchange failed: ${res.status} ${text}`);
    }

    const data = await res.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
      userId: data.user_id,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenResult> {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    const res = await fetch(FITBIT_TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Fitbit token refresh failed: ${res.status} ${text}`);
    }

    const data = await res.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
    };
  }

  async syncMeasurements(accessToken: string, fromDate?: Date): Promise<SyncResult> {
    const headers = { Authorization: `Bearer ${accessToken}` };
    const measurements: SyncResult['measurements'] = [];
    const errors: string[] = [];

    const dateStr = fromDate
      ? fromDate.toISOString().split('T')[0]
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const fetches: Promise<void>[] = [
      this.fetchHeartRate(headers, dateStr, measurements, errors),
      this.fetchWeight(headers, dateStr, measurements, errors),
      this.fetchBloodPressure(headers, dateStr, measurements, errors),
      this.fetchGlucose(headers, dateStr, measurements, errors),
      this.fetchSpO2(headers, dateStr, measurements, errors),
    ];

    await Promise.allSettled(fetches);

    return { measurements, errors };
  }

  private async fetchJson(url: string, headers: Record<string, string>): Promise<any> {
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    return res.json();
  }

  private async fetchHeartRate(
    headers: Record<string, string>,
    dateStr: string,
    measurements: SyncResult['measurements'],
    errors: string[],
  ): Promise<void> {
    try {
      const data = await this.fetchJson(
        `${FITBIT_API}/activities/heart/date/${dateStr}/1d/1min.json`,
        headers,
      );
      const dataset = data?.['activities-heart-intraday']?.dataset;
      if (dataset?.length) {
        const avg = Math.round(dataset.reduce((s: number, r: any) => s + r.value, 0) / dataset.length);
        measurements.push({
          type: 'heart_rate',
          values: { value: avg },
          units: { value: 'bpm' },
          date: new Date(dateStr),
        });
      }
    } catch (e) {
      errors.push(`Heart rate: ${e instanceof Error ? e.message : 'unknown'}`);
    }
  }

  private async fetchWeight(
    headers: Record<string, string>,
    dateStr: string,
    measurements: SyncResult['measurements'],
    errors: string[],
  ): Promise<void> {
    try {
      const data = await this.fetchJson(
        `${FITBIT_API}/body/log/weight/date/${dateStr}.json`,
        headers,
      );
      const entry = data?.weight?.[0];
      if (entry) {
        measurements.push({
          type: 'weight',
          values: { value: entry.weight },
          units: { value: 'kg' },
          date: new Date(entry.date || dateStr),
        });
      }
    } catch (e) {
      errors.push(`Weight: ${e instanceof Error ? e.message : 'unknown'}`);
    }
  }

  private async fetchBloodPressure(
    headers: Record<string, string>,
    dateStr: string,
    measurements: SyncResult['measurements'],
    errors: string[],
  ): Promise<void> {
    try {
      const data = await this.fetchJson(
        `${FITBIT_API}/bp/date/${dateStr}.json`,
        headers,
      );
      const entry = data?.bp?.[0];
      if (entry) {
        measurements.push({
          type: 'blood_pressure',
          values: { systolic: entry.systolic, diastolic: entry.diastolic },
          units: { systolic: 'mmHg', diastolic: 'mmHg' },
          date: new Date(entry.date || dateStr),
        });
      }
    } catch (e) {
      errors.push(`Blood pressure: ${e instanceof Error ? e.message : 'unknown'}`);
    }
  }

  private async fetchGlucose(
    headers: Record<string, string>,
    dateStr: string,
    measurements: SyncResult['measurements'],
    errors: string[],
  ): Promise<void> {
    try {
      const data = await this.fetchJson(
        `${FITBIT_API}/blood_glucose/date/${dateStr}.json`,
        headers,
      );
      const entry = data?.glucose?.[0];
      if (entry) {
        measurements.push({
          type: 'blood_sugar',
          values: { value: entry.value },
          units: { value: entry.unit || 'mg/dL' },
          date: new Date(entry.date || dateStr),
        });
      }
    } catch (e) {
      errors.push(`Glucose: ${e instanceof Error ? e.message : 'unknown'}`);
    }
  }

  private async fetchSpO2(
    headers: Record<string, string>,
    dateStr: string,
    measurements: SyncResult['measurements'],
    errors: string[],
  ): Promise<void> {
    try {
      const data = await this.fetchJson(
        `${FITBIT_API}/spo2/date/${dateStr}.json`,
        headers,
      );
      const entry = data?.spo2?.[0];
      if (entry) {
        measurements.push({
          type: 'oxygen_saturation',
          values: { value: entry.value },
          units: { value: '%' },
          date: new Date(entry.date || dateStr),
        });
      }
    } catch (e) {
      errors.push(`SpO2: ${e instanceof Error ? e.message : 'unknown'}`);
    }
  }
}
