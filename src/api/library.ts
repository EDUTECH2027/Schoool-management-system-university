import { rawRequest as request } from './client';

const qs = (q: Record<string, unknown>) => {
  const s = new URLSearchParams(Object.entries(q).filter(([, v]) => v !== undefined && v !== '' && v !== null && v !== false) as [string, string][]).toString();
  return s ? `?${s}` : '';
};
const J = <T>(m: string, p: string, b?: unknown) => request<T>(m, p, b);

export type ItemKind = 'book' | 'journal' | 'thesis' | 'digital';
export interface LibItem {
  id: string; isbn: string | null; title: string; authors: string | null; publisher: string | null; year: number | null; category: string | null; kind: ItemKind;
  location: string | null; description: string | null; copies_total: number; digital_url: string | null; is_active: boolean;
  available: number; active_loans: number; lost_copies: number; held_for_reservation: number; waiting: number;
  my_loan?: { id: string; due_at: string } | null; my_reservation?: { id: string; status: string } | null; warnings?: { code: string; message: string }[];
}
export interface Paged<T> { total: number; page: number; limit: number; items: T[] }
export interface Loan {
  id: string; item_id: string; title: string | null; authors: string | null; student_id: string | null; student: string | null; matricule: string | null;
  borrowed_at: string; due_at: string; returned_at: string | null; renewals: number; status: 'active' | 'returned' | 'lost';
  fine_amount: number; fine_paid: boolean; fine_waived: boolean; fine_open: boolean; overdue_days: number; accrued_fine: number; days_left: number | null;
}
export interface Reservation { id: string; item_id: string; title: string | null; student_id: string; student: string | null; matricule: string | null; status: string; created_at: string; notified_at: string | null; expires_at: string | null; position: number | null }
export interface LibSettings { id?: string; loan_days: number; max_loans: number; max_renewals: number; fine_per_day: number; currency: string; block_on_fines: boolean }
export interface MyLibrary { settings: LibSettings; loans: Loan[]; history: Loan[]; fines: Loan[]; fines_total: number; fines_unpaid: number; reservations: Reservation[] }
export interface StudentLookup { id: string; name: string; matricule: string; is_active: boolean; active_loans: number; max_loans: number; unpaid_fines: number; currency: string; blocked: boolean }
export interface LibStats { items: number; active_loans: number; overdue: number; reservations_waiting: number; reservations_ready: number; unpaid_fines: number; unpaid_fine_count: number }

export const lib = {
  items: (q: { q?: string; title?: string; author?: string; isbn?: string; category?: string; kind?: string; available?: boolean; active?: string; page?: number; limit?: number } = {}) => J<Paged<LibItem>>('GET', `/library/items${qs(q)}`),
  categories: () => J<string[]>('GET', '/library/categories'),
  saveItem: (b: Partial<LibItem>, id?: string) => J<LibItem>(id ? 'PUT' : 'POST', id ? `/library/items/${id}` : '/library/items', b),
  delItem: (id: string) => J<void>('DELETE', `/library/items/${id}`),
  settings: () => J<LibSettings>('GET', '/library/settings'),
  saveSettings: (b: Partial<LibSettings>) => J<LibSettings>('PUT', '/library/settings', b),
  stats: () => J<LibStats>('GET', '/library/stats'),
  lookup: (matricule: string) => J<StudentLookup>('GET', `/library/student-lookup${qs({ matricule })}`),
  loans: (q: { status?: string; q?: string; student_id?: string; page?: number; limit?: number } = {}) => J<Paged<Loan>>('GET', `/library/loans${qs(q)}`),
  issue: (b: { item_id: string; matricule?: string; student_id?: string; due_at?: string }) => J<Loan>('POST', '/library/loans', b),
  returnLoan: (id: string) => J<Loan>('POST', `/library/loans/${id}/return`),
  renew: (id: string) => J<Loan>('POST', `/library/loans/${id}/renew`),
  lost: (id: string, fine_amount?: number) => J<Loan>('POST', `/library/loans/${id}/lost`, { fine_amount }),
  payFine: (id: string) => J<Loan>('POST', `/library/loans/${id}/fine/pay`),
  waiveFine: (id: string, reason: string) => J<Loan>('POST', `/library/loans/${id}/fine/waive`, { reason }),
  fines: (status = 'unpaid') => J<{ total: number; amount: number; currency: string; items: Loan[] }>('GET', `/library/fines${qs({ status })}`),
  overdue: () => J<{ total: number; accrued_total: number; currency: string; items: Loan[] }>('GET', '/library/overdue'),
  reservations: (status?: string) => J<Reservation[]>('GET', `/library/reservations${qs({ status })}`),
  reserve: (item_id: string) => J<Reservation>('POST', '/library/reservations', { item_id }),
  cancelReservation: (id: string) => J<{ ok: true }>('POST', `/library/reservations/${id}/cancel`),
  sweep: () => J<{ expired: number }>('POST', '/library/sweep'),
  me: () => J<MyLibrary>('GET', '/library/me'),
};
