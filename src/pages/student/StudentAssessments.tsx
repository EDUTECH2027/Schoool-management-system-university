import { useState } from 'react';
import { ClipboardList, FileText } from 'lucide-react';
import { assess, type Assignment, type Quiz } from '../../api/assessments';
import { Badge, ErrorBox, PageHeader, Spinner, Tabs, fmtDateTime, useFr, useLoad } from '../../composants/academics/ui';
import StudentAssignmentView from '../../composants/assessments/StudentAssignmentView';
import StudentQuizView from '../../composants/assessments/StudentQuizView';
import { Due, StateBadge, card, num, pct, useNow } from '../../composants/assessments/shared';

type Tab = 'todo' | 'done' | 'gradebook';
type Open = { kind: 'assignment' | 'quiz'; id: string } | null;

const assignmentTodo = (a: Assignment, now: number) => !a.submission && a.status === 'published' && (now <= new Date(a.due_at).getTime() || a.allow_late);
const quizTodo = (q: Quiz, now: number) => {
  if (q.status !== 'published') return false;
  if (q.attempts?.some(a => a.status === 'in_progress')) return true;
  if (q.closes_at && now >= new Date(q.closes_at).getTime()) return false;
  return (q.attempts?.length ?? 0) < q.max_attempts;
};

export default function StudentAssessments() {
  const fr = useFr(); const lang = fr ? 'fr' : 'en';
  const [tab, setTab] = useState<Tab>('todo');
  const [open, setOpen] = useState<Open>(null);
  const as = useLoad(() => assess.assignments());
  const qz = useLoad(() => assess.quizzes());
  const gb = useLoad(() => assess.myGradebook());
  const now = useNow(30000);
  const back = () => { setOpen(null); as.reload(); qz.reload(); gb.reload(); };
  if (open?.kind === 'assignment') return <StudentAssignmentView id={open.id} onBack={back} />;
  if (open?.kind === 'quiz') return <StudentQuizView id={open.id} onBack={back} />;

  const loading = !as.data || !qz.data;
  const todoA = (as.data ?? []).filter(a => assignmentTodo(a, now)), doneA = (as.data ?? []).filter(a => !assignmentTodo(a, now));
  const todoQ = (qz.data ?? []).filter(q => quizTodo(q, now)), doneQ = (qz.data ?? []).filter(q => !quizTodo(q, now));
  const rows = (a: Assignment[], q: Quiz[]) => (
    <div className="grid gap-3 md:grid-cols-2">
      {a.map(x => (
        <button key={x.id} onClick={() => setOpen({ kind: 'assignment', id: x.id })} className={`${card} text-left p-4 hover:border-indigo-300 hover:shadow-sm transition space-y-1.5`}>
          <div className="flex items-center gap-2"><FileText size={16} className="text-indigo-500 shrink-0" /><p className="font-semibold text-slate-800 truncate mr-auto">{x.title}</p>{x.submission ? <StateBadge status={x.submission.status} /> : x.status === 'closed' ? <StateBadge status="closed" /> : null}</div>
          <p className="text-xs text-slate-500">{x.offering?.course} · {fr ? 'Devoir' : 'Assignment'}</p>
          <p className="text-xs text-slate-600"><Due at={x.due_at} label={fr ? 'À rendre ' : 'Due '} /></p>
          {x.submission?.score != null && <p className="text-sm font-semibold text-emerald-700">{num(x.submission.score)} / {num(x.max_score)}</p>}
          {x.submission?.is_late && <Badge tone="red">{fr ? 'rendu en retard' : 'submitted late'}</Badge>}
        </button>
      ))}
      {q.map(x => {
        const best = (x.attempts ?? []).filter(t => t.status !== 'in_progress' && t.max_score).sort((u, v) => (v.score! / v.max_score!) - (u.score! / u.max_score!))[0];
        return (
          <button key={x.id} onClick={() => setOpen({ kind: 'quiz', id: x.id })} className={`${card} text-left p-4 hover:border-indigo-300 hover:shadow-sm transition space-y-1.5`}>
            <div className="flex items-center gap-2"><ClipboardList size={16} className="text-violet-500 shrink-0" /><p className="font-semibold text-slate-800 truncate mr-auto">{x.title}</p>{x.attempts?.some(t => t.status === 'in_progress') ? <StateBadge status="in_progress" /> : <StateBadge status={x.status} />}</div>
            <p className="text-xs text-slate-500">{x.offering?.course} · Quiz · {x.question_count} {fr ? 'questions' : 'questions'}{x.duration_minutes ? ` · ${x.duration_minutes} min` : ''}</p>
            {x.closes_at && <p className="text-xs text-slate-600"><Due at={x.closes_at} label={fr ? 'Ferme ' : 'Closes '} /></p>}
            <p className="text-xs text-slate-500">{x.attempts?.length ?? 0}/{x.max_attempts} {fr ? 'essai(s)' : 'attempt(s)'}{best ? ` · ${fr ? 'meilleur' : 'best'}: ${num(best.score)}/${num(best.max_score)}` : ''}</p>
          </button>
        );
      })}
    </div>
  );
  const empty = (t: string) => <p className="text-sm text-slate-400 bg-white rounded-xl border border-slate-200 p-8 text-center">{t}</p>;
  return (
    <div className="space-y-5">
      <PageHeader title={fr ? 'Mes devoirs & quiz' : 'My assignments & quizzes'} subtitle={fr ? 'Travaux à rendre, quiz et contrôle continu de vos cours' : 'Work to hand in, quizzes and continuous assessment for your courses'} onRefresh={back} />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'todo', label: fr ? 'À faire' : 'To do', badge: todoA.length + todoQ.length }, { id: 'done', label: fr ? 'Terminé' : 'Done' }, { id: 'gradebook', label: fr ? 'Mes notes' : 'My gradebook' }]} />
      <ErrorBox message={as.error || qz.error} />
      {tab !== 'gradebook' && (loading ? <Spinner /> : tab === 'todo'
        ? (todoA.length + todoQ.length ? rows(todoA, todoQ) : empty(fr ? 'Rien à faire pour le moment.' : 'Nothing to do right now.'))
        : (doneA.length + doneQ.length ? rows(doneA, doneQ) : empty(fr ? 'Aucun travail terminé.' : 'Nothing completed yet.')))}
      {tab === 'gradebook' && (!gb.data ? <Spinner /> : gb.data.length === 0 ? empty(fr ? 'Aucune évaluation publiée pour vos cours.' : 'No published assessments for your courses yet.') : (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">{fr ? 'Contrôle continu = moyenne pondérée des éléments notés. Les éléments non rendus ou en attente de note ne sont pas comptés comme zéro.' : 'Continuous assessment = weighted average of graded items. Items not handed in or awaiting a grade are not counted as zero.'}</p>
          {gb.data.map(o => (
            <div key={o.offering.id} className={`${card} overflow-hidden`}>
              <div className="px-4 py-3 flex flex-wrap items-center gap-2 border-b border-slate-100"><p className="font-semibold text-slate-800 mr-auto">{o.offering.course} <span className="text-xs text-slate-400 font-normal">{o.offering.code}</span></p>
                <span className="text-sm text-slate-500">{fr ? 'CC' : 'CA'}</span><span className="text-xl font-bold text-indigo-600" data-testid="ca-value">{o.line?.ca.value == null ? '—' : pct(o.line.ca.value)}</span></div>
              <div className="overflow-x-auto"><table className="w-full text-sm min-w-[480px]"><tbody className="divide-y divide-slate-100">
                {o.columns.map(c => { const it = o.line?.items[c.key]; return (
                  <tr key={c.key}><td className="px-4 py-2 text-slate-700">{c.title} <span className="text-xs text-slate-400">· {c.kind === 'quiz' ? 'Quiz' : (fr ? 'Devoir' : 'Assignment')} · ×{num(c.weight)}</span></td>
                    <td className="px-4 py-2 text-right">{it?.state === 'graded' ? <span className="font-medium">{num(it.score)}/{num(it.max)} <span className="text-slate-400">({pct(it.pct)})</span></span> : it?.state === 'pending' ? <Badge tone="amber">{fr ? 'en attente de note' : 'awaiting grade'}</Badge> : <span className="text-slate-400">{fr ? 'non rendu' : 'not done'}{c.due_at ? ` · ${fmtDateTime(c.due_at, lang)}` : ''}</span>}</td></tr>
                ); })}
              </tbody></table></div>
              {o.line && o.line.ca.missing + o.line.ca.pending > 0 && <p className="px-4 py-2 text-xs text-amber-700 bg-amber-50">{fr ? `${o.line.ca.counted} élément(s) comptés sur ${o.line.ca.total}.` : `${o.line.ca.counted} of ${o.line.ca.total} item(s) counted so far.`}</p>}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
