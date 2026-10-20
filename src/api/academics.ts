/* eslint-disable @typescript-eslint/no-explicit-any */
import { rawRequest as request, API_BASE } from './client';

const qs = (q: Record<string, unknown>) => {
  const s = new URLSearchParams(Object.entries(q).filter(([, v]) => v !== undefined && v !== '' && v !== null) as [string, string][]).toString();
  return s ? `?${s}` : '';
};

// ── types ──────────────────────────────────────────────────────────────────────
export interface Faculty { id: string; name: string; code: string; description?: string | null; department_count?: number }
export interface Department { id: string; faculty_id: string; faculty_name?: string; name: string; code: string; head_name?: string | null; programme_count?: number; course_count?: number }
export interface Programme { id: string; department_id: string; department_name?: string; faculty_name?: string; name: string; code: string; award: string | null; duration_years: number; credits_required: number | null; is_active: boolean; class_count?: number; course_count?: number }
export interface Cohort { id: string; name: string; programme_id: string | null; programme: string | null; department: string | null; faculty: string | null; level_id: string | null; level: string | null; enrolled: number }
export interface Course { id: string; name: string; code: string; credit_hours: number; coefficient: number; department_id: string | null; level_id: string | null; semester: 'first' | 'second' | 'third' | null; description: string | null; is_active: boolean; prerequisite_ids: string[] }
export interface CurriculumItem { id?: string; subject_id: string; course?: string; code?: string; credits?: number; level_id: string | null; semester: 'first' | 'second' | 'third'; kind: 'core' | 'elective' }
export interface Slot { day: string; period_key: string; room?: string | null }
export interface Offering { id: string; subject_id: string; term_id: string; teacher_id: string | null; section: string; capacity: number | null; is_open: boolean; course: string; code: string; credits: number; lecturer: string | null; enrolled: number; slots: Slot[] }
export interface Period { id: string; term_id: string; programme_id: string | null; level_id: string | null; name: string | null; opens_at: string; closes_at: string; add_drop_until: string | null; min_credits: number; max_credits: number; allow_exceptions: boolean; term_name?: string; academic_year?: string; programme_name?: string | null; is_open?: boolean }
export interface RegRow { id: string; status: string; kind: string; credits: number; exception_reason: string | null; decision_note: string | null; registered_at: string; student_id: string; student: string; matricule: string; programme: string | null; course: string; code: string; section: string; term_id: string }
export interface Paged<T> { total: number; page: number; limit: number; items: T[] }
export interface Verdict { code: string; message: string }
export interface StudentOffering {
  id: string; course: string; code: string; credits: number; section: string; description: string | null; department: string | null; level: string | null; lecturer: string | null;
  capacity: number | null; seats_taken: number; slots: { day: string; period: string; room: string | null }[]; in_curriculum: boolean;
  prerequisites: { id: string; name: string; code: string; passed: boolean }[]; registration: string | null;
  can_register: boolean; needs_approval: boolean; blockers: Verdict[]; approvals: Verdict[];
}
export interface RegOverview {
  student: { id: string; name: string; matricule: string; class_name: string | null; level: string | null; programme: string | null; department: string | null; faculty: string | null };
  terms: { id: string; name: string; academic_year: string }[]; term: { id: string; name: string; academic_year: string | null } | null;
  period: { id: string; name: string | null; opens_at: string; closes_at: string; drop_until: string; is_open: boolean; can_drop: boolean; min_credits: number; max_credits: number; allow_exceptions: boolean } | null;
  credits: { registered: number; pending: number; min: number | null; max: number | null; below_minimum: boolean };
  registered: { id: string; status: string; kind: string; credits: number; exception_reason: string | null; decision_note: string | null; offering_id: string; course: string; code: string; section: string; lecturer: string | null; slots: { day: string; period: string; room: string | null }[] }[];
  offerings: StudentOffering[];
}
export interface Batch { subject_id: string; term_id: string; course: string; code: string; term: string; academic_year: string; draft: number; submitted: number; approved: number; published: number; lecturers: string[] }
export interface MarkRow { id: string; student_id: string; student_name: string | null; student_number: string | null; ca_score: number; exam_score: number; total_score: number; grade: string; remark: string | null; status: string; exam_absent: boolean }
export interface HistoryRow { id: string; action: string; from_status: string | null; to_status: string | null; reason: string | null; actor_name: string | null; actor_role: string | null; created_at: string }
export interface Band { grade: string; min_score: number; points: number; remark?: string | null; is_pass?: boolean }
export interface Scheme { id: string | null; name: string; ca_weight: number; exam_weight: number; pass_mark: number; resit_cap: number | null; bands: Band[]; built_in?: boolean }
export interface ProgressionRules { promote_min_gpa: number; max_carryover_courses: number; probation_gpa_below: number; graduation_min_gpa: number; graduation_max_outstanding: number; resit_min_total: number }
export interface Settings { exam_min_attendance_pct: number | null; exam_fee_rule: 'none' | 'no_overdue' | 'min_paid_pct'; exam_min_paid_pct: number; progression: ProgressionRules }
export interface Appeal { id: string; status: string; reason: string; decision_note: string | null; created_at: string; student: string; matricule: string; mark_id: string; course: string; ca_score: number; exam_score: number; total_score: number; grade: string }
export interface StudentResults {
  pass_mark: number; bands: Band[];
  terms: { term_id: string; term: string; academic_year: string; courses: { mark_id: string; course: string; code: string; credits: number; ca_score: number; exam_score: number; total_score: number; grade: string; points: number; passed: boolean; remark: string | null; exam_absent: boolean; appeal: { id: string; status: string; decision_note: string | null } | null }[]; credits: number; earned: number; gpa: number }[];
  cumulative: { gpa: number; credits: number; earned: number };
}
export interface Exam { id: string; subject_id: string; term_id: string; title: string; kind: string; date: string; start_time: string; end_time: string; room: string | null; status: string; course: string; code: string; term_name: string; academic_year: string; candidates: number; invigilators: { id: string; name: string }[] }
export interface Conflict { type: string; message: string }
export interface Candidate { id: string; student_id: string; name: string; matricule: string; class_name: string | null; eligible: boolean; reasons: { code: string; message: string }[] | null; override_reason: string | null; attendance: string | null }
export interface StudentExam { id: string; title: string; kind: string; course: string; code: string; date: string; start_time: string; end_time: string; room: string | null; status: string; term: string; academic_year: string; eligible: boolean | null; reasons: { code: string; message: string }[] | null }
export interface Decision { id: string; student_id: string; name: string; matricule: string; class_name: string | null; outcome: string; status: string; metrics: { year_gpa: number; cumulative_gpa: number; earned_credits: number; attempted_credits: number; failed_courses: number; outstanding_courses: number; reasons?: string[]; is_final_level?: boolean }; target_class_id: string | null; target_class: string | null; note: string | null }
export interface OfficialDoc { id: string; code: string; type: string; student_id: string; status: 'issued' | 'revoked'; issued_at: string; issued_by_name: string | null; revoked_reason: string | null; verify_url: string; student?: string; matricule?: string; payload?: Record<string, any>; qr?: string }
export interface Verification { valid: boolean; status?: string; type?: string; code?: string; issued_at?: string; school?: string | null; student?: { name: string; matricule: string | null; programme: string | null } | null }
export interface LecturerOffering { id: string; course: string; code: string; credits: number; section: string; term_id: string; term: string; academic_year: string; capacity: number | null; registered: number; slots: Slot[] & { period?: string }[]; marks: { draft: number; submitted: number; approved: number; published: number } }
export interface RosterStudent { student_id: string; name: string; matricule: string; mark: { id: string; ca_score: number; exam_score: number; total_score: number; grade: string; remark: string | null; status: string; exam_absent: boolean } | null; exam_eligible: boolean | null }
export interface AuditRow { id: string; actor_name: string | null; actor_role: string | null; action: string; target_type: string; target_id: string; reason: string | null; created_at: string }
export interface Profile {
  student: { name: string; matricule: string; class_name: string | null; level: string | null; programme: string | null; department: string | null; faculty: string | null; academic_status: string; photo_url?: string | null };
  term: { name: string; academic_year: string | null } | null;
  registered_courses: { id: string; status: string; course: string; code: string; credits: number; section: string; lecturer: string | null }[]; credits_registered: number;
  performance: { cumulative: { gpa: number; totalCreditHours: number; courseCount: number } | null; by_term: { term: string; academic_year: string | null; gpa: number; credits: number; courses: number }[] };
  attendance: { present: number; absent: number; late: number; excused: number; total: number; rate: number | null };
  enrollment_history: { id: string; class_name: string | null; programme_name: string | null; level_name: string | null; reason: string | null; started_at: string; ended_at: string | null }[];
  finance?: { due: number; paid: number; balance: number };
}

const J = <T>(m: string, p: string, b?: unknown) => request<T>(m, p, b);

export interface PersonRow { id: string; first_name: string; last_name: string; student_number?: string; class_name?: string | null }

export const acad = {
  teachers: () => J<PersonRow[]>('GET', '/teachers'),
  students: (search: string) => J<PersonRow[]>('GET', `/students${qs({ search })}`),
  // structure
  faculties: () => J<Faculty[]>('GET', '/academics/faculties'),
  saveFaculty: (b: Partial<Faculty>, id?: string) => J<Faculty>(id ? 'PUT' : 'POST', id ? `/academics/faculties/${id}` : '/academics/faculties', b),
  delFaculty: (id: string) => J<void>('DELETE', `/academics/faculties/${id}`),
  departments: () => J<Department[]>('GET', '/academics/departments'),
  saveDepartment: (b: Partial<Department>, id?: string) => J<Department>(id ? 'PUT' : 'POST', id ? `/academics/departments/${id}` : '/academics/departments', b),
  delDepartment: (id: string) => J<void>('DELETE', `/academics/departments/${id}`),
  programmes: () => J<Programme[]>('GET', '/academics/programmes'),
  saveProgramme: (b: Partial<Programme>, id?: string) => J<Programme>(id ? 'PUT' : 'POST', id ? `/academics/programmes/${id}` : '/academics/programmes', b),
  delProgramme: (id: string) => J<void>('DELETE', `/academics/programmes/${id}`),
  cohorts: () => J<Cohort[]>('GET', '/academics/classes'),
  setCohortProgramme: (classId: string, programmeId: string | null) => J('PUT', `/academics/classes/${classId}/programme`, { programme_id: programmeId }),
  curriculum: (programmeId: string) => J<CurriculumItem[]>('GET', `/academics/programmes/${programmeId}/curriculum`),
  saveCurriculum: (programmeId: string, items: CurriculumItem[]) => J<{ saved: number }>('PUT', `/academics/programmes/${programmeId}/curriculum`, { items }),
  // catalogue
  courses: (q: { q?: string; departmentId?: string; levelId?: string } = {}) => J<Course[]>('GET', `/subjects${qs(q)}`),
  saveCourse: (b: Partial<Course>, id?: string) => J<Course>(id ? 'PUT' : 'POST', id ? `/subjects/${id}` : '/subjects', b),
  delCourse: (id: string) => J<void>('DELETE', `/subjects/${id}`),
  // offerings, periods, registrations
  offerings: (q: { termId?: string; q?: string } = {}) => J<Offering[]>('GET', `/academics/offerings${qs(q)}`),
  saveOffering: (b: Record<string, unknown>, id?: string) => J<Offering>(id ? 'PUT' : 'POST', id ? `/academics/offerings/${id}` : '/academics/offerings', b),
  delOffering: (id: string) => J<void>('DELETE', `/academics/offerings/${id}`),
  roster: (id: string) => J<{ offering: { course: string; code: string; section: string; term: string; lecturer: string | null }; students: { student_id: string; name: string; matricule: string; programme: string | null; class_name: string | null; kind: string }[] }>('GET', `/academics/offerings/${id}/roster`),
  periods: (termId?: string) => J<Period[]>('GET', `/academics/registration-periods${qs({ termId })}`),
  savePeriod: (b: Partial<Period>, id?: string) => J<Period>(id ? 'PUT' : 'POST', id ? `/academics/registration-periods/${id}` : '/academics/registration-periods', b),
  delPeriod: (id: string) => J<void>('DELETE', `/academics/registration-periods/${id}`),
  registrations: (q: { status?: string; termId?: string; q?: string; page?: number; limit?: number } = {}) => J<Paged<RegRow>>('GET', `/academics/registrations${qs(q)}`),
  decide: (id: string, decision: 'approve' | 'reject', note?: string) => J('POST', `/academics/registrations/${id}/decision`, { decision, note }),
  registerFor: (b: { student_id: string; offering_id: string; override?: boolean; reason?: string }) => J('POST', '/academics/registrations', b),
  dropFor: (id: string, reason: string) => J('POST', `/academics/registrations/${id}/drop`, { reason }),
  profileOf: (studentId: string) => J<Profile>('GET', `/academics/students/${studentId}/profile`),
  audit: (q: { page?: number; limit?: number; action?: string } = {}) => J<Paged<AuditRow>>('GET', `/academics/audit${qs(q)}`),
  // student registration
  myRegistration: (termId?: string) => J<RegOverview>('GET', `/registration/me${qs({ termId })}`),
  enroll: (offering_id: string, exception_reason?: string) => J<{ enrollment: { id: string; status: string }; pending_approval: boolean }>('POST', '/registration/me/enroll', { offering_id, exception_reason }),
  drop: (enrollment_id: string, reason?: string) => J('POST', '/registration/me/drop', { enrollment_id, reason }),
  mySummary: (termId?: string) => J<{ generated_at: string; school: { name: string; address: string | null }; student: RegOverview['student']; term: { name: string; academic_year: string | null }; courses: RegOverview['registered']; pending: RegOverview['registered']; credits: RegOverview['credits'] }>('GET', `/registration/me/summary${qs({ termId })}`),
  myProfile: () => J<Profile>('GET', '/registration/me/profile'),
  // results
  batches: (termId?: string) => J<Batch[]>('GET', `/results/batches${qs({ termId })}`),
  batchMarks: (subjectId: string, termId: string) => J<MarkRow[]>('GET', `/results/marks${qs({ subjectId, termId })}`),
  markHistory: (id: string) => J<HistoryRow[]>('GET', `/results/marks/${id}/history`),
  transition: (b: { action: string; subject_id?: string; term_id?: string; mark_ids?: string[]; reason?: string }) => J<{ moved: number; skipped: unknown[] }>('POST', '/results/transition', b),
  scheme: () => J<Scheme>('GET', '/results/scheme'),
  saveScheme: (b: Scheme & { reason?: string }) => J<Scheme>('PUT', '/results/scheme', b),
  settings: () => J<Settings>('GET', '/results/settings'),
  saveSettings: (b: Partial<Settings> & { reason?: string }) => J('PUT', '/results/settings', b),
  myResults: () => J<StudentResults>('GET', '/results/me'),
  appeal: (mark_id: string, reason: string) => J('POST', '/results/me/appeals', { mark_id, reason }),
  appeals: (status?: string) => J<Appeal[]>('GET', `/results/appeals${qs({ status })}`),
  decideAppeal: (id: string, b: { decision: 'uphold' | 'reject' | 'review'; note?: string; new_ca?: number; new_exam?: number }) => J('POST', `/results/appeals/${id}/decision`, b),
  // exams
  exams: (q: { termId?: string; status?: string } = {}) => J<Exam[]>('GET', `/exams${qs(q)}`),
  saveExam: (b: Record<string, unknown>, id?: string) => J<Exam & { conflicts: Conflict[] }>(id ? 'PUT' : 'POST', id ? `/exams/${id}` : '/exams', b),
  cancelExam: (id: string, reason: string) => J('POST', `/exams/${id}/cancel`, { reason }),
  completeExam: (id: string) => J('POST', `/exams/${id}/complete`),
  genCandidates: (id: string) => J<{ created: number; updated: number; ineligible: number }>('POST', `/exams/${id}/candidates/generate`),
  candidates: (id: string) => J<{ exam: Exam; candidates: Candidate[] }>('GET', `/exams/${id}/candidates`),
  overrideCandidate: (id: string, studentId: string, reason: string) => J('POST', `/exams/${id}/candidates/${studentId}/override`, { reason }),
  examAttendance: (id: string, records: { student_id: string; attendance: 'present' | 'absent' }[]) => J<{ saved: number; skipped: { error: string }[] }>('POST', `/exams/${id}/attendance`, { records }),
  myExams: () => J<StudentExam[]>('GET', '/exams/me/timetable'),
  // progression
  runProgression: (b: { academic_year_id: string; programme_id?: string; class_id?: string }) => J<{ counts: { proposed: number; skipped: number } }>('POST', '/progression/run', b),
  decisions: (q: { academicYearId?: string; status?: string; outcome?: string; q?: string }) => J<Decision[]>('GET', `/progression${qs(q)}`),
  decideProgression: (id: string, b: { decision: 'approve' | 'reject'; target_class_id?: string; note?: string }) => J('POST', `/progression/${id}/decision`, b),
  applyProgression: (id: string) => J('POST', `/progression/${id}/apply`),
  myProgression: () => J<{ id: string; academic_year: string; outcome: string; status: string; note: string | null; metrics: { year_gpa: number; cumulative_gpa: number; earned_credits: number } }[]>('GET', '/progression/me'),
  // documents
  issueDoc: (b: { student_id: string; type: string; term_id?: string; academic_year_id?: string }) => J<OfficialDoc>('POST', '/documents/issue', b),
  docs: (q: { student_id?: string; type?: string } = {}) => J<OfficialDoc[]>('GET', `/documents${qs(q)}`),
  myDocs: () => J<OfficialDoc[]>('GET', '/documents/me'),
  doc: (id: string) => J<OfficialDoc>('GET', `/documents/${id}`),
  revokeDoc: (id: string, reason: string) => J('POST', `/documents/${id}/revoke`, { reason }),
  verify: async (code: string): Promise<Verification & { http: number }> => {
    const r = await fetch(`${API_BASE}/api/verify/${encodeURIComponent(code.trim())}`);
    const body = await r.json().catch(() => ({ valid: false }));
    return { ...body, http: r.status };
  },
  // lecturer
  myOfferings: (termId?: string) => J<LecturerOffering[]>('GET', `/lecturer/offerings${qs({ termId })}`),
  lecturerRoster: (id: string) => J<{ offering: { id: string; course: string; code: string; section: string; term: string; academic_year: string }; students: RosterStudent[] }>('GET', `/lecturer/offerings/${id}/roster`),
  saveMarks: (id: string, marks: { student_id: string; ca_score: number; exam_score: number; exam_absent?: boolean }[]) => J<{ saved: number; skipped: { studentId: string; error: string }[] }>('POST', `/lecturer/offerings/${id}/marks`, { marks }),
  submitMarks: (id: string) => J<{ moved: number; students_without_marks: number }>('POST', `/lecturer/offerings/${id}/submit`),
};
