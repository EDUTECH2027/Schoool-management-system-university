import { useEffect, useState } from 'react';
import { Badge, fmtDateTime, useFr } from '../academics/ui';
import type { OfferingInfo, Status } from '../../api/assessments';

export const useNow = (ms = 1000) => {
  const [n, setN] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setN(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return n;
};

export const pct = (n: number | null | undefined) => (n === null || n === undefined ? '—' : `${Math.round(n * 100) / 100}%`);
export const num = (n: number | null | undefined) => (n === null || n === undefined ? '—' : String(Math.round(n * 100) / 100));
export const offeringLabel = (o: OfferingInfo) => `${o.code} · ${o.course} (${o.section}) — ${o.academic_year} ${o.term}`;

const L: Record<string, [string, string]> = {
  draft: ['Draft', 'Brouillon'], published: ['Published', 'Publié'], closed: ['Closed', 'Clôturé'], submitted: ['Submitted', 'Soumis'], graded: ['Graded', 'Noté'], returned: ['Returned', 'Rendu'],
  in_progress: ['In progress', 'En cours'], missing: ['Not submitted', 'Non rendu'], pending: ['Awaiting grade', 'En attente de note'],
};
const TONE: Record<string, 'slate' | 'green' | 'amber' | 'blue' | 'red' | 'indigo'> = { draft: 'slate', published: 'green', closed: 'amber', submitted: 'blue', graded: 'green', returned: 'indigo', in_progress: 'amber', missing: 'red', pending: 'amber' };
export function StateBadge({ status }: { status: Status | string }) {
  const fr = useFr();
  return <Badge tone={TONE[status] ?? 'slate'}>{L[status] ? L[status][fr ? 1 : 0] : status}</Badge>;
}

/** "in 2h 15m" / "overdue by 3h" style helper for deadlines. */
export function Due({ at, label }: { at: string | null; label?: string }) {
  const fr = useFr(); const now = useNow(30000);
  if (!at) return <span className="text-slate-400">—</span>;
  const diff = new Date(at).getTime() - now; const abs = Math.abs(diff);
  const d = Math.floor(abs / 86400000), h = Math.floor((abs % 86400000) / 3600000), m = Math.floor((abs % 3600000) / 60000);
  const span = d ? `${d}${fr ? 'j' : 'd'} ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
  return (
    <span className="whitespace-nowrap"><span>{label}{fmtDateTime(at, fr ? 'fr' : 'en')}</span>{' '}
      <span className={`text-xs ${diff < 0 ? 'text-red-600' : diff < 86400000 ? 'text-amber-600' : 'text-slate-400'}`}>({diff < 0 ? (fr ? `dépassé de ${span}` : `overdue ${span}`) : (fr ? `dans ${span}` : `in ${span}`)})</span></span>
  );
}

export const card = 'bg-white rounded-xl border border-slate-200';
export const textarea = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white';
