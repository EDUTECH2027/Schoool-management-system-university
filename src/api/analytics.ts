import { rawRequest as request, rawToken, API_BASE } from './client';

export interface Filters { academic_year_id?: string; term_id?: string; programme_id?: string }
export interface FilterOptions { years: { id: string; label: string; is_current: boolean; terms: { id: string; name: string; is_current: boolean }[] }[]; programmes: { id: string; name: string; code: string }[] }
interface Meta { filters: { academic_year: string | null; term: string | null; programme: string | null }; generated_at: string; cached: boolean; cache_age_seconds: number; compute_ms: number }
export interface Count { label: string; n: number }
export interface Overview extends Meta {
  students: { total: number; active: number; graduated: number; withdrawn: number; suspended: number; by_programme: Count[]; by_level: Count[]; by_gender: Count[] };
  lecturers: { total: number; active: number }; courses_offered: { total: number; open: number };
  registrations: { term_id: string; academic_year: string; term: string; registrations: number; students: number; credits: number; avg_credits: number | null }[];
  pending_exception_requests: number; results_awaiting_validation: { submitted: number; approved_not_published: number; draft: number };
  open_service_requests: number; open_grade_appeals: number;
}
export interface RateRow { n: number; passed: number; avg_score: number | null; pass_rate: number | null }
export interface Academics extends Meta {
  pass_mark: number; min_sample: number;
  summary: { marks: number; passed: number; pass_rate: number | null; students_with_gpa: number; mean_gpa: number | null; median_gpa: number | null };
  pass_by_course: (RateRow & { subject_id: string; code: string; name: string })[];
  pass_by_term: (RateRow & { term_id: string; academic_year: string; term: string })[];
  pass_by_programme: (RateRow & { programme_id: string | null; programme: string })[];
  grade_distribution: { grade: string; n: number; share: number | null }[];
  gpa_histogram: { from: number; to: number; n: number; label: string }[];
  hardest_courses: (RateRow & { code: string; name: string })[]; easiest_courses: (RateRow & { code: string; name: string })[];
  appeals: { total: number; by_status: Record<string, number>; upheld: number; rejected: number; open: number; upheld_rate: number | null };
  progression: { total: number; by_outcome: { outcome: string; n: number }[]; by_status: { status: string; n: number }[] };
}
export interface Attendance extends Meta {
  threshold: number; min_records: number;
  overall: { records: number; present: number; absent: number; late: number; excused: number; students: number; rate: number | null };
  by_class: { class_id: string; class_name: string; programme: string; records: number; rate: number | null }[];
  by_programme: { programme_id: string | null; programme: string; records: number; students: number; rate: number | null }[];
  below_threshold: { count: number; students: { student_id: string; name: string; matricule: string | null; class_name: string | null; records: number; rate: number | null }[] };
}
export interface Exams extends Meta {
  totals: { sessions: number; candidates: number; students: number; eligible: number; ineligible: number; overridden: number; present: number; absent: number; ineligible_rate: number | null };
  ineligible_by_reason: { code: string; message: string | null; n: number }[];
  sessions: { exam_id: string; title: string; code: string; course: string; kind: string; date: string; status: string; candidates: number; eligible: number; ineligible: number; present: number; absent: number }[];
}
interface Money { due: number; collected: number; outstanding: number; overdue: number; collection_rate: number | null }
export interface Finance extends Meta {
  currency: string; totals: Money & { fee_records: number; students_with_balance: number };
  by_month: (Money & { month: string })[]; by_programme: (Money & { programme: string })[];
  cash_received_by_month: { month: string; received: number }[];
  payment_methods: { method: string; n: number; amount: number; share: number | null }[];
  manual_payment_methods: { method: string; n: number; amount: number }[];
}
export interface Trends extends Meta {
  series: { term_id: string; label: string; registered_students: number; avg_credits: number | null; marks: number; pass_rate: number | null; avg_score: number | null; mean_gpa: number | null; attendance_rate: number | null; change: { registered_students: number | null; pass_rate: number | null; mean_gpa: number | null; attendance_rate: number | null } | null }[];
}

const qs = (o: Record<string, string | number | undefined | null>) => {
  const s = new URLSearchParams(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== '') as [string, string][]).toString();
  return s ? `?${s}` : '';
};
const get = <T>(name: string, f: Filters, extra: Record<string, string | number | undefined> = {}) => request<T>('GET', `/analytics/${name}${qs({ ...f, ...extra })}`);

export const analytics = {
  filters: () => request<FilterOptions>('GET', '/analytics/filters'),
  overview: (f: Filters, refresh = false) => get<Overview>('overview', f, { refresh: refresh ? 1 : undefined }),
  academics: (f: Filters, refresh = false) => get<Academics>('academics', f, { refresh: refresh ? 1 : undefined }),
  attendance: (f: Filters, threshold: number, refresh = false) => get<Attendance>('attendance', f, { threshold, refresh: refresh ? 1 : undefined }),
  exams: (f: Filters, refresh = false) => get<Exams>('exams', f, { refresh: refresh ? 1 : undefined }),
  finance: (f: Filters, refresh = false) => get<Finance>('finance', f, { refresh: refresh ? 1 : undefined }),
  trends: (f: Filters, refresh = false) => get<Trends>('trends', f, { refresh: refresh ? 1 : undefined }),
  /** Downloads one table of an endpoint as CSV (the token cannot ride on a plain link). */
  async exportCsv(name: string, table: string, f: Filters, extra: Record<string, string | number | undefined> = {}) {
    const token = rawToken();
    const res = await fetch(`${API_BASE}/api/analytics/${name}${qs({ ...f, ...extra, format: 'csv', table })}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) { const e = await res.json().catch(() => ({ error: res.statusText })); throw new Error(e.error ?? `HTTP ${res.status}`); }
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a'); a.href = url; a.download = `analytics-${name}-${table}.csv`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  },
};
