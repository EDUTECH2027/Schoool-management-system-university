/* eslint-disable @typescript-eslint/no-explicit-any */
import { rawRequest as request, API_BASE } from './client';

const qs = (q: Record<string, unknown>) => {
  const s = new URLSearchParams(Object.entries(q).filter(([, v]) => v !== undefined && v !== '' && v !== null) as [string, string][]).toString();
  return s ? `?${s}` : '';
};
const J = <T>(m: string, p: string, b?: unknown) => request<T>(m, `/assessments${p}`, b);
const token = () => { try { return JSON.parse(localStorage.getItem('auth_user') ?? '{}').token ?? null; } catch { return null; } };

// ── types ──────────────────────────────────────────────────────────────────────
export interface OfferingInfo { id: string; course: string; code: string; section: string; term_id: string; term: string; academic_year: string; teacher_id: string | null; lecturer: string | null }
export interface OfferingRow extends OfferingInfo { assignments: number; quizzes: number }
export type Status = 'draft' | 'published' | 'closed';
export interface Submission { id: string; assignment_id: string; student_id: string; text: string | null; file_name: string | null; file_mime: string | null; file_size: number | null; has_file: boolean; submitted_at: string; is_late: boolean; status: 'submitted' | 'graded' | 'returned'; score: number | null; feedback: string | null; graded_at: string | null }
export interface Assignment {
  id: string; offering_id: string; title: string; instructions: string | null; due_at: string; max_score: number; weight: number; allow_late: boolean; allow_text: boolean; allow_file: boolean; status: Status;
  offering?: OfferingInfo; submission_count?: number; graded_count?: number; submission?: Submission | null; now?: string;
}
export interface AssignmentInput { offering_id?: string; title: string; instructions?: string; due_at: string; max_score: number; weight: number; allow_late: boolean; allow_text: boolean; allow_file: boolean }
export interface SubmissionRow { student_id: string; name: string; matricule: string; submission: Submission | null }
export interface AttemptSummary { id: string; quiz_id: string; student_id: string; attempt_no: number; status: 'in_progress' | 'submitted' | 'graded'; started_at: string; deadline_at: string | null; submitted_at: string | null; score: number | null; max_score: number | null; overridden: boolean; auto_submitted: boolean }
export type QType = 'single' | 'multiple' | 'true_false' | 'short';
export interface Question { id: string; position?: number; type: QType; text: string; options: { id: string; text: string }[] | null; points: number; answer?: any; explanation?: string | null; correct?: boolean; awarded?: number }
export interface QuestionInput { type: QType; text: string; options?: { id: string; text: string }[]; answer: any; points: number; explanation?: string }
export interface Quiz {
  id: string; offering_id: string; title: string; instructions: string | null; opens_at: string | null; closes_at: string | null; duration_minutes: number | null; max_attempts: number; shuffle: boolean; show_answers: boolean; weight: number; status: Status;
  offering?: OfferingInfo; question_count?: number; attempt_count?: number; attempts?: AttemptSummary[]; questions?: Question[]; now?: string; answers_visible?: boolean;
}
export interface QuizInput { offering_id?: string; title: string; instructions?: string; opens_at?: string | null; closes_at?: string | null; duration_minutes?: number | null; max_attempts: number; shuffle: boolean; show_answers: boolean; weight: number }
export interface AttemptView extends AttemptSummary {
  server_now: string; quiz: { id: string; title: string; instructions: string | null; duration_minutes: number | null; closes_at: string | null; show_answers: boolean };
  questions: Question[]; responses: Record<string, any>; answers_visible?: boolean; override_note?: string | null;
}
export interface TeacherAttempt extends AttemptSummary { student: string; matricule: string; auto_score: number | null; override: { score: number; note: string; by: string; previous: number } | null; responses: Record<string, any>; questions: Question[] }
export interface QuizStats { attempts: number; students: number; average_pct: number | null; highest_pct: number | null; lowest_pct: number | null; questions: { id: string; type: QType; text: string; points: number; answered: number; correct: number; correct_pct: number | null; choices: Record<string, { text: string; count: number; correct: boolean }> | null }[] }
export interface GbColumn { key: string; kind: 'assignment' | 'quiz'; id: string; title: string; max_score: number | null; weight: number; status: Status; due_at: string | null }
export interface GbItem { state: 'graded' | 'pending' | 'missing'; score?: number; max?: number; pct?: number; late?: boolean }
export interface GbLine { student_id: string; name: string; matricule: string; items: Record<string, GbItem>; ca: { value: number | null; counted: number; pending: number; missing: number; total: number } }
export interface Gradebook { offering: OfferingInfo; columns: GbColumn[]; students: GbLine[] }
export interface ExportRow { student_id: string; name: string; matricule: string; ca: number | null; counted: number; missing: number; pending: number; current: { ca_score: number; exam_score: number; status: string } | null; action: 'write' | 'skip' | 'written' | 'unchanged'; reason?: string; locked_status?: string; after?: { ca_score: number; exam_score: number } }
export interface ExportResult { dry_run: boolean; will_write?: number; written?: number; unchanged?: number; skipped: number; students: ExportRow[] }

async function sendForm<T>(path: string, form: FormData): Promise<T> {
  const t = token();
  const res = await fetch(`${API_BASE}/api/assessments${path}`, { method: 'POST', headers: t ? { Authorization: `Bearer ${t}` } : {}, body: form });
  if (!res.ok) { const e = await res.json().catch(() => ({ error: res.statusText })); throw new Error(e.error ?? `HTTP ${res.status}`); }
  return res.json();
}

export const assess = {
  offerings: (termId?: string) => J<OfferingRow[]>('GET', `/offerings${qs({ termId })}`),
  // assignments
  assignments: (q: { offering_id?: string; term_id?: string } = {}) => J<Assignment[]>('GET', `/assignments${qs(q)}`),
  assignment: (id: string) => J<Assignment>('GET', `/assignments/${id}`),
  createAssignment: (b: AssignmentInput) => J<Assignment>('POST', '/assignments', b),
  updateAssignment: (id: string, b: Partial<AssignmentInput>) => J<Assignment>('PUT', `/assignments/${id}`, b),
  deleteAssignment: (id: string) => J<void>('DELETE', `/assignments/${id}`),
  setAssignmentStatus: (id: string, status: Status) => J<Assignment>('POST', `/assignments/${id}/status`, { status }),
  submissions: (id: string) => J<{ assignment: Assignment; students: SubmissionRow[] }>('GET', `/assignments/${id}/submissions`),
  grade: (id: string, sid: string, b: { score: number; feedback?: string; status?: 'graded' | 'returned' }) => J<Submission>('POST', `/assignments/${id}/submissions/${sid}/grade`, b),
  submit: (id: string, text: string, file: File | null) => { const f = new FormData(); if (text.trim()) f.append('text', text); if (file) f.append('file', file); return sendForm<Submission>(`/assignments/${id}/submit`, f); },
  async downloadSubmission(id: string, sid: string, name: string) {
    const res = await fetch(`${API_BASE}/api/assessments/assignments/${id}/submissions/${sid}/file`, { headers: { Authorization: `Bearer ${token()}` } });
    if (!res.ok) { const e = await res.json().catch(() => ({ error: res.statusText })); throw new Error(e.error ?? `HTTP ${res.status}`); }
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  },
  // quizzes
  quizzes: (q: { offering_id?: string; term_id?: string } = {}) => J<Quiz[]>('GET', `/quizzes${qs(q)}`),
  quiz: (id: string) => J<Quiz>('GET', `/quizzes/${id}`),
  createQuiz: (b: QuizInput) => J<Quiz>('POST', '/quizzes', b),
  updateQuiz: (id: string, b: Partial<QuizInput>) => J<Quiz>('PUT', `/quizzes/${id}`, b),
  deleteQuiz: (id: string) => J<void>('DELETE', `/quizzes/${id}`),
  setQuizStatus: (id: string, status: Status) => J<Quiz>('POST', `/quizzes/${id}/status`, { status }),
  addQuestion: (id: string, b: QuestionInput) => J<Question>('POST', `/quizzes/${id}/questions`, b),
  updateQuestion: (id: string, qid: string, b: QuestionInput) => J<Question>('PUT', `/quizzes/${id}/questions/${qid}`, b),
  deleteQuestion: (id: string, qid: string) => J<void>('DELETE', `/quizzes/${id}/questions/${qid}`),
  reorderQuestions: (id: string, ids: string[]) => J<Question[]>('PUT', `/quizzes/${id}/questions/reorder`, { ids }),
  stats: (id: string) => J<QuizStats>('GET', `/quizzes/${id}/stats`),
  quizAttempts: (id: string) => J<{ quiz: Quiz; students: { student_id: string; name: string; matricule: string; attempts: AttemptSummary[] }[] }>('GET', `/quizzes/${id}/attempts`),
  teacherAttempt: (id: string, aid: string) => J<TeacherAttempt>('GET', `/quizzes/${id}/attempts/${aid}`),
  override: (id: string, aid: string, score: number, note: string) => J<AttemptSummary>('POST', `/quizzes/${id}/attempts/${aid}/override`, { score, note }),
  // student attempts
  start: (id: string) => J<AttemptView>('POST', `/quizzes/${id}/attempts`, {}),
  attempt: (id: string, aid: string) => J<AttemptView>('GET', `/quizzes/${id}/attempts/${aid}`),
  save: (id: string, aid: string, responses: Record<string, unknown>) => J<{ saved_at: string; server_now: string; deadline_at: string | null }>('PUT', `/quizzes/${id}/attempts/${aid}/answers`, { responses }),
  submitAttempt: (id: string, aid: string, responses: Record<string, unknown>) => J<AttemptView>('POST', `/quizzes/${id}/attempts/${aid}/submit`, { responses }),
  // gradebook
  gradebook: (offeringId: string) => J<Gradebook>('GET', `/gradebook/${offeringId}`),
  myGradebook: () => J<{ offering: OfferingInfo; columns: GbColumn[]; line: GbLine | null }[]>('GET', '/gradebook/me'),
  exportCA: (offeringId: string, dry_run: boolean, student_ids?: string[]) => J<ExportResult>('POST', `/gradebook/${offeringId}/export-ca`, { dry_run, student_ids }),
};
