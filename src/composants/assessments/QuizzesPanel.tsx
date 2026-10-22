import { useState } from 'react';
import { ArrowDown, ArrowUp, BarChart3, ListChecks, Pencil, Plus, Trash2, X } from 'lucide-react';
import { assess, type Question, type QuestionInput, type QType, type Quiz, type QuizInput } from '../../api/assessments';
import { Badge, ErrorBox, Field, Modal, Spinner, Table, Tabs, btnDanger, btnGhost, btnPrimary, fmtDateTime, input, msg, toLocalInput, useFr, useLoad } from '../academics/ui';
import { StateBadge, num, pct, textarea } from './shared';

export default function QuizzesPanel({ offeringId, canEdit }: { offeringId: string; canEdit: boolean }) {
  const fr = useFr();
  const list = useLoad(() => assess.quizzes({ offering_id: offeringId }), [offeringId]);
  const [edit, setEdit] = useState<Quiz | 'new' | null>(null);
  const [qs, setQs] = useState<Quiz | null>(null);
  const [res, setRes] = useState<Quiz | null>(null);
  const [err, setErr] = useState('');
  const act = async (fn: () => Promise<unknown>) => { setErr(''); try { await fn(); list.reload(); } catch (e) { setErr(msg(e)); } };
  const del = async (q: Quiz) => { if (window.confirm(fr ? `Supprimer « ${q.title} » ?` : `Delete "${q.title}"?`)) await act(() => assess.deleteQuiz(q.id)); };
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <p className="text-sm text-slate-500 mr-auto">{fr ? 'Les quiz sont corrigés automatiquement. Les bonnes réponses ne sont jamais envoyées à l’étudiant avant l’heure autorisée.' : 'Quizzes are graded automatically. Correct answers are never sent to students before they are allowed to see them.'}</p>
        {canEdit && <button className={btnPrimary} onClick={() => setEdit('new')}><Plus size={14} /> {fr ? 'Nouveau quiz' : 'New quiz'}</button>}
      </div>
      <ErrorBox message={err || list.error} />
      {!list.data ? <Spinner /> : (
        <Table min={860} head={[fr ? 'Quiz' : 'Quiz', fr ? 'Fenêtre' : 'Window', fr ? 'Paramètres' : 'Settings', fr ? 'Questions' : 'Questions', fr ? 'Statut' : 'Status', '']} empty={list.data.length ? undefined : (fr ? 'Aucun quiz pour ce cours.' : 'No quizzes for this course yet.')}>
          {list.data.map(q => (
            <tr key={q.id} className="align-top">
              <td className="px-4 py-3 font-medium text-slate-800">{q.title}</td>
              <td className="px-4 py-3 text-slate-600 text-xs">{q.opens_at ? fmtDateTime(q.opens_at, fr ? 'fr' : 'en') : (fr ? 'dès publication' : 'when published')}<br />→ {q.closes_at ? fmtDateTime(q.closes_at, fr ? 'fr' : 'en') : '—'}</td>
              <td className="px-4 py-3 text-xs text-slate-600 space-y-0.5"><p>{q.duration_minutes ? `${q.duration_minutes} min` : (fr ? 'Sans limite de durée' : 'Untimed')} · {q.max_attempts} {fr ? 'essai(s)' : 'attempt(s)'}</p><p>×{num(q.weight)} {q.shuffle ? '· shuffle' : ''} {q.show_answers ? (fr ? '· corrigé affiché' : '· answers shown after') : ''}</p></td>
              <td className="px-4 py-3 text-slate-600">{q.question_count ?? 0}</td>
              <td className="px-4 py-3"><StateBadge status={q.status} />{!!q.attempt_count && <p className="text-xs text-slate-400 mt-1">{q.attempt_count} {fr ? 'essais' : 'attempts'}</p>}</td>
              <td className="px-4 py-3"><div className="flex flex-wrap gap-1.5 justify-end">
                <button className={btnGhost} onClick={() => setRes(q)} disabled={q.status === 'draft'}><BarChart3 size={14} /> {fr ? 'Résultats' : 'Results'}</button>
                {canEdit && <>
                  <button className={btnGhost} onClick={() => setQs(q)}><ListChecks size={14} /> {fr ? 'Questions' : 'Questions'}</button>
                  <button className={btnGhost} aria-label={fr ? 'Modifier' : 'Edit'} onClick={() => setEdit(q)}><Pencil size={14} /></button>
                  {q.status === 'draft' && <button className={btnPrimary} onClick={() => act(() => assess.setQuizStatus(q.id, 'published'))}>{fr ? 'Publier' : 'Publish'}</button>}
                  {q.status === 'published' && <button className={btnGhost} onClick={() => act(() => assess.setQuizStatus(q.id, 'closed'))}>{fr ? 'Clôturer' : 'Close'}</button>}
                  {q.status === 'closed' && <button className={btnGhost} onClick={() => act(() => assess.setQuizStatus(q.id, 'published'))}>{fr ? 'Rouvrir' : 'Reopen'}</button>}
                  {!q.attempt_count && <button className={btnDanger} aria-label={fr ? 'Supprimer' : 'Delete'} onClick={() => del(q)}><Trash2 size={14} /></button>}
                </>}
              </div></td>
            </tr>
          ))}
        </Table>
      )}
      {edit && <QuizForm offeringId={offeringId} initial={edit === 'new' ? null : edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); list.reload(); }} />}
      {qs && <QuestionEditor quizId={qs.id} title={qs.title} onClose={() => { setQs(null); list.reload(); }} />}
      {res && <Results quiz={res} canEdit={canEdit} onClose={() => setRes(null)} />}
    </div>
  );
}

function QuizForm({ offeringId, initial, onClose, onSaved }: { offeringId: string; initial: Quiz | null; onClose: () => void; onSaved: () => void }) {
  const fr = useFr();
  const [f, setF] = useState({ title: initial?.title ?? '', instructions: initial?.instructions ?? '', opens_at: toLocalInput(initial?.opens_at), closes_at: toLocalInput(initial?.closes_at), duration: initial?.duration_minutes ? String(initial.duration_minutes) : '', max_attempts: String(initial?.max_attempts ?? 1), shuffle: initial?.shuffle ?? false, show_answers: initial?.show_answers ?? false, weight: String(initial?.weight ?? 1) });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [touched, setTouched] = useState(false);
  const problems: string[] = [];
  if (!f.title.trim()) problems.push(fr ? 'Le titre est obligatoire.' : 'A title is required.');
  if (f.opens_at && f.closes_at && new Date(f.closes_at) <= new Date(f.opens_at)) problems.push(fr ? 'La clôture doit suivre l’ouverture.' : 'It must close after it opens.');
  if (f.duration && !(Number.isInteger(Number(f.duration)) && Number(f.duration) >= 1)) problems.push(fr ? 'Durée : un nombre entier de minutes.' : 'Duration must be a whole number of minutes.');
  if (!(Number.isInteger(Number(f.max_attempts)) && Number(f.max_attempts) >= 1)) problems.push(fr ? 'Au moins un essai.' : 'At least one attempt.');
  if (!(Number(f.weight) > 0)) problems.push(fr ? 'Le poids doit être supérieur à 0.' : 'Weight must be greater than 0.');
  const set = (k: keyof typeof f, v: string | boolean) => setF(s => ({ ...s, [k]: v }));
  const save = async () => {
    setTouched(true); if (problems.length) return;
    setBusy(true); setErr('');
    const body: QuizInput = { title: f.title, instructions: f.instructions, opens_at: f.opens_at ? new Date(f.opens_at).toISOString() : null, closes_at: f.closes_at ? new Date(f.closes_at).toISOString() : null, duration_minutes: f.duration ? Number(f.duration) : null, max_attempts: Number(f.max_attempts), shuffle: f.shuffle, show_answers: f.show_answers, weight: Number(f.weight) };
    try { if (initial) await assess.updateQuiz(initial.id, body); else await assess.createQuiz({ ...body, offering_id: offeringId }); onSaved(); } catch (e) { setErr(msg(e)); } finally { setBusy(false); }
  };
  return (
    <Modal title={initial ? (fr ? 'Modifier le quiz' : 'Edit quiz') : (fr ? 'Nouveau quiz' : 'New quiz')} onClose={onClose}>
      <div className="space-y-3">
        <Field label={fr ? 'Titre' : 'Title'}><input className={`${input} w-full`} value={f.title} maxLength={200} onChange={e => set('title', e.target.value)} /></Field>
        <Field label={fr ? 'Consignes' : 'Instructions'}><textarea className={textarea} rows={3} value={f.instructions} onChange={e => set('instructions', e.target.value)} /></Field>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label={fr ? 'Ouvre le' : 'Opens at'} hint={fr ? 'Vide = dès la publication' : 'Empty = as soon as published'}><input type="datetime-local" className={`${input} w-full`} value={f.opens_at} onChange={e => set('opens_at', e.target.value)} /></Field>
          <Field label={fr ? 'Ferme le' : 'Closes at'} hint={fr ? 'Les essais en cours se terminent à cette heure' : 'Running attempts end at this time'}><input type="datetime-local" className={`${input} w-full`} value={f.closes_at} onChange={e => set('closes_at', e.target.value)} /></Field>
          <Field label={fr ? 'Durée (minutes)' : 'Duration (minutes)'} hint={fr ? 'Vide = sans limite' : 'Empty = untimed'}><input type="number" min={1} className={`${input} w-full`} value={f.duration} onChange={e => set('duration', e.target.value)} /></Field>
          <Field label={fr ? 'Essais autorisés' : 'Attempts allowed'}><input type="number" min={1} max={20} className={`${input} w-full`} value={f.max_attempts} onChange={e => set('max_attempts', e.target.value)} /></Field>
          <Field label={fr ? 'Poids dans le CC' : 'Weight in CA'}><input type="number" min={0} step="any" className={`${input} w-full`} value={f.weight} onChange={e => set('weight', e.target.value)} /></Field>
        </div>
        <div className="space-y-2 text-sm text-slate-700">
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.shuffle} onChange={e => set('shuffle', e.target.checked)} /> {fr ? 'Mélanger les questions (par essai, côté serveur)' : 'Shuffle questions (per attempt, on the server)'}</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.show_answers} onChange={e => set('show_answers', e.target.checked)} /> {fr ? 'Afficher le corrigé après la clôture, aux étudiants ayant terminé' : 'Reveal correct answers after closing, to students who finished'}</label>
        </div>
        {touched && problems.length > 0 && <ul role="alert" className="text-sm text-red-600 list-disc pl-5">{problems.map(p => <li key={p}>{p}</li>)}</ul>}
        <ErrorBox message={err} />
        <div className="flex justify-end gap-2 pt-2"><button className={btnGhost} onClick={onClose}>{fr ? 'Annuler' : 'Cancel'}</button><button className={btnPrimary} disabled={busy} onClick={save}>{fr ? 'Enregistrer' : 'Save'}</button></div>
      </div>
    </Modal>
  );
}

// ── question editor ───────────────────────────────────────────────────────────────
const TYPE_LABEL: Record<QType, [string, string]> = { single: ['Single choice', 'Choix unique'], multiple: ['Multiple choice', 'Choix multiple'], true_false: ['True / False', 'Vrai / Faux'], short: ['Short answer', 'Réponse courte'] };
const LETTERS = 'abcdefghijkl';

interface Draft { type: QType; text: string; options: { id: string; text: string }[]; correct: string[]; tf: boolean; accepted: string; points: string; explanation: string }
const emptyDraft = (type: QType = 'single'): Draft => ({ type, text: '', options: [{ id: 'a', text: '' }, { id: 'b', text: '' }], correct: [], tf: true, accepted: '', points: '1', explanation: '' });
const toDraft = (q: Question): Draft => ({ type: q.type, text: q.text, options: q.options ?? [{ id: 'a', text: '' }, { id: 'b', text: '' }], correct: q.type === 'single' ? [q.answer] : q.type === 'multiple' ? q.answer : [], tf: q.type === 'true_false' ? !!q.answer : true, accepted: q.type === 'short' ? (q.answer as string[]).join('\n') : '', points: String(q.points), explanation: q.explanation ?? '' });

function draftProblems(d: Draft, fr: boolean): string[] {
  const p: string[] = [];
  if (!d.text.trim()) p.push(fr ? 'Saisissez l’énoncé.' : 'Enter the question text.');
  if (!(Number(d.points) > 0)) p.push(fr ? 'Points > 0.' : 'Points must be above 0.');
  if (d.type === 'single' || d.type === 'multiple') {
    if (d.options.some(o => !o.text.trim())) p.push(fr ? 'Toutes les options doivent avoir un texte.' : 'Every option needs text.');
    if (new Set(d.options.map(o => o.text.trim().toLowerCase())).size !== d.options.length) p.push(fr ? 'Les options doivent être différentes.' : 'Options must differ.');
    if (!d.correct.length) p.push(fr ? 'Cochez la bonne réponse.' : 'Mark the correct answer.');
    if (d.type === 'multiple' && d.correct.length === d.options.length) p.push(fr ? 'Toutes les options ne peuvent pas être correctes.' : 'Not every option can be correct.');
  }
  if (d.type === 'short' && !d.accepted.split('\n').some(x => x.trim())) p.push(fr ? 'Indiquez au moins une réponse acceptée.' : 'Give at least one accepted answer.');
  return p;
}
const toInput = (d: Draft): QuestionInput => {
  const base = { type: d.type, text: d.text.trim(), points: Number(d.points), explanation: d.explanation.trim() || undefined };
  if (d.type === 'single' || d.type === 'multiple') return { ...base, options: d.options.map(o => ({ id: o.id, text: o.text.trim() })), answer: d.type === 'single' ? d.correct[0] : d.correct };
  if (d.type === 'true_false') return { ...base, answer: d.tf };
  return { ...base, answer: d.accepted.split('\n').map(x => x.trim()).filter(Boolean) };
};

function QuestionEditor({ quizId, title, onClose }: { quizId: string; title: string; onClose: () => void }) {
  const fr = useFr();
  const r = useLoad(() => assess.quiz(quizId), [quizId]);
  const [draft, setDraft] = useState<{ id: string | null; d: Draft } | null>(null);
  const [err, setErr] = useState(''); const [touched, setTouched] = useState(false); const [busy, setBusy] = useState(false);
  const qs = r.data?.questions ?? [];
  const locked = (r.data?.attempt_count ?? 0) > 0;
  const run = async (fn: () => Promise<unknown>) => { setErr(''); setBusy(true); try { await fn(); r.reload(); return true; } catch (e) { setErr(msg(e)); return false; } finally { setBusy(false); } };
  const move = (i: number, dir: -1 | 1) => { const ids = qs.map(q => q.id); [ids[i], ids[i + dir]] = [ids[i + dir], ids[i]]; void run(() => assess.reorderQuestions(quizId, ids)); };
  const problems = draft ? draftProblems(draft.d, fr) : [];
  const saveDraft = async () => {
    setTouched(true); if (!draft || problems.length) return;
    const ok = await run(() => (draft.id ? assess.updateQuestion(quizId, draft.id, toInput(draft.d)) : assess.addQuestion(quizId, toInput(draft.d))));
    if (ok) { setDraft(null); setTouched(false); }
  };
  const upd = (patch: Partial<Draft>) => setDraft(s => s && { ...s, d: { ...s.d, ...patch } });
  const setType = (type: QType) => upd({ ...emptyDraft(type), text: draft?.d.text ?? '', points: draft?.d.points ?? '1', explanation: draft?.d.explanation ?? '' });
  return (
    <Modal wide title={`${fr ? 'Questions' : 'Questions'} — ${title}`} onClose={onClose}>
      <ErrorBox message={err || r.error} />
      {!r.data ? <Spinner /> : (
        <div className="space-y-3">
          {locked && <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3">{fr ? 'Des étudiants ont déjà passé ce quiz : les questions sont figées (vous pouvez encore corriger une note depuis « Résultats »).' : 'Students have already attempted this quiz: the questions are frozen (you can still adjust a score from "Results").'}</p>}
          <p className="text-xs text-slate-500">{qs.length} {fr ? 'question(s)' : 'question(s)'} · {num(qs.reduce((a, q) => a + q.points, 0))} {fr ? 'points au total' : 'points in total'}</p>
          <ol className="space-y-2">
            {qs.map((q, i) => (
              <li key={q.id} className="border border-slate-200 rounded-xl p-3 flex gap-3">
                <span className="text-sm font-semibold text-slate-400 w-6">{i + 1}.</span>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm font-medium text-slate-800 break-words">{q.text}</p>
                  <div className="flex flex-wrap gap-1.5"><Badge tone="indigo">{TYPE_LABEL[q.type][fr ? 1 : 0]}</Badge><Badge>{num(q.points)} pt</Badge></div>
                  <ul className="text-xs text-slate-500 space-y-0.5">
                    {q.options?.map(o => { const ok = Array.isArray(q.answer) ? q.answer.includes(o.id) : q.answer === o.id; return <li key={o.id} className={ok ? 'text-emerald-600 font-medium' : ''}>{ok ? '✓' : '○'} {o.text}</li>; })}
                    {q.type === 'true_false' && <li className="text-emerald-600 font-medium">✓ {q.answer ? (fr ? 'Vrai' : 'True') : (fr ? 'Faux' : 'False')}</li>}
                    {q.type === 'short' && <li className="text-emerald-600 font-medium">✓ {(q.answer as string[]).join(' / ')}</li>}
                  </ul>
                </div>
                <div className="flex flex-col gap-1">
                  <button className={btnGhost} aria-label="Up" disabled={i === 0 || busy} onClick={() => move(i, -1)}><ArrowUp size={14} /></button>
                  <button className={btnGhost} aria-label="Down" disabled={i === qs.length - 1 || busy} onClick={() => move(i, 1)}><ArrowDown size={14} /></button>
                </div>
                {!locked && <div className="flex flex-col gap-1">
                  <button className={btnGhost} aria-label={fr ? 'Modifier' : 'Edit'} onClick={() => { setDraft({ id: q.id, d: toDraft(q) }); setTouched(false); }}><Pencil size={14} /></button>
                  <button className={btnDanger} aria-label={fr ? 'Supprimer' : 'Delete'} disabled={busy} onClick={() => run(() => assess.deleteQuestion(quizId, q.id))}><Trash2 size={14} /></button>
                </div>}
              </li>
            ))}
          </ol>
          {!locked && !draft && <button className={btnPrimary} onClick={() => { setDraft({ id: null, d: emptyDraft() }); setTouched(false); }}><Plus size={14} /> {fr ? 'Ajouter une question' : 'Add a question'}</button>}
          {draft && (
            <div className="border-2 border-indigo-200 rounded-xl p-4 space-y-3" aria-label="question form">
              <div className="grid sm:grid-cols-3 gap-3">
                <Field label="Type"><select className={`${input} w-full`} value={draft.d.type} disabled={!!draft.id} onChange={e => setType(e.target.value as QType)}>{(Object.keys(TYPE_LABEL) as QType[]).map(t => <option key={t} value={t}>{TYPE_LABEL[t][fr ? 1 : 0]}</option>)}</select></Field>
                <Field label="Points"><input type="number" min={0} step="any" className={`${input} w-full`} value={draft.d.points} onChange={e => upd({ points: e.target.value })} /></Field>
              </div>
              <Field label={fr ? 'Énoncé' : 'Question'}><textarea className={textarea} rows={2} value={draft.d.text} onChange={e => upd({ text: e.target.value })} /></Field>
              {(draft.d.type === 'single' || draft.d.type === 'multiple') && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-600">{fr ? 'Options (cochez la ou les bonnes réponses)' : 'Options (tick the correct answer(s))'}</p>
                  {draft.d.options.map((o, i) => (
                    <div key={o.id} className="flex items-center gap-2">
                      <input aria-label={`${fr ? 'Correcte' : 'Correct'} ${i + 1}`} type={draft.d.type === 'single' ? 'radio' : 'checkbox'} name="correct" checked={draft.d.correct.includes(o.id)}
                        onChange={e => upd({ correct: draft.d.type === 'single' ? [o.id] : e.target.checked ? [...draft.d.correct, o.id] : draft.d.correct.filter(x => x !== o.id) })} />
                      <input aria-label={`Option ${i + 1}`} className={`${input} flex-1`} value={o.text} onChange={e => upd({ options: draft.d.options.map(x => (x.id === o.id ? { ...x, text: e.target.value } : x)) })} />
                      {draft.d.options.length > 2 && <button className="text-slate-400 hover:text-red-600" aria-label="Remove option" onClick={() => upd({ options: draft.d.options.filter(x => x.id !== o.id), correct: draft.d.correct.filter(x => x !== o.id) })}><X size={16} /></button>}
                    </div>
                  ))}
                  {draft.d.options.length < 12 && <button className={btnGhost} onClick={() => upd({ options: [...draft.d.options, { id: [...LETTERS].find(l => !draft.d.options.some(o => o.id === l)) ?? `o${Date.now()}`, text: '' }] })}><Plus size={14} /> {fr ? 'Option' : 'Option'}</button>}
                </div>
              )}
              {draft.d.type === 'true_false' && (
                <div className="flex gap-5 text-sm text-slate-700"><span className="font-medium text-slate-600">{fr ? 'Bonne réponse :' : 'Correct answer:'}</span>
                  <label className="flex items-center gap-1.5"><input type="radio" name="tf" checked={draft.d.tf} onChange={() => upd({ tf: true })} /> {fr ? 'Vrai' : 'True'}</label>
                  <label className="flex items-center gap-1.5"><input type="radio" name="tf" checked={!draft.d.tf} onChange={() => upd({ tf: false })} /> {fr ? 'Faux' : 'False'}</label></div>
              )}
              {draft.d.type === 'short' && <Field label={fr ? 'Réponses acceptées (une par ligne)' : 'Accepted answers (one per line)'} hint={fr ? 'Casse et espaces ignorés' : 'Case and extra spaces are ignored'}><textarea className={textarea} rows={3} value={draft.d.accepted} onChange={e => upd({ accepted: e.target.value })} /></Field>}
              <Field label={fr ? 'Explication (affichée avec le corrigé)' : 'Explanation (shown with the answers)'}><input className={`${input} w-full`} value={draft.d.explanation} onChange={e => upd({ explanation: e.target.value })} /></Field>
              {touched && problems.length > 0 && <ul role="alert" className="text-sm text-red-600 list-disc pl-5">{problems.map(p => <li key={p}>{p}</li>)}</ul>}
              <div className="flex justify-end gap-2"><button className={btnGhost} onClick={() => setDraft(null)}>{fr ? 'Annuler' : 'Cancel'}</button><button className={btnPrimary} disabled={busy} onClick={saveDraft}>{draft.id ? (fr ? 'Mettre à jour' : 'Update') : (fr ? 'Ajouter' : 'Add')}</button></div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

// ── results ───────────────────────────────────────────────────────────────────────
function Results({ quiz, canEdit, onClose }: { quiz: Quiz; canEdit: boolean; onClose: () => void }) {
  const fr = useFr();
  const [tab, setTab] = useState<'attempts' | 'stats'>('attempts');
  const [view, setView] = useState<string | null>(null);
  const att = useLoad(() => assess.quizAttempts(quiz.id), [quiz.id]);
  const stats = useLoad(() => assess.stats(quiz.id), [quiz.id]);
  return (
    <Modal wide title={`${quiz.title} — ${fr ? 'résultats' : 'results'}`} onClose={onClose}>
      <div className="space-y-4">
        <Tabs value={tab} onChange={setTab} tabs={[{ id: 'attempts', label: fr ? 'Essais par étudiant' : 'Attempts per student' }, { id: 'stats', label: fr ? 'Statistiques par question' : 'Per-question statistics' }]} />
        {tab === 'attempts' && (!att.data ? <Spinner /> : (
          <Table min={560} head={[fr ? 'Étudiant' : 'Student', fr ? 'Essais' : 'Attempts']}>
            {att.data.students.map(s => (
              <tr key={s.student_id}><td className="px-4 py-2"><p className="font-medium text-slate-800">{s.name}</p><p className="text-xs text-slate-400">{s.matricule}</p></td>
                <td className="px-4 py-2"><div className="flex flex-wrap gap-1.5">{s.attempts.length === 0 && <span className="text-slate-400 text-xs">{fr ? 'Aucun essai' : 'No attempt'}</span>}
                  {s.attempts.map(a => <button key={a.id} className={btnGhost} disabled={a.status === 'in_progress'} onClick={() => setView(a.id)}>#{a.attempt_no} {a.status === 'in_progress' ? (fr ? 'en cours' : 'in progress') : `${num(a.score)}/${num(a.max_score)}`}{a.overridden ? ' ✎' : ''}{a.auto_submitted ? ' ⏱' : ''}</button>)}</div></td></tr>
            ))}
          </Table>
        ))}
        {tab === 'stats' && (!stats.data ? <Spinner /> : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              {[[fr ? 'Essais' : 'Attempts', stats.data.attempts], [fr ? 'Étudiants' : 'Students', stats.data.students], [fr ? 'Moyenne' : 'Average', pct(stats.data.average_pct)], [fr ? 'Min / Max' : 'Min / Max', `${pct(stats.data.lowest_pct)} / ${pct(stats.data.highest_pct)}`]].map(([k, v]) => <div key={String(k)} className="border border-slate-200 rounded-xl p-2"><p className="text-xs text-slate-400">{k}</p><p className="font-semibold text-slate-800">{v}</p></div>)}
            </div>
            {stats.data.questions.map((q, i) => (
              <div key={q.id} className="border border-slate-200 rounded-xl p-3 space-y-1.5">
                <div className="flex gap-2 items-baseline"><p className="text-sm font-medium text-slate-800 mr-auto">{i + 1}. {q.text}</p><Badge tone={(q.correct_pct ?? 0) >= 50 ? 'green' : 'red'}>{pct(q.correct_pct)} {fr ? 'justes' : 'correct'}</Badge></div>
                {q.choices && Object.entries(q.choices).map(([id, c]) => <div key={id} className="flex items-center gap-2 text-xs"><span className={`w-40 truncate ${c.correct ? 'text-emerald-600 font-medium' : 'text-slate-500'}`}>{c.correct ? '✓ ' : ''}{c.text}</span><div className="flex-1 h-2 bg-slate-100 rounded"><div className={`h-2 rounded ${c.correct ? 'bg-emerald-500' : 'bg-slate-400'}`} style={{ width: `${q.answered ? (c.count / q.answered) * 100 : 0}%` }} /></div><span className="w-6 text-right text-slate-500">{c.count}</span></div>)}
              </div>
            ))}
          </div>
        ))}
      </div>
      {view && <AttemptReview quizId={quiz.id} attemptId={view} canEdit={canEdit} onClose={() => setView(null)} onChanged={() => { att.reload(); stats.reload(); }} />}
    </Modal>
  );
}

function AttemptReview({ quizId, attemptId, canEdit, onClose, onChanged }: { quizId: string; attemptId: string; canEdit: boolean; onClose: () => void; onChanged: () => void }) {
  const fr = useFr();
  const r = useLoad(() => assess.teacherAttempt(quizId, attemptId), [attemptId]);
  const [score, setScore] = useState(''); const [note, setNote] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const a = r.data;
  const show = (q: Question) => { const v = a?.responses[q.id]; if (v === undefined || v === null) return '—'; if (q.options) return (Array.isArray(v) ? v : [v]).map(id => q.options?.find(o => o.id === id)?.text ?? id).join(', '); if (typeof v === 'boolean') return v ? (fr ? 'Vrai' : 'True') : (fr ? 'Faux' : 'False'); return String(v); };
  const ans = (q: Question) => (q.options ? (Array.isArray(q.answer) ? q.answer : [q.answer]).map((id: string) => q.options?.find(o => o.id === id)?.text).join(', ') : typeof q.answer === 'boolean' ? (q.answer ? (fr ? 'Vrai' : 'True') : (fr ? 'Faux' : 'False')) : (q.answer as string[]).join(' / '));
  const save = async () => {
    setBusy(true); setErr('');
    try { await assess.override(quizId, attemptId, Number(score), note); setScore(''); setNote(''); r.reload(); onChanged(); } catch (e) { setErr(msg(e)); } finally { setBusy(false); }
  };
  return (
    <Modal wide title={a ? `${a.student} — #${a.attempt_no}` : '…'} onClose={onClose}>
      <ErrorBox message={r.error} />
      {!a ? <Spinner /> : (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">{fr ? 'Score' : 'Score'} : <strong>{num(a.score)}/{num(a.max_score)}</strong>{a.override && <> · <span className="text-amber-700">{fr ? 'ajusté' : 'adjusted'} ({fr ? 'auto' : 'auto'} {num(a.auto_score)}) : {a.override.note}</span></>}{a.auto_submitted && <> · <Badge tone="amber">{fr ? 'soumis automatiquement à l’échéance' : 'auto-submitted at the deadline'}</Badge></>}</p>
          {a.questions.map((q, i) => (
            <div key={q.id} className={`border rounded-xl p-3 text-sm ${q.correct ? 'border-emerald-200' : 'border-red-200'}`}>
              <p className="font-medium text-slate-800">{i + 1}. {q.text} <span className="text-xs text-slate-400">({num(q.awarded)}/{num(q.points)})</span></p>
              <p className="text-slate-600">{fr ? 'Réponse' : 'Answer'} : {show(q)}</p>
              {!q.correct && <p className="text-emerald-700">{fr ? 'Attendu' : 'Expected'} : {ans(q)}</p>}
            </div>
          ))}
          {canEdit && (
            <div className="border-t border-slate-200 pt-3 space-y-2">
              <p className="text-sm font-medium text-slate-600">{fr ? 'Ajuster le score (une note explicative est obligatoire)' : 'Override the score (an explanatory note is required)'}</p>
              <div className="flex flex-wrap gap-2">
                <input aria-label="override score" type="number" min={0} max={a.max_score ?? undefined} step="any" className={`${input} w-28`} placeholder={`/${num(a.max_score)}`} value={score} onChange={e => setScore(e.target.value)} />
                <input aria-label="override note" className={`${input} flex-1 min-w-[10rem]`} placeholder={fr ? 'Motif' : 'Reason'} value={note} onChange={e => setNote(e.target.value)} />
                <button className={btnPrimary} disabled={busy || score === '' || !note.trim() || Number(score) < 0 || Number(score) > (a.max_score ?? 0)} onClick={save}>{fr ? 'Appliquer' : 'Apply'}</button>
              </div>
              <ErrorBox message={err} />
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
