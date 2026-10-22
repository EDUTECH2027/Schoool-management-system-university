import { useEffect, useState } from 'react';
import { assess } from '../../api/assessments';
import { ErrorBox, PageHeader, Spinner, Tabs, input, useFr, useLoad } from '../../composants/academics/ui';
import AssignmentsPanel from '../../composants/assessments/AssignmentsPanel';
import QuizzesPanel from '../../composants/assessments/QuizzesPanel';
import GradebookPanel from '../../composants/assessments/GradebookPanel';
import { offeringLabel } from '../../composants/assessments/shared';

type Tab = 'assignments' | 'quizzes' | 'gradebook';

export default function TeacherAssessments() {
  const fr = useFr();
  const offs = useLoad(() => assess.offerings());
  const [sel, setSel] = useState('');
  const [tab, setTab] = useState<Tab>('assignments');
  useEffect(() => { if (offs.data?.length && !offs.data.some(o => o.id === sel)) setSel(offs.data[0].id); }, [offs.data, sel]);
  const cur = offs.data?.find(o => o.id === sel);
  return (
    <div className="space-y-5">
      <PageHeader title={fr ? 'Devoirs, quiz & carnet de notes' : 'Assignments, quizzes & gradebook'} subtitle={fr ? 'Évaluations en ligne de vos cours' : 'Online assessments for your courses'} onRefresh={offs.reload}>
        {offs.data && offs.data.length > 0 && (
          <select aria-label={fr ? 'Cours' : 'Course'} className={`${input} max-w-full`} value={sel} onChange={e => setSel(e.target.value)}>
            {offs.data.map(o => <option key={o.id} value={o.id}>{offeringLabel(o)}</option>)}
          </select>
        )}
      </PageHeader>
      <ErrorBox message={offs.error} />
      {!offs.data ? <Spinner /> : offs.data.length === 0 ? (
        <p className="text-sm text-slate-400 bg-white rounded-xl border border-slate-200 p-8 text-center">{fr ? 'Aucun cours ne vous est attribué.' : 'No course is assigned to you.'}</p>
      ) : cur && (
        <>
          <Tabs value={tab} onChange={setTab} tabs={[{ id: 'assignments', label: fr ? 'Devoirs' : 'Assignments' }, { id: 'quizzes', label: 'Quiz' }, { id: 'gradebook', label: fr ? 'Carnet de notes' : 'Gradebook' }]} />
          {tab === 'assignments' && <AssignmentsPanel offeringId={cur.id} canEdit />}
          {tab === 'quizzes' && <QuizzesPanel offeringId={cur.id} canEdit />}
          {tab === 'gradebook' && <GradebookPanel offeringId={cur.id} canExport />}
        </>
      )}
    </div>
  );
}
