import { Check, Download } from 'lucide-react';
import { THESIS_STEPS, thesisApi, type Milestone, type Submission, type Thesis, type ThesisEvent, type ThesisStatus } from '../../api/thesis';
import { Badge, fmtDate, fmtDateTime, useFr } from '../academics/ui';
import { useLanguage } from '../../i18n/LanguageContext';

const LABEL: Record<ThesisStatus, [string, string]> = {
  proposed: ['Proposed', 'Proposé'], supervisor_accepted: ['Supervisor accepted', 'Accepté par l’encadrant'], approved: ['Approved', 'Approuvé'], in_progress: ['In progress', 'En cours'],
  submitted: ['Submitted', 'Déposé'], defence_scheduled: ['Defence scheduled', 'Soutenance planifiée'], defended: ['Defended', 'Soutenu'], completed: ['Completed', 'Terminé'], rejected: ['Rejected', 'Refusé'], withdrawn: ['Withdrawn', 'Retiré'],
};
const TONE: Record<ThesisStatus, 'amber' | 'blue' | 'green' | 'red' | 'slate' | 'indigo'> = {
  proposed: 'amber', supervisor_accepted: 'blue', approved: 'blue', in_progress: 'indigo', submitted: 'amber', defence_scheduled: 'blue', defended: 'indigo', completed: 'green', rejected: 'red', withdrawn: 'slate',
};
export const statusLabel = (s: ThesisStatus, fr: boolean) => LABEL[s][fr ? 1 : 0];
export const ThesisStatusBadge = ({ status }: { status: ThesisStatus }) => <Badge tone={TONE[status]}>{statusLabel(status, useFr())}</Badge>;
export const KIND: Record<Thesis['kind'], [string, string]> = { thesis: ['Thesis', 'Mémoire / thèse'], project: ['Final-year project', 'Projet de fin d’études'], internship_report: ['Internship report', 'Rapport de stage'] };

const MS: Record<Milestone['status'], [string, string, 'slate' | 'amber' | 'green' | 'red']> = {
  pending: ['Pending', 'À faire', 'slate'], submitted: ['Submitted', 'Remis', 'amber'], accepted: ['Accepted', 'Validé', 'green'], revision_requested: ['Revision requested', 'À corriger', 'red'],
};
export const MilestoneBadge = ({ status }: { status: Milestone['status'] }) => { const fr = useFr(); const [en, f, tone] = MS[status]; return <Badge tone={tone}>{fr ? f : en}</Badge>; };

export function Stepper({ status }: { status: ThesisStatus }) {
  const fr = useFr();
  if (status === 'rejected' || status === 'withdrawn') return <div className="flex items-center gap-2"><ThesisStatusBadge status={status} /></div>;
  const at = THESIS_STEPS.indexOf(status);
  return (
    <ol className="flex gap-1 overflow-x-auto pb-1" aria-label="Progress">
      {THESIS_STEPS.map((s, i) => (
        <li key={s} aria-current={i === at ? 'step' : undefined} className="flex-1 min-w-[5.5rem]">
          <div className={`h-1.5 rounded-full ${i < at ? 'bg-emerald-500' : i === at ? 'bg-indigo-500' : 'bg-slate-200'}`} />
          <p className={`mt-1.5 text-[11px] leading-tight flex items-start gap-1 ${i === at ? 'text-indigo-600 font-semibold' : i < at ? 'text-emerald-600' : 'text-slate-400'}`}>{i < at && <Check size={11} className="mt-px shrink-0" />}{statusLabel(s, fr)}</p>
        </li>
      ))}
    </ol>
  );
}

export function Timeline({ events }: { events: ThesisEvent[] }) {
  const { lang } = useLanguage();
  return (
    <ul className="space-y-2">
      {[...events].reverse().map(e => (
        <li key={e.id} className="text-sm border-l-2 border-slate-200 pl-3">
          <p className="text-slate-700 break-words">{e.to_status && e.kind !== 'comment' ? <b>{statusLabel(e.to_status as ThesisStatus, lang === 'fr')}</b> : null}{e.to_status && e.body && e.kind !== 'comment' ? ' — ' : ''}{e.body}</p>
          <p className="text-xs text-slate-400">{e.author_name ?? '—'} · {fmtDateTime(e.created_at, lang)}</p>
        </li>
      ))}
    </ul>
  );
}

export function SubmissionList({ items, milestones, empty }: { items: Submission[]; milestones: Milestone[]; empty: string }) {
  const fr = useFr(); const { lang } = useLanguage();
  if (!items.length) return <p className="text-sm text-slate-400">{empty}</p>;
  const title = (id: string | null) => milestones.find(m => m.id === id)?.title ?? (fr ? 'Document général' : 'General document');
  return (
    <ul className="divide-y divide-slate-100">
      {items.map(s => (
        <li key={s.id} className="py-2.5 flex flex-wrap items-start gap-x-4 gap-y-1 text-sm">
          <div className="min-w-0 flex-1">
            <p className="text-slate-800 break-words"><b>v{s.version}</b> · {title(s.milestone_id)}</p>
            {s.note && <p className="text-xs text-slate-500 break-words">{s.note}</p>}
            {s.feedback && <p className="text-xs mt-1 rounded bg-amber-50 border border-amber-200 text-amber-800 px-2 py-1 break-words whitespace-pre-line">{s.feedback}</p>}
            <p className="text-xs text-slate-400">{fmtDateTime(s.created_at, lang)}{s.reviewed_at ? ` · ${fr ? 'relu le' : 'reviewed'} ${fmtDate(s.reviewed_at, lang)}` : ''}</p>
          </div>
          <button className="text-indigo-600 hover:underline flex items-center gap-1 text-xs break-all" onClick={() => void thesisApi.download(s)}><Download size={13} /> {s.file_name}</button>
        </li>
      ))}
    </ul>
  );
}

export function DefenceBox({ t }: { t: Thesis }) {
  const fr = useFr(); const { lang } = useLanguage();
  if (!t.defence) return null;
  return (
    <section className="bg-white rounded-xl border border-slate-200 p-4 space-y-1.5">
      <h3 className="font-semibold text-slate-800">{fr ? 'Soutenance' : 'Defence'}</h3>
      <p className="text-sm text-slate-700">{fmtDate(t.defence.date, lang)} · {t.defence.time} · {t.defence.room}</p>
      {t.defence.jury.length > 0 && <p className="text-sm text-slate-500">{fr ? 'Jury' : 'Jury'} : {t.defence.jury.map(j => `${j.name} (${j.role})`).join(', ')}</p>}
      {t.status === 'completed' && <p className="text-sm font-semibold text-emerald-700">{fr ? 'Résultat' : 'Result'} : {t.final_score}/100 · {t.final_grade}{t.decision_note ? ` — ${t.decision_note}` : ''}</p>}
    </section>
  );
}
