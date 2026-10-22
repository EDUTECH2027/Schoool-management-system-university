import { rawRequest as request, rawToken, API_BASE } from './client';

const qs = (q: Record<string, unknown>) => {
  const s = new URLSearchParams(Object.entries(q).filter(([, v]) => v !== undefined && v !== '' && v !== null && v !== false) as [string, string][]).toString();
  return s ? `?${s}` : '';
};
const J = <T>(m: string, p: string, b?: unknown) => request<T>(m, p, b);

export interface Room { id: string; code: string; name: string; building: string | null; capacity: number; kind: string; equipment: string | null; is_active: boolean; slot_count?: number; exam_count?: number; booking_count?: number; available?: boolean; busy?: Occupant[] }
export interface Occupant { kind: 'slot' | 'exam' | 'booking'; id: string; title: string; date?: string; day?: string; start_time: string; end_time: string }
export interface PeriodDef { id: string; key: string; label: string; start_time: string; end_time: string; sort_order: number }
export interface Booking { id: string; room_id: string; room_code: string; room_name: string; title: string; date: string; start_time: string; end_time: string; booked_by: string | null; status: string }
export interface AssignSlot { id: string; offering_id: string; course: string; code: string; section: string; lecturer: string | null; day: string; period_key: string; start_time: string | null; end_time: string | null; room: string | null; room_id: string | null; room_code: string | null; room_capacity: number | null; enrolled: number; offering_capacity: number | null; over_capacity: boolean }
export interface AssignExam { id: string; title: string; kind: string; course: string; code: string; date: string; start_time: string; end_time: string; status: string; room: string | null; room_id: string | null; room_code: string | null; room_capacity: number | null; candidates: number; over_capacity: boolean }
export interface Assignments { term: { id: string; name: string; academic_year?: string; start_date: string; end_date: string }; slots: AssignSlot[]; exams: AssignExam[] }
export interface TtEntry { slot_id: string; offering_id: string; day: string; period_key: string; start_time: string | null; end_time: string | null; period_known: boolean; course: string; code: string; section: string; lecturer: string | null; lecturer_id: string | null; room: string | null; room_id: string | null; room_name: string | null; building: string | null }
export interface TtExam { id: string; title: string; kind: string; course: string; code: string; date: string; start_time: string; end_time: string; room: string | null; status: string }
export interface TtView {
  view: string; subject: { id: string; name: string; matricule?: string; capacity?: number }; term: { id: string; name: string; academic_year: string | null; start_date: string; end_date: string };
  periods: { key: string; label: string; start_time: string; end_time: string }[]; entries: TtEntry[]; exams: TtExam[]; bookings: { id: string; title: string; date: string; start_time: string; end_time: string }[];
}
export interface TtConflict { id: string; type: string; severity: 'error' | 'warning' | 'info'; message: string; offering_ids?: string[]; slot_ids?: string[]; exam_ids?: string[]; day?: string; period_key?: string; links: { label: string; to: string }[] }
export interface ConflictReport { term: { id: string; name: string; academic_year: string | null }; summary: { error: number; warning: number; info: number }; conflicts: TtConflict[] }
export interface TtOptions { current_term_id: string | null; terms: { id: string; name: string; academic_year: string; is_current: boolean }[]; lecturers: { id: string; name: string }[]; rooms: { id: string; code: string; name: string; capacity: number }[]; programmes: { id: string; name: string; code: string }[]; levels: { id: string; name: string }[] }

async function download(path: string, filename: string) {
  const token = rawToken();
  const res = await fetch(`${API_BASE}/api${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new Error((await res.json().catch(() => ({ error: res.statusText }))).error ?? `HTTP ${res.status}`);
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const rooms = {
  list: (q: { active?: string; kind?: string; q?: string } = {}) => J<Room[]>('GET', `/rooms${qs(q)}`),
  save: (b: Partial<Room>, id?: string) => J<Room>(id ? 'PUT' : 'POST', id ? `/rooms/${id}` : '/rooms', b),
  del: (id: string) => J<void>('DELETE', `/rooms/${id}`),
  periods: () => J<PeriodDef[]>('GET', '/rooms/periods'),
  savePeriod: (b: Partial<PeriodDef>, id?: string) => J<PeriodDef>(id ? 'PUT' : 'POST', id ? `/rooms/periods/${id}` : '/rooms/periods', b),
  delPeriod: (id: string) => J<void>('DELETE', `/rooms/periods/${id}`),
  bookings: (q: { room_id?: string; from?: string; to?: string; status?: string } = {}) => J<Booking[]>('GET', `/rooms/bookings${qs(q)}`),
  book: (b: { room_id: string; title: string; date: string; start_time: string; end_time: string }) => J<Booking>('POST', '/rooms/bookings', b),
  cancelBooking: (id: string, reason?: string) => J<Booking>('POST', `/rooms/bookings/${id}/cancel`, { reason }),
  available: (q: { date?: string; start_time?: string; end_time?: string; day?: string; period_key?: string; term_id?: string; min_capacity?: number; kind?: string; all?: boolean }) => J<Room[]>('GET', `/rooms/available${qs(q)}`),
  assignments: (term_id?: string) => J<Assignments>('GET', `/rooms/assignments${qs({ term_id })}`),
  assignSlot: (b: { slot_id: string; room_id: string | null; override_reason?: string }) => J<{ warnings: string[] }>('POST', '/rooms/assign-slot', b),
  assignExam: (b: { exam_id: string; room_id: string | null; override_reason?: string }) => J<{ warnings: string[] }>('POST', '/rooms/assign-exam', b),
};

export const tt = {
  student: (id: string, termId?: string) => J<TtView>('GET', `/timetable-engine/student/${id}${qs({ term_id: termId })}`),
  lecturer: (id: string, termId?: string) => J<TtView>('GET', `/timetable-engine/lecturer/${id}${qs({ term_id: termId })}`),
  room: (id: string, termId?: string) => J<TtView>('GET', `/timetable-engine/room/${id}${qs({ term_id: termId })}`),
  programme: (id: string, levelId?: string, termId?: string) => J<TtView>('GET', `/timetable-engine/programme/${id}${qs({ level_id: levelId, term_id: termId })}`),
  conflicts: (termId?: string) => J<ConflictReport>('GET', `/timetable-engine/conflicts${qs({ term_id: termId })}`),
  options: () => J<TtOptions>('GET', '/timetable-engine/options'),
  students: (q: string) => J<{ id: string; name: string; matricule: string }[]>('GET', `/timetable-engine/students${qs({ q })}`),
  ics: (kind: 'student' | 'lecturer', id: string, termId?: string) => download(`/timetable-engine/${kind}/${id}/ics${qs({ term_id: termId })}`, `timetable-${kind}.ics`),
};
