import { rawRequest as request, rawUpload } from './client';
import { downloadAuthed } from './payments';

const qs = (q: Record<string, unknown>) => {
  const s = new URLSearchParams(Object.entries(q).filter(([, v]) => v !== undefined && v !== '' && v !== null) as [string, string][]).toString();
  return s ? `?${s}` : '';
};

export type ThesisStatus = 'proposed' | 'supervisor_accepted' | 'approved' | 'in_progress' | 'submitted' | 'defence_scheduled' | 'defended' | 'completed' | 'rejected' | 'withdrawn';
export const THESIS_STEPS: ThesisStatus[] = ['proposed', 'supervisor_accepted', 'approved', 'in_progress', 'submitted', 'defence_scheduled', 'defended', 'completed'];
export interface Paged<T> { total: number; page: number; limit: number; items: T[] }
export interface Person { id: string; name: string }
export interface JuryMember { name: string; role: string; teacher_id?: string }
export interface Milestone { id: string; title: string; due_date: string | null; status: 'pending' | 'submitted' | 'accepted' | 'revision_requested'; feedback: string | null; position: number }
export interface Submission { id: string; thesis_id: string; milestone_id: string | null; version: number; note: string | null; file_name: string | null; file_size: number | null; feedback: string | null; reviewed_by: string | null; reviewed_at: string | null; created_at: string }
export interface ThesisEvent { id: string; kind: string; from_status: string | null; to_status: string | null; body: string | null; author_name: string | null; author_role: string | null; created_at: string }
export interface Thesis {
  id: string; title: string; abstract: string | null; keywords: string | null; kind: 'thesis' | 'project' | 'internship_report'; status: ThesisStatus;
  student?: { id: string; name: string; matricule: string; programme: string | null; programme_id: string | null };
  supervisor: Person | null; co_supervisor: Person | null;
  defence: { date: string; time: string | null; room: string | null; jury: JuryMember[] } | null;
  final_score: number | null; final_grade: string | null; decision_note: string | null; created_at: string; updated_at: string;
}
export interface ThesisFull extends Thesis { milestones: Milestone[]; submissions: Submission[]; events: ThesisEvent[] }
export interface Supervisee extends Thesis { role: 'supervisor' | 'co_supervisor'; next_deadline: string | null; overdue: boolean; milestones_done: number; milestones_total: number; awaiting_review: number }
export interface Dashboard {
  status_counts: Record<ThesisStatus, number>; awaiting_approval: number;
  workload: { supervisor_id: string; name: string; load: number; completed: number; max: number }[];
  upcoming_defences: Thesis[];
}
export interface ProposalInput { title: string; abstract?: string; keywords?: string; kind: Thesis['kind']; supervisor_id?: string | null }

export const thesisApi = {
  supervisors: () => request<{ max: number; items: { id: string; name: string; load: number; max: number; available: boolean }[] }>('GET', '/thesis/supervisors'),
  mine: () => request<{ can_propose: boolean; thesis: ThesisFull | null; past: { id: string; status: string }[] }>('GET', '/thesis/mine'),
  supervision: () => request<{ max: number; load: number; requests: Supervisee[]; supervisees: Supervisee[] }>('GET', '/thesis/supervision'),
  dashboard: () => request<Dashboard>('GET', '/thesis/dashboard'),
  list: (q: { status?: string; supervisor_id?: string; programme_id?: string; q?: string; page?: number; limit?: number } = {}) => request<Paged<Thesis>>('GET', `/thesis${qs(q)}`),
  get: (id: string) => request<ThesisFull>('GET', `/thesis/${id}`),
  propose: (b: ProposalInput) => request<ThesisFull>('POST', '/thesis', b),
  edit: (id: string, b: Partial<ProposalInput>) => request<ThesisFull>('PUT', `/thesis/${id}`, b),
  accept: (id: string) => request<ThesisFull>('POST', `/thesis/${id}/accept`, {}),
  decline: (id: string, reason: string) => request<ThesisFull>('POST', `/thesis/${id}/decline`, { reason }),
  approve: (id: string, note?: string) => request<ThesisFull>('POST', `/thesis/${id}/approve`, { note }),
  reject: (id: string, note: string) => request<ThesisFull>('POST', `/thesis/${id}/reject`, { note }),
  start: (id: string) => request<ThesisFull>('POST', `/thesis/${id}/start`, {}),
  withdraw: (id: string, reason?: string) => request<ThesisFull>('POST', `/thesis/${id}/withdraw`, { reason }),
  submitFinal: (id: string, note?: string) => request<ThesisFull>('POST', `/thesis/${id}/submit-final`, { note }),
  assign: (id: string, b: { supervisor_id?: string; co_supervisor_id?: string | null; note?: string }) => request<ThesisFull>('POST', `/thesis/${id}/assign`, b),
  scheduleDefence: (id: string, b: { date: string; time: string; room: string; jury: JuryMember[] }) => request<ThesisFull>('POST', `/thesis/${id}/schedule-defence`, b),
  defended: (id: string) => request<ThesisFull>('POST', `/thesis/${id}/defended`, {}),
  result: (id: string, b: { score: number; grade: string; note?: string }) => request<ThesisFull>('POST', `/thesis/${id}/result`, b),
  comment: (id: string, body: string) => request<{ ok: true }>('POST', `/thesis/${id}/comments`, { body }),
  addMilestone: (id: string, b: { title: string; due_date?: string | null }) => request<Milestone>('POST', `/thesis/${id}/milestones`, b),
  updateMilestone: (mid: string, b: Partial<{ title: string; due_date: string | null; position: number; feedback: string }>) => request<Milestone>('PUT', `/thesis/milestones/${mid}`, b),
  deleteMilestone: (mid: string) => request<void>('DELETE', `/thesis/milestones/${mid}`),
  upload: (id: string, file: File, milestoneId?: string, note?: string) => {
    const fd = new FormData(); fd.append('file', file);
    if (milestoneId) fd.append('milestone_id', milestoneId);
    if (note) fd.append('note', note);
    return rawUpload<Submission>(`/thesis/${id}/submissions`, fd);
  },
  review: (sid: string, b: { decision?: 'accepted' | 'revision_requested'; feedback?: string }) => request<Submission>('PUT', `/thesis/submissions/${sid}/review`, b),
  download: (s: Submission) => downloadAuthed(`/thesis/submissions/${s.id}/file`, s.file_name ?? 'file'),
};
