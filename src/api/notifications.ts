import { rawRequest as request } from './client';

const qs = (q: Record<string, unknown>) => {
  const s = new URLSearchParams(Object.entries(q).filter(([, v]) => v !== undefined && v !== '' && v !== null) as [string, string][]).toString();
  return s ? `?${s}` : '';
};

export interface CenterNotification { id: string; type: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string }
export interface CenterList { total: number; unread: number; page: number; limit: number; items: CenterNotification[] }
export interface PrefType { type: string; label_en: string; label_fr: string; critical: boolean; email: boolean }
export interface Preferences { in_app: boolean; email: boolean; muted_types: string[]; always_delivered: string[]; email_configured: boolean; types?: PrefType[] }
export interface Audience { roles: string[]; programme_ids: string[]; class_ids: string[]; offering_ids: string[] }
export interface BroadcastOptions { roles: string[]; programmes: { id: string; name: string; code: string }[]; classes: { id: string; name: string }[]; offerings: { id: string; name: string }[]; max_recipients: number; email_configured: boolean }
export interface Preview { recipients: number; with_email: number; breakdown: Record<string, number>; max_recipients: number }
export interface Broadcast { id: string; title: string; body: string; channels: string[]; recipients: number; created_by_name: string | null; created_at: string; must_read: boolean; audience: Audience; delivered: { in_app: number; email: number } | null; warning?: string; email_configured?: boolean }
export interface OutboxRow { id: string; to_email: string; subject: string; type: string | null; status: 'queued' | 'sent' | 'failed' | 'skipped'; attempts: number; error: string | null; created_at: string; sent_at: string | null }
export interface Outbox { smtp: { configured: boolean; host: string | null; port: number | null; from: string | null; worker: boolean }; max_attempts: number; counts: Record<'queued' | 'sent' | 'failed' | 'skipped', number>; total: number; page: number; limit: number; items: OutboxRow[] }

export const notif = {
  list: (q: { page?: number; limit?: number; unread?: boolean; type?: string }) => request<CenterList>('GET', `/notification-center${qs({ ...q, unread: q.unread ? '1' : undefined })}`),
  unread: () => request<{ unread: number }>('GET', '/notification-center/unread-count'),
  read: (ids?: string[]) => request<{ ok: true; updated: number }>('POST', '/notification-center/read', ids ? { ids } : {}),
  remove: (id: string) => request<{ ok: true }>('DELETE', `/notification-center/${id}`),
  prefs: () => request<Preferences>('GET', '/notification-center/preferences'),
  savePrefs: (b: Partial<Pick<Preferences, 'in_app' | 'email' | 'muted_types'>>) => request<Preferences>('PUT', '/notification-center/preferences', b),
  emailStatus: () => request<{ configured: boolean }>('GET', '/notification-center/email-status'),
  // broadcasts (staff)
  options: () => request<BroadcastOptions>('GET', '/notification-center/broadcasts/options'),
  preview: (audience: Partial<Audience>) => request<Preview>('POST', '/notification-center/broadcasts/preview', { audience }),
  send: (b: { title: string; body: string; channels: string[]; must_read?: boolean; audience: Partial<Audience> }) => request<Broadcast>('POST', '/notification-center/broadcasts', b),
  broadcasts: (page = 1) => request<{ total: number; page: number; limit: number; items: Broadcast[] }>('GET', `/notification-center/broadcasts${qs({ page })}`),
  outbox: (q: { status?: string; page?: number }) => request<Outbox>('GET', `/notification-center/outbox${qs(q)}`),
  processOutbox: () => request<{ configured: boolean; sent: number; failed: number; retry: number; skipped: number }>('POST', '/notification-center/outbox/process', {}),
  retryOutbox: (ids?: string[]) => request<{ requeued: number }>('POST', '/notification-center/outbox/retry', ids ? { ids } : {}),
};
