import { rawRequest as request } from './client';

const qs = (q: Record<string, unknown>) => {
  const s = new URLSearchParams(Object.entries(q).filter(([, v]) => v !== undefined && v !== '' && v !== null) as [string, string][]).toString();
  return s ? `?${s}` : '';
};

export type ServiceType = 'certificate' | 'transcript' | 'correction' | 'leave' | 'complaint' | 'other';
export type ServiceStatus = 'submitted' | 'in_review' | 'awaiting_info' | 'approved' | 'rejected' | 'completed' | 'cancelled';

export interface ServiceEvent { id: string; kind: 'comment' | 'status' | 'assignment' | 'document'; from_status: string | null; to_status: string | null; body: string | null; internal: boolean; author_name: string | null; author_role: string | null; created_at: string }
export interface ServiceRequest {
  id: string; reference: string; type: ServiceType; subject: string; description: string | null; status: ServiceStatus; decision_note: string | null; document_id: string | null;
  payload: Record<string, string | number | boolean> | null; created_at: string; updated_at: string; closed_at: string | null; can_cancel: boolean; can_comment: boolean;
}
export interface ServiceRequestDetail extends ServiceRequest { events: ServiceEvent[] }
export interface StaffRequest extends ServiceRequest {
  priority: string; assigned_to: string | null; assignee_name: string | null; student_id: string; student: string | null; matricule: string | null; class_name: string | null;
  age_days: number; sla_days: number; overdue: boolean;
}
export interface StaffRequestDetail extends StaffRequest { events: ServiceEvent[] }
export interface StaffList { total: number; page: number; limit: number; sla_days: number; counts: Partial<Record<ServiceStatus, number>>; items: StaffRequest[] }
export interface ServiceMeta { types: ServiceType[]; statuses: ServiceStatus[]; flow: Record<ServiceStatus, ServiceStatus[]>; sla_days: number; max_open: number; limits: Record<string, [number, number]> }
export interface StaffUser { id: string; name: string; role: string }
export interface ListQuery { status?: string; type?: string; assignee?: string; search?: string; overdue?: '1'; page?: number; limit?: number }

export const services = {
  meta: () => request<ServiceMeta>('GET', '/services/meta'),
  create: (b: { type: ServiceType; subject: string; description?: string; payload?: Record<string, string> }) => request<ServiceRequest>('POST', '/services', b),
  mine: () => request<ServiceRequest[]>('GET', '/services/mine'),
  mineOne: (id: string) => request<ServiceRequestDetail>('GET', `/services/mine/${id}`),
  comment: (id: string, body: string) => request<{ status: ServiceStatus }>('POST', `/services/mine/${id}/comments`, { body }),
  cancel: (id: string, note?: string) => request<ServiceRequest>('POST', `/services/mine/${id}/cancel`, { note }),
  // staff
  list: (q: ListQuery) => request<StaffList>('GET', `/services${qs({ ...q })}`),
  one: (id: string) => request<StaffRequestDetail>('GET', `/services/${id}`),
  staffUsers: () => request<StaffUser[]>('GET', '/services/staff-users'),
  assign: (id: string, user_id: string | null) => request<{ ok: true; assignee_name: string | null }>('POST', `/services/${id}/assign`, { user_id }),
  note: (id: string, body: string) => request<ServiceEvent>('POST', `/services/${id}/notes`, { body }),
  reply: (id: string, body: string) => request<ServiceEvent>('POST', `/services/${id}/comments`, { body }),
  setStatus: (id: string, to: ServiceStatus, note?: string) => request<StaffRequest & { document: { id: string; code: string; type: string } | null }>('POST', `/services/${id}/status`, { to, note }),
};
