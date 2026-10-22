import { rawRequest as request, rawToken, API_BASE } from './client';

export interface SecEvent { id: string; user_id: string | null; email: string | null; type: string; ip: string | null; user_agent: string | null; detail: Record<string, unknown> | null; created_at: string }
export interface SecSummary {
  days: number; totals: Record<string, number>;
  by_day: { day: string; failed: number; success: number; locked: number; denied: number; rate_limited: number }[];
  top_ips: { ip: string; failures: number; accounts: number; last_seen: string }[];
  locked_accounts: { id: string; name: string; email: string; role: string; locked_until: string }[];
  must_change_password: number; accounts_with_failures: number;
}
export interface SecConfig { login_max_failures: number; login_lock_minutes: number; password_min_length: number; mfa: boolean }
export interface EventFilter { type?: string; email?: string; ip?: string; from?: string; to?: string }
export interface UserRow { id: string; name: string; email: string; role: string }

const qs = (o: Record<string, string | number | undefined>) => {
  const s = new URLSearchParams(Object.entries(o).filter(([, v]) => v !== undefined && v !== '') as [string, string][]).toString();
  return s ? `?${s}` : '';
};

export const security = {
  config: () => request<SecConfig>('GET', '/security/config'),
  summary: (days: number) => request<SecSummary>('GET', `/security/summary?days=${days}`),
  events: (f: EventFilter, page: number, limit = 25) => request<{ total: number; page: number; limit: number; items: SecEvent[] }>('GET', `/security/events${qs({ ...f, page, limit })}`),
  unlock: (id: string) => request<{ message: string }>('POST', `/security/users/${id}/unlock`),
  forceReset: (id: string, revoke_sessions: boolean) => request<{ message: string; revoked_sessions: boolean }>('POST', `/security/users/${id}/force-reset`, { revoke_sessions }),
  users: () => request<UserRow[]>('GET', '/users'),
  async exportCsv(f: EventFilter) {
    const token = rawToken();
    const res = await fetch(`${API_BASE}/api/security/events/export${qs({ ...f })}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) { const e = await res.json().catch(() => ({ error: res.statusText })); throw new Error(e.error ?? `HTTP ${res.status}`); }
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a'); a.href = url; a.download = 'security-events.csv'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  },
};
