import { Lock } from 'lucide-react';
import type { ServiceEvent, ServiceStatus, ServiceType } from '../../api/services';
import { Badge, fmtDateTime, useFr } from '../academics/ui';

export const TYPE_LABEL: Record<ServiceType, [string, string]> = {
  certificate: ['Enrolment certificate', 'Attestation d’inscription'], transcript: ['Official transcript', 'Relevé de notes officiel'],
  correction: ['Data / grade correction', 'Correction de données / notes'], leave: ['Leave of absence', 'Congé / suspension d’études'],
  complaint: ['Complaint', 'Réclamation'], other: ['Other request', 'Autre demande'],
};
export const STATUS_LABEL: Record<ServiceStatus, [string, string]> = {
  submitted: ['Submitted', 'Soumise'], in_review: ['In review', 'En cours d’examen'], awaiting_info: ['Awaiting information', 'Informations demandées'],
  approved: ['Approved', 'Approuvée'], rejected: ['Declined', 'Refusée'], completed: ['Completed', 'Terminée'], cancelled: ['Cancelled', 'Annulée'],
};
const TONE: Record<ServiceStatus, 'amber' | 'blue' | 'indigo' | 'green' | 'red' | 'slate'> = { submitted: 'amber', in_review: 'blue', awaiting_info: 'indigo', approved: 'green', rejected: 'red', completed: 'green', cancelled: 'slate' };

export function typeLabel(t: string, fr: boolean) { const l = TYPE_LABEL[t as ServiceType]; return l ? l[fr ? 1 : 0] : t; }
export function statusLabel(s: string, fr: boolean) { const l = STATUS_LABEL[s as ServiceStatus]; return l ? l[fr ? 1 : 0] : s; }
export function ServiceStatusBadge({ status }: { status: string }) {
  const fr = useFr();
  return <Badge tone={TONE[status as ServiceStatus] ?? 'slate'}>{statusLabel(status, fr)}</Badge>;
}

/** Vertical timeline. Internal notes (staff view only) are visibly marked. */
export function Timeline({ events }: { events: ServiceEvent[] }) {
  const fr = useFr();
  return (
    <ol className="space-y-3" aria-label={fr ? 'Historique' : 'Timeline'}>
      {events.map(e => {
        const title = e.kind === 'status' && e.to_status
          ? `${fr ? 'Statut' : 'Status'} → ${statusLabel(e.to_status, fr)}`
          : e.kind === 'document' ? (fr ? 'Document officiel' : 'Official document')
            : e.kind === 'assignment' ? (fr ? 'Affectation' : 'Assignment')
              : e.internal ? (fr ? 'Note interne' : 'Internal note') : (fr ? 'Message' : 'Message');
        return (
          <li key={e.id} data-internal={e.internal ? '1' : '0'} className={`rounded-lg border px-3 py-2 text-sm ${e.internal ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/20' : 'border-slate-200 bg-white'}`}>
            <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">{title}</span>
              {e.internal && <span className="inline-flex items-center gap-1 text-amber-700"><Lock size={11} /> {fr ? 'visible du personnel uniquement' : 'staff only'}</span>}
              <span className="ml-auto">{e.author_name ?? '—'} · {fmtDateTime(e.created_at, fr ? 'fr' : 'en')}</span>
            </div>
            {e.body && <p className="mt-1 whitespace-pre-wrap text-slate-700">{e.body}</p>}
          </li>
        );
      })}
    </ol>
  );
}

export const textarea = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';
