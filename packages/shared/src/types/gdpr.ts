export type ConsentType = 'privacy_policy' | 'data_sharing';
export type ConsentAction = 'accept' | 'revoke';

export interface IGdprConsent {
  _id: string;
  userId: string;
  type: ConsentType;
  granted: boolean;
  grantedAt: string;
  revokedAt?: string;
  ipAddress?: string;
  userAgent?: string;
}
