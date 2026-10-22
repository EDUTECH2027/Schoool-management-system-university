import { useState } from 'react';
import { Download, FileText, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { assess, type Assignment, type AssignmentInput, type SubmissionRow } from '../../api/assessments';
import { ErrorBox, Field, Modal, Spinner, Table, btnDanger, btnGhost, btnPrimary, fmtDateTime, input, msg, toLocalInput, useFr, useLoad } from '../academics/ui';
import { Due, StateBadge, num, textarea } from './shared';

const blank = (offering_id: string): AssignmentInput => ({ offering_id, title: '', instructions: '', due_at: toLocalInput(new Date(Date.now() + 7 * 86400000).toISOString()), max_score: 20, weight: 1, allow_late: false, allow_text: true, allow_file: true });

export default function AssignmentsPanel({ offeringId, canEdit }: { offeringId: string; canEdit: boolean }) {
  const fr = useFr();
  const list = useLoad(() => assess.assignments({ offering_id: offeringId }), [offeringId]);
  const [edit, setEdit] = useState<Assignment | 'new' | null>(null);
  const [subs, setSubs] = useState<Assignment | null>(null);
  const [err, setErr] = useState('');
  const act = async (fn: () => Promise<unknown>) => { setErr(''); try { await fn(); list.reload(); } catch (e) { setErr(msg(e)); } };
  const del = async (a: Assignment) => {
    if (!window.confirm(fr ? `Supprimer « ${a.title} » ?` : `Delete "${a.title}"?`)) return;
    await act(() => assess.deleteAssignment(a.id));
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <p className="text-sm text-slate-500 mr-auto">{fr ? 'Devoirs à rendre par les étudiants inscrits. Une fois des travaux rendus, on clôture au lieu de supprimer.' : 'Work handed in by registered students. Once work has been submitted, close instead of deleting.'}</p>
        {canEdit && <button className={btnPrimary} onClick={() => setEdit('new')}><Plus size={14} /> {fr ? 'Nouveau devoir' : 'New assignment'}</button>}
      </div>
      <ErrorBox message={err || list.error} />
      {!list.data ? <Spinner /> : (
        <Table min={820} head={[fr ? 'Devoir' : 'Assignment', fr ? 'Échéance' : 'Due', fr ? 'Barème / poids' : 'Max / weight', fr ? 'Statut' : 'Status', fr ? 'Rendus' : 'Submissions', '']} empty={list.data.length ? undefined : (fr ? 'Aucun devoir pour ce cours.' : 'No assignments for this course yet.')}>
          {list.data.map(a => (
            <tr key={a.id} className="align-top">
              <td className="px-4 py-3"><p className="font-medium text-slate-800">{a.title}</p>{a.allow_late && <p className="text-xs text-slate-400">{fr ? 'Retards acceptés' : 'Late work accepted'}</p>}</td>
              <td className="px-4 py-3 text-slate-600"><Due at={a.due_at} /></td>
              <td className="px-4 py-3 text-slate-600">/{num(a.max_score)} · ×{num(a.weight)}</td>
              <td className="px-4 py-3"><StateBadge status={a.status} /></td>
              <td className="px-4 py-3 text-slate-600">{a.submission_count ?? 0} <span className="text-xs text-slate-400">({a.graded_count ?? 0} {fr ? 'notés' : 'graded'})</span></td>
              <td className="px-4 py-3"><div className="flex flex-wrap gap-1.5 justify-end">
                <button className={btnGhost} onClick={() => setSubs(a)} disabled={a.status === 'draft'}><Users size={14} /> {fr ? 'Travaux' : 'Submissions'}</button>
                {canEdit && <>
                  <button className={btnGhost} aria-label={fr ? 'Modifier' : 'Edit'} onClick={() => setEdit(a)}><Pencil size={14} /></button>
                  {a.status === 'draft' && <button className={btnPrimary} onClick={() => act(() => assess.setAssignmentStatus(a.id, 'published'))}>{fr ? 'Publier' : 'Publish'}</button>}
                  {a.status === 'published' && <button className={btnGhost} onClick={() => act(() => assess.setAssignmentStatus(a.id, 'closed'))}>{fr ? 'Clôturer' : 'Close'}</button>}
                  {a.status === 'closed' && <button className={btnGhost} onClick={() => act(() => assess.setAssignmentStatus(a.id, 'published'))}>{fr ? 'Rouvrir' : 'Reopen'}</button>}
                  {a.status === 'published' && !a.submission_count && <button className={btnGhost} onClick={() => act(() => assess.setAssignmentStatus(a.id, 'draft'))}>{fr ? 'Dépublier' : 'Unpublish'}</button>}
                  {!a.submission_count && <button className={btnDanger} aria-label={fr ? 'Supprimer' : 'Delete'} onClick={() => del(a)}><Trash2 size={14} /></button>}
                </>}
              </div></td>
            </tr>
          ))}
        </Table>
      )}
      {edit && <AssignmentForm offeringId={offeringId} initial={edit === 'new' ? null : edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); list.reload(); }} />}
      {subs && <Submissions assignment={subs} onClose={() => { setSubs(null); list.reload(); }} />}
    </div>
  );
}

function AssignmentForm({ offeringId, initial, onClose, onSaved }: { offeringId: string; initial: Assignment | null; onClose: () => void; onSaved: () => void }) {
  const fr = useFr();
  const [f, setF] = useState<AssignmentInput>(initial ? { title: initial.title, instructions: initial.instructions ?? '', due_at: toLocalInput(initial.due_at), max_score: initial.max_score, weight: initial.weight, allow_late: initial.allow_late, allow_text: initial.allow_text, allow_file: initial.allow_file } : blank(offeringId));
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [touched, setTouched] = useState(false);
  const problems: string[] = [];
  if (!f.title.trim()) problems.push(fr ? 'Le titre est obligatoire.' : 'A title is required.');
  if (!f.due_at || isNaN(new Date(f.due_at).getTime())) problems.push(fr ? 'Date limite invalide.' : 'A valid due date is required.');
  if (!(Number(f.max_score) > 0)) problems.push(fr ? 'Le barème doit être supérieur à 0.' : 'Maximum score must be greater than 0.');
  if (!(Number(f.weight) > 0)) problems.push(fr ? 'Le poids doit être supérieur à 0.' : 'Weight must be greater than 0.');
  if (!f.allow_text && !f.allow_file) problems.push(fr ? 'Autorisez le texte, le fichier, ou les deux.' : 'Allow text, file, or both.');
  const save = async () => {
    setTouched(true); if (problems.length) return;
    setBusy(true); setErr('');
    try {
      const body = { ...f, max_score: Number(f.max_score), weight: Number(f.weight), due_at: new Date(f.due_at).toISOString() };
      if (initial) await assess.updateAssignment(initial.id, body); else await assess.createAssignment({ ...body, offering_id: offeringId });
      onSaved();
    } catch (e) { setErr(msg(e)); } finally { setBusy(false); }
  };
  const set = <K extends keyof AssignmentInput>(k: K, v: AssignmentInput[K]) => setF(s => ({ ...s, [k]: v }));
  return (
    <Modal title={initial ? (fr ? 'Modifier le devoir' : 'Edit assignment') : (fr ? 'Nouveau devoir' : 'New assignment')} onClose={onClose}>
      <div className="space-y-3">
        <Field label={fr ? 'Titre' : 'Title'}><input className={`${input} w-full`} value={f.title} maxLength={200} onChange={e => set('title', e.target.value)} /></Field>
        <Field label={fr ? 'Consignes' : 'Instructions'}><textarea className={textarea} rows={4} value={f.instructions} onChange={e => set('instructions', e.target.value)} /></Field>
        <Field label={fr ? 'Date limite' : 'Due date'}><input type="datetime-local" className={`${input} w-full`} value={f.due_at} onChange={e => set('due_at', e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={fr ? 'Note maximale' : 'Maximum score'}><input type="number" min={0} step="any" className={`${input} w-full`} value={f.max_score} onChange={e => set('max_score', e.target.value as unknown as number)} /></Field>
          <Field label={fr ? 'Poids dans le CC' : 'Weight in CA'} hint={fr ? 'Importance relative dans la moyenne du contrôle continu' : 'Relative importance in the continuous-assessment average'}><input type="number" min={0} step="any" className={`${input} w-full`} value={f.weight} onChange={e => set('weight', e.target.value as unknown as number)} /></Field>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-700">
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.allow_text} onChange={e => set('allow_text', e.target.checked)} /> {fr ? 'Réponse texte' : 'Text answer'}</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.allow_file} onChange={e => set('allow_file', e.target.checked)} /> {fr ? 'Fichier joint' : 'File upload'}</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.allow_late} onChange={e => set('allow_late', e.target.checked)} /> {fr ? 'Accepter les retards (signalés)' : 'Accept late work (flagged)'}</label>
        </div>
        {touched && problems.length > 0 && <ul role="alert" className="text-sm text-red-600 list-disc pl-5">{problems.map(p => <li key={p}>{p}</li>)}</ul>}
        <ErrorBox message={err} />
        <div className="flex justify-end gap-2 pt-2"><button className={btnGhost} onClick={onClose}>{fr ? 'Annuler' : 'Cancel'}</button><button className={btnPrimary} disabled={busy} onClick={save}>{fr ? 'Enregistrer' : 'Save'}</button></div>
      </div>
    </Modal>
  );
}

function Submissions({ assignment, onClose }: { assignment: Assignment; onClose: () => void }) {
  const fr = useFr();
  const r = useLoad(() => assess.submissions(assignment.id), [assignment.id]);
  return (
    <Modal wide title={`${assignment.title} — ${fr ? 'travaux rendus' : 'submissions'}`} onClose={onClose}>
      <ErrorBox message={r.error} />
      {!r.data ? <Spinner /> : (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">{fr ? `Note sur ${num(assignment.max_score)}. « Noter » garde le travail comme noté ; « Rendre » le renvoie à l’étudiant avec vos commentaires. Un travail noté ne peut plus être remplacé par l’étudiant.` : `Score out of ${num(assignment.max_score)}. "Grade" records the mark; "Return" sends it back to the student with your feedback. Graded work can no longer be replaced by the student.`}</p>
          {r.data.students.map(s => <SubRow key={s.student_id} row={s} assignment={assignment} onChanged={r.reload} />)}
          {!r.data.students.length && <p className="text-center text-slate-400 py-6 text-sm">{fr ? 'Aucun étudiant inscrit.' : 'Nobody is registered for this course.'}</p>}
        </div>
      )}
    </Modal>
  );
}

function SubRow({ row, assignment, onChanged }: { row: SubmissionRow; assignment: Assignment; onChanged: () => void }) {
  const fr = useFr(); const s = row.submission;
  const [score, setScore] = useState(s?.score != null ? String(s.score) : ''); const [fb, setFb] = useState(s?.feedback ?? '');
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const bad = score === '' || !(Number(score) >= 0 && Number(score) <= assignment.max_score);
  const go = async (status: 'graded' | 'returned') => {
    setBusy(true); setErr('');
    try { await assess.grade(assignment.id, s!.id, { score: Number(score), feedback: fb, status }); onChanged(); } catch (e) { setErr(msg(e)); } finally { setBusy(false); }
  };
  return (
    <div className="border border-slate-200 rounded-xl p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-auto min-w-0"><p className="font-medium text-slate-800 truncate">{row.name}</p><p className="text-xs text-slate-400">{row.matricule}</p></div>
        {s ? <><StateBadge status={s.status} />{s.is_late && <span className="text-xs font-medium text-red-600">{fr ? 'En retard' : 'Late'}</span>}<span className="text-xs text-slate-400">{fmtDateTime(s.submitted_at, fr ? 'fr' : 'en')}</span></> : <StateBadge status="missing" />}
      </div>
      {s && (
        <>
          {s.text && <p className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-lg p-3 max-h-40 overflow-y-auto">{s.text}</p>}
          {s.has_file && <button className={btnGhost} onClick={() => assess.downloadSubmission(assignment.id, s.id, s.file_name ?? 'submission').catch(e => setErr(msg(e)))}><Download size={14} /> <FileText size={14} /> {s.file_name} <span className="text-xs text-slate-400">({Math.max(1, Math.round((s.file_size ?? 0) / 1024))} KB)</span></button>}
          <div className="flex flex-wrap items-start gap-2">
            <input aria-label={`${fr ? 'Note' : 'Score'} ${row.name}`} type="number" min={0} max={assignment.max_score} step="any" className={`${input} w-24 ${score !== '' && bad ? 'border-red-400' : ''}`} placeholder={`/${num(assignment.max_score)}`} value={score} onChange={e => setScore(e.target.value)} />
            <input aria-label={`${fr ? 'Commentaire' : 'Feedback'} ${row.name}`} className={`${input} flex-1 min-w-[10rem]`} placeholder={fr ? 'Commentaire pour l’étudiant' : 'Feedback for the student'} value={fb} onChange={e => setFb(e.target.value)} />
            <button className={btnPrimary} disabled={busy || bad} onClick={() => go('graded')}>{fr ? 'Noter' : 'Grade'}</button>
            <button className={btnGhost} disabled={busy || bad} onClick={() => go('returned')}>{fr ? 'Rendre' : 'Return'}</button>
          </div>
        </>
      )}
      <ErrorBox message={err} />
    </div>
  );
}
