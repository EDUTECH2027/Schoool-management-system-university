import { rawRequest as request, rawUpload as upload, rawToken, API_BASE } from './client';

export type TxStatus = 'initiated' | 'pending' | 'processing' | 'successful' | 'failed' | 'cancelled' | 'awaiting_verification' | 'refunded' | 'expired';
export type ProviderId = 'orange_money' | 'mtn_momo' | 'bank_transfer' | 'stripe';

export interface PayMethod {
  id: ProviderId; label: string; flow: 'push' | 'redirect' | 'manual'; requires_phone: boolean; configured: boolean; currency: string;
  bank?: { bank_name: string; account_name: string; account_number: string; swift: string | null; branch: string | null; notes: string | null };
}
export interface PayInvoice {
  id: string; number: string; fee_name: string; academic_year: string | null; currency: string;
  amount_due: number; amount_paid: number; balance: number; status: 'pending' | 'partial' | 'paid' | 'overdue' | 'waived';
  due_date: string | null; pending_amount: number;
}
export interface PaySummary {
  student: { id: string; name: string; matricule: string; class_name: string | null; level: string | null; faculty: string | null; department: string | null };
  academic_year: string | null; currency: string;
  totals: { due: number; paid: number; balance: number; overdue: number; pending: number };
  invoices: PayInvoice[];
  upcoming: { invoice_id: string; fee_name: string; due_date: string; balance: number; overdue: boolean }[];
  methods: PayMethod[];
  rules: { min_amount: number; allow_partial: boolean };
}
export interface PayTx {
  id: string; reference: string; fee_record_id: string; student_id: string; amount: number; currency: string; provider: ProviderId;
  status: TxStatus; provider_ref: string | null; provider_txn_id: string | null; payer_phone: string | null; checkout_url?: string | null;
  failure_reason: string | null; bank_reference: string | null; has_receipt: boolean; receipt_name: string | null; expires_at: string | null;
  refunded_amount: number; created_at: string; updated_at: string;
  fee_name?: string; academic_year?: string | null; receipt_number?: string | null; payment_id?: string | null;
  bank?: PayMethod['bank'] | null; events?: { id: string; to_status: string; from_status: string | null; source: string; note: string | null; created_at: string; actor_name?: string | null }[];
  // staff-only
  needs_review?: boolean; review_note?: string | null; student_name?: string; matricule?: string; class_name?: string | null;
}
export interface Receipt {
  receipt_number: string; issued_at: string; payment_date: string | null;
  school: { name: string; address: string | null; phone: string | null; email: string | null };
  student: { name: string; matricule: string | null; class_name: string | null };
  invoice: { number: string; fee_name: string; academic_year: string | null; amount_due: number; amount_paid_to_date: number; balance: number };
  payment: { amount: number; currency: string; method: string | null; reference: string | null; provider_transaction: string | null };
  footer: string;
}
export interface Paged<T> { total: number; page: number; limit: number; items: T[] }

const qs = (q: Record<string, unknown>) => {
  const s = new URLSearchParams(Object.entries(q).filter(([, v]) => v !== undefined && v !== '' && v !== null) as [string, string][]).toString();
  return s ? `?${s}` : '';
};

export const payApi = {
  // ── student ───────────────────────────────────────────────
  summary: () => request<PaySummary>('GET', '/payments/me/summary'),
  transactions: (q: { page?: number; limit?: number } = {}) => request<Paged<PayTx>>('GET', `/payments/me/transactions${qs(q)}`),
  startPayment: (b: { invoice_id: string; amount: number; provider: ProviderId; phone?: string; idempotency_key: string; lang?: string }) =>
    request<PayTx>('POST', '/payments/me/transactions', b),
  transaction: (id: string) => request<PayTx>('GET', `/payments/me/transactions/${id}`),
  cancel: (id: string) => request<PayTx>('POST', `/payments/me/transactions/${id}/cancel`),
  uploadSlip: (id: string, file: File, bankReference?: string) => {
    const f = new FormData(); f.append('receipt', file); if (bankReference) f.append('bank_reference', bankReference);
    return upload<PayTx>(`/payments/me/transactions/${id}/receipt`, f);
  },
  receipt: (paymentId: string) => request<Receipt>('GET', `/payments/me/payments/${paymentId}/receipt`),
  myPayments: () => request<{ id: string; amount: number; kind: string; method: string | null; reference: string | null; payment_date: string | null; receipt_number: string | null; fee_name: string; academic_year: string | null; currency: string }[]>('GET', '/payments/me/payments'),

  // ── finance staff ───────────────────────────────────────────
  fin: {
    summary: (academicYear?: string) => request<FinSummary>('GET', `/finance/summary${qs({ academicYear })}`),
    providers: () => request<(PayMethod & { missing: string[]; callbacks_need_public_url?: boolean })[]>('GET', '/finance/providers'),
    transactions: (q: Record<string, unknown>) => request<Paged<PayTx>>('GET', `/finance/transactions${qs(q)}`),
    transaction: (id: string) => request<PayTx & { invoice: { id: string; number: string; amount_due: number; amount_paid: number; balance: number; status: string; currency: string } }>('GET', `/finance/transactions/${id}`),
    review: (id: string, b: { decision: 'approve' | 'reject'; reason?: string; bank_reference?: string }) => request<{ transaction: PayTx; receipt_number: string | null }>('POST', `/finance/transactions/${id}/review`, b),
    recheck: (id: string) => request<{ transaction: PayTx; changed: boolean; error: string | null }>('POST', `/finance/transactions/${id}/recheck`),
    resolveReview: (id: string, reason: string) => request<{ ok: true }>('POST', `/finance/transactions/${id}/resolve-review`, { reason }),
    payments: (q: Record<string, unknown>) => request<Paged<LedgerRow>>('GET', `/finance/payments${qs(q)}`),
    receipt: (paymentId: string) => request<Receipt>('GET', `/finance/payments/${paymentId}/receipt`),
    manual: (b: { fee_record_id: string; amount: number; method: string; reference?: string; reason: string }) => request('POST', '/finance/payments/manual', b),
    refund: (paymentId: string, b: { amount?: number; reason: string; provider_refund?: boolean }) => request('POST', `/finance/payments/${paymentId}/refund`, b),
    adjust: (invoiceId: string, b: { amount_due?: number; waive?: boolean; reason: string }) => request('POST', `/finance/invoices/${invoiceId}/adjust`, b),
    statement: (studentId: string) => request<Statement>('GET', `/finance/students/${studentId}/statement`),
    pendingBank: () => request<PayTx[]>('GET', '/finance/reconcile/pending'),
    reconcile: (csv: string, apply: boolean) => request<ReconcileResult>('POST', `/finance/reconcile/import${apply ? '?apply=true' : ''}`, { csv }),
    audit: (q: Record<string, unknown>) => request<Paged<AuditRow>>('GET', `/finance/audit${qs(q)}`),
  },
};

export interface FinSummary {
  currency: string; academic_year: string | null; expected: number; collected: number; outstanding: number; invoices: number;
  overdue: { amount: number; count: number };
  collections: { today: number; week: number; month: number; year: number };
  invoice_status: Record<string, number>;
  needs_attention: { awaiting_verification: number; pending: number; processing: number; failed_7d: number; needs_review: number };
  by_method: { method: string; amount: number; count: number }[];
  by_class: { class_name: string; expected: number; collected: number; outstanding: number; invoices: number }[];
  by_academic_year: { academic_year: string; expected: number; collected: number; outstanding: number }[];
  daily: { date: string; amount: number }[];
}
export interface LedgerRow {
  id: string; receipt_number: string | null; amount: number; kind: 'payment' | 'refund'; method: string | null; reference: string | null;
  payment_date: string | null; created_at: string; transaction_id: string | null; student_name: string; matricule: string; fee_name: string; academic_year: string | null; currency: string;
}
export interface Statement {
  student: { id: string; name: string; matricule: string; class_name: string | null };
  totals: { due: number; paid: number; balance: number };
  invoices: (PayInvoice & { id: string })[];
  payments: { id: string; receipt_number: string | null; amount: number; kind: string; method: string | null; reference: string | null; payment_date: string | null; fee_name: string }[];
  transactions: PayTx[];
}
export interface ReconcileResult {
  applied: boolean; counts: Record<string, number>;
  rows: { line: number; status: string; reference?: string; amount?: number | null; expected?: number; student_name?: string; transaction_status?: string; error?: string; text?: string }[];
}
export interface AuditRow { id: string; actor_name: string | null; actor_role: string | null; action: string; target_type: string; target_id: string; reason: string | null; before: unknown; after: unknown; created_at: string }

// Authenticated file download (CSV exports, bank slips) — the token cannot ride on a plain link.
export async function downloadAuthed(path: string, filename: string) {
  const token = rawToken();
  const res = await fetch(`${API_BASE}/api${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) { const e = await res.json().catch(() => ({ error: res.statusText })); throw new Error(e.error ?? `HTTP ${res.status}`); }
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
export async function openAuthed(path: string) {
  const token = rawToken();
  const win = window.open('', '_blank');
  try {
    const res = await fetch(`${API_BASE}/api${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const url = URL.createObjectURL(await res.blob());
    if (win) win.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (e) { win?.close(); throw e; }
}
