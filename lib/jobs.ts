import { api } from './api';

export interface JobListing {
  id: number;
  title: string;
  employer: string;
  location: string;
  workMode: 'onsite' | 'hybrid' | 'remote';
  salaryLabel: string | null;
  description: string;
  requiredTracks: string[];
  applyUrl: string;
  postedAt: string;
  closesAt: string | null;
}

export type NewJob = Omit<JobListing, 'id' | 'postedAt'>;

export const listJobs = () => api<JobListing[]>('/api/jobs');
export const postJob = (job: NewJob) => api<JobListing>('/api/jobs', { method: 'POST', body: job, auth: true });
export const deleteJob = (id: number) => api<{ ok: true }>(`/api/jobs/${id}`, { method: 'DELETE', auth: true });
