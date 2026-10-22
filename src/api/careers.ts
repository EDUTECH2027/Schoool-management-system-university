import { rawRequest as request } from './client';
import { downloadAuthed } from './payments';

const qs = (q: Record<string, unknown>) => {
  const s = new URLSearchParams(Object.entries(q).filter(([, v]) => v !== undefined && v !== '' && v !== null) as [string, string][]).toString();
  return s ? `?${s}` : '';
};

export type JobKind = 'job' | 'internship' | 'volunteering';
export interface Paged<T> { total: number; page: number; limit: number; items: T[] }
export interface Job {
  id: string; title: string; company: string; kind: JobKind; location: string | null; description: string; apply_url: string | null; contact_email: string | null;
  deadline: string | null; status: 'open' | 'closed' | 'draft'; posted_by_name: string | null; created_at: string; is_open: boolean;
  applicant_count?: number; my_application?: string | null;
}
export interface JobInput { title: string; company: string; kind: JobKind; location?: string; description: string; apply_url?: string; contact_email?: string; deadline?: string | null; status?: 'open' | 'draft' | 'closed' }
export interface MyApplication { id: string; job_id: string; status: string; cover_note: string | null; created_at: string; job: { id: string; title: string; company: string; kind: JobKind; deadline: string | null; status: string } }
export interface Applicant { id: string; job_id: string; status: string; cover_note: string | null; created_at: string; student_id: string; student_name: string; matricule: string; programme: string | null; academic_status: string }
export interface AlumniProfile { id: string | null; graduation_year: number | null; programme_name: string | null; employer: string | null; position: string | null; city: string | null; bio: string | null; linkedin_url: string | null; contact_email: string | null; is_public: boolean }
export interface AlumniMe { exists: boolean; academic_status: string; name: string; profile: AlumniProfile }
export interface AlumniEntry { id: string; name: string; graduation_year: number | null; programme_name: string | null; employer: string | null; position: string | null; city: string | null; bio: string | null; linkedin_url: string | null; contact_email: string | null }
export interface AlumniRow extends AlumniProfile { student_id: string; name: string; matricule: string; academic_status: string }
export interface AlumniStats {
  graduated: number; alumni_base: number; profiles: number; public_profiles: number; responded: number; employed: number; response_rate: number | null; employed_share: number | null;
  by_programme: { name: string; total: number; employed: number }[]; by_year: { year: number; total: number; employed: number }[]; top_employers: { name: string; count: number }[];
}
export type AlumniFilter = { q?: string; programme_name?: string; year?: string; employer?: string; city?: string; page?: number; limit?: number };

export const careers = {
  jobs: (q: { kind?: string; q?: string; status?: string; page?: number; limit?: number } = {}) => request<Paged<Job>>('GET', `/careers/jobs${qs(q)}`),
  createJob: (b: JobInput) => request<Job>('POST', '/careers/jobs', b),
  updateJob: (id: string, b: Partial<JobInput>) => request<Job>('PUT', `/careers/jobs/${id}`, b),
  closeJob: (id: string) => request<{ ok: true }>('POST', `/careers/jobs/${id}/close`),
  reopenJob: (id: string) => request<{ ok: true }>('POST', `/careers/jobs/${id}/reopen`),
  deleteJob: (id: string) => request<void>('DELETE', `/careers/jobs/${id}`),
  apply: (id: string, cover_note: string) => request<{ id: string; status: string }>('POST', `/careers/jobs/${id}/apply`, { cover_note }),
  withdraw: (applicationId: string) => request<{ ok: true }>('POST', `/careers/applications/${applicationId}/withdraw`),
  myApplications: () => request<MyApplication[]>('GET', '/careers/my-applications'),
  applicants: (jobId: string) => request<Applicant[]>('GET', `/careers/jobs/${jobId}/applications`),
  decide: (applicationId: string, status: 'shortlisted' | 'rejected' | 'hired') => request<{ ok: true }>('PUT', `/careers/applications/${applicationId}/status`, { status }),
  myProfile: () => request<AlumniMe>('GET', '/careers/alumni/me'),
  saveProfile: (b: Partial<AlumniProfile>) => request<{ exists: boolean; profile: AlumniProfile }>('PUT', '/careers/alumni/me', b),
  directory: (f: AlumniFilter = {}) => request<Paged<AlumniEntry>>('GET', `/careers/alumni${qs(f)}`),
  directoryFilters: () => request<{ programmes: string[]; years: number[] }>('GET', '/careers/alumni/filters'),
  register: (f: AlumniFilter & { public?: string } = {}) => request<Paged<AlumniRow> & { graduated_without_profile: number }>('GET', `/careers/alumni/register${qs(f)}`),
  stats: () => request<AlumniStats>('GET', '/careers/alumni/stats'),
  invite: () => request<{ students: number; notified: number }>('POST', '/careers/alumni/invite', {}),
  bulkCreate: () => request<{ created: number; graduated_total: number }>('POST', '/careers/alumni/bulk-create', {}),
  exportCsv: (f: AlumniFilter = {}) => downloadAuthed(`/careers/alumni/export.csv${qs(f)}`, 'alumni.csv'),
};
