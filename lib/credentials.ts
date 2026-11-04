import { api } from './api';

/** A verified certification as served by /api/credentials. */
export interface Credential {
  code: string;
  trackId: string;
  trackTitle: string;
  holderName: string;
  projectsPassed: number;
  issuedAt: string;
  revoked: boolean;
}

/** Ask the server to verify this learner's projects and issue (or return) the credential. */
export function issueCredential(trackId: string): Promise<Credential> {
  return api<Credential>('/api/credentials', { method: 'POST', body: { trackId }, auth: true });
}

export function myCredentials(): Promise<Credential[]> {
  return api<Credential[]>('/api/credentials', { auth: true });
}

/** Public verification — anyone, no sign-in. */
export function verifyCredential(code: string): Promise<Credential> {
  return api<Credential>(`/api/credentials/${encodeURIComponent(code.trim().toUpperCase())}`);
}

export const CREDENTIAL_CODE = /^[A-Z0-9]{3}-[A-Z0-9]{3}-[A-Z0-9]{3}$/;
