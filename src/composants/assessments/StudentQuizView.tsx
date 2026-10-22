import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { assess, type AttemptView, type Question } from '../../api/assessments';
import { Badge, ErrorBox, Modal, Spinner, btnGhost, btnPrimary, fmtDateTime, input, msg, useFr, useLoad } from '../academics/ui';
import { StateBadge, card, num, useNow } from './shared';

type Responses = Record<string, unknown>;

export default function StudentQuizView({ id, onBack }: { id: string; onBack: () => void }) {
  const fr = useFr(); const lang = fr ? 'fr' : 'en';
  const q = useLoad(() => assess.quiz(id), [id]);
  const [attempt, setAttempt] = useState<AttemptView | null>(null);
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const now = useNow(20000);
  const quiz = q.data;
  const open = !!quiz && quiz.status === 'published' && (!quiz.opens_at || now >= new Date(quiz.opens_at).getTime()) && (!quiz.closes_at || now < new Date(quiz.closes_at).getTime());
  const used = quiz?.attempts?.length ?? 0;
  const running = quiz?.attempts?.find(a => a.status === 'in_progress');
  const canStart = open && (!!running || used < (quiz?.max_attempts ?? 1));
  const begin = async () => { setBusy(true); setErr(''); try { setAttempt(await assess.start(id)); } catch (e) { setErr(msg(e)); q.reload(); } finally { setBusy(false); } };
  const view = async (aid: string) => { setErr(''); try { setAttempt(await assess.attempt(id, aid)); } catch (e) { setErr(msg(e)); } };
  const close = () => { setAttempt(null); q.reload(); };

  if (attempt) return attempt.status === 'in_progress' ? <Taking key={attempt.id} quizId={id} initial={attempt} onDone={setAttempt} /> : <Result a={attempt} onBack={close} />;
  return (
    <div className="space-y-5">
      <button className={btnGhost} onClick={onBack}><ArrowLeft size={14} /> {fr ? 'Retour' : 'Back'}</button>
      <ErrorBox message={err || q.error} />
      {!quiz ? <Spinner /> : (
        <>
          <div className={`${card} p-5 space-y-2`}>
            <div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-bold text-slate-800 mr-auto">{quiz.title}</h1><StateBadge status={quiz.status} /></div>
            <p className="text-sm text-slate-500">{quiz.offering?.course} · {quiz.offering?.code}</p>
            {quiz.instructions && <p className="text-sm text-slate-700 whitespace-pre-wrap">{quiz.instructions}</p>}
            <ul className="text-sm text-slate-600 list-disc pl-5">
              <li>{quiz.question_count} {fr ? 'questions' : 'questions'}</li>
              <li>{quiz.duration_minutes ? `${quiz.duration_minutes} min — ${fr ? 'le chrono est géré par le serveur' : 'the timer is kept by the server'}` : (fr ? 'Sans limite de durée' : 'No time limit')}</li>
              <li>{used}/{quiz.max_attempts} {fr ? 'essai(s) utilisé(s)' : 'attempt(s) used'}</li>
              {quiz.closes_at && <li>{fr ? 'Ferme le' : 'Closes'} {fmtDateTime(quiz.closes_at, lang)}</li>}
              {quiz.opens_at && now < new Date(quiz.opens_at).getTime() && <li className="text-amber-700">{fr ? 'Ouvre le' : 'Opens'} {fmtDateTime(quiz.opens_at, lang)}</li>}
            </ul>
            <div className="pt-2">
              <button className={btnPrimary} disabled={!canStart || busy} onClick={begin}>{running ? (fr ? 'Reprendre l’essai' : 'Resume attempt') : (fr ? 'Commencer le quiz' : 'Start the quiz')}</button>
              {!canStart && !running && <span className="ml-3 text-sm text-slate-500">{!open ? (fr ? 'Ce quiz n’est pas ouvert.' : 'This quiz is not open.') : (fr ? 'Plus d’essai disponible.' : 'No attempts left.')}</span>}
            </div>
          </div>
          {!!quiz.attempts?.length && (
            <div className={`${card} p-5 space-y-2`}>
              <h2 className="font-semibold text-slate-800">{fr ? 'Mes essais' : 'My attempts'}</h2>
              {quiz.attempts.map(a => (
                <div key={a.id} className="flex flex-wrap items-center gap-3 text-sm border-t border-slate-100 pt-2 first:border-0 first:pt-0">
                  <span className="font-medium text-slate-700">#{a.attempt_no}</span><StateBadge status={a.status} />
                  {a.status !== 'in_progress' && <span className="text-slate-700">{num(a.score)} / {num(a.max_score)}</span>}
                  {a.auto_submitted && <Badge tone="amber">{fr ? 'rendu automatiquement à l’échéance' : 'auto-submitted at the deadline'}</Badge>}
                  <button className={`${btnGhost} ml-auto`} onClick={() => view(a.id)}>{a.status === 'in_progress' ? (fr ? 'Ouvrir' : 'Open') : (fr ? 'Voir le résultat' : 'View result')}</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function fmtClock(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${p(m)}:${p(x)}` : `${p(m)}:${p(x)}`;
}

function Taking({ quizId, initial, onDone }: { quizId: string; initial: AttemptView; onDone: (a: AttemptView) => void }) {
  const fr = useFr();
  const [resp, setResp] = useState<Responses>(initial.responses ?? {});
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle'); const [savedAt, setSavedAt] = useState('');
  const [confirm, setConfirm] = useState(false); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const dirty = useRef<Set<string>>(new Set()); const respRef = useRef(resp); useEffect(() => { respRef.current = resp; }, [resp]);
  const finishing = useRef(false);
  const [offset] = useState(() => new Date(initial.server_now).getTime() - Date.now());   // server clock − local clock
  const tick = useNow(500);
  const deadline = initial.deadline_at ? new Date(initial.deadline_at).getTime() : null;
  const remaining = deadline === null ? null : deadline - (tick + offset);

  const submit = useCallback(async () => {
    if (finishing.current) return; finishing.current = true; setBusy(true); setErr('');
    try { onDone(await assess.submitAttempt(quizId, initial.id, respRef.current)); }
    catch (e) { finishing.current = false; setErr(msg(e)); try { const a = await assess.attempt(quizId, initial.id); if (a.status !== 'in_progress') onDone(a); } catch { /* keep the error visible */ } }
    finally { setBusy(false); }
  }, [quizId, initial.id, onDone]);

  // time is up according to the SERVER's deadline → ask the server to close the attempt (it grades what was saved)
  useEffect(() => { if (remaining !== null && remaining <= 0) void submit(); }, [remaining, submit]);

  const flush = useCallback(async () => {
    if (!dirty.current.size || finishing.current) return;
    const keys = [...dirty.current]; dirty.current.clear();
    setSaveState('saving');
    try {
      await assess.save(quizId, initial.id, Object.fromEntries(keys.map(k => [k, respRef.current[k] ?? null])));
      setSaveState('saved'); setSavedAt(new Date().toLocaleTimeString());
    } catch (e) {
      keys.forEach(k => dirty.current.add(k)); setSaveState('error');
      if (/Time is up|already submitted/i.test(msg(e))) { try { onDone(await assess.attempt(quizId, initial.id)); } catch { /* ignore */ } }
    }
  }, [quizId, initial.id, onDone]);
  useEffect(() => { const t = setInterval(() => void flush(), 2500); return () => clearInterval(t); }, [flush]);

  const set = (qid: string, v: unknown) => { dirty.current.add(qid); setResp(r => ({ ...r, [qid]: v })); setSaveState('idle'); };
  const answered = initial.questions.filter(q => { const v = resp[q.id]; return v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length); }).length;
  const low = remaining !== null && remaining < 60000;
  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 -mx-1 px-1 py-2 bg-slate-50/95 backdrop-blur flex flex-wrap items-center gap-3 border-b border-slate-200">
        <h1 className="font-bold text-slate-800 mr-auto truncate">{initial.quiz.title}</h1>
        <span className="text-xs text-slate-500" aria-live="polite">{saveState === 'saving' ? (fr ? 'Enregistrement…' : 'Saving…') : saveState === 'saved' ? `${fr ? 'Enregistré' : 'Saved'} ${savedAt}` : saveState === 'error' ? (fr ? 'Échec de l’enregistrement, nouvel essai…' : 'Save failed, retrying…') : ''}</span>
        {remaining !== null && <span data-testid="countdown" className={`flex items-center gap-1.5 font-mono font-semibold px-3 py-1 rounded-lg ${low ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'}`}><Clock size={14} /> {fmtClock(remaining)}</span>}
      </div>
      {initial.quiz.instructions && <p className="text-sm text-slate-600 whitespace-pre-wrap">{initial.quiz.instructions}</p>}
      <ol className="space-y-4">
        {initial.questions.map((q, i) => <QuestionCard key={q.id} q={q} n={i + 1} value={resp[q.id]} onChange={v => set(q.id, v)} />)}
      </ol>
      <ErrorBox message={err} />
      <div className="flex items-center gap-3">
        <button className={btnPrimary} disabled={busy} onClick={async () => { await flush(); setConfirm(true); }}>{fr ? 'Terminer et envoyer' : 'Finish and submit'}</button>
        <span className="text-sm text-slate-500">{answered}/{initial.questions.length} {fr ? 'répondues' : 'answered'}</span>
      </div>
      {confirm && (
        <Modal title={fr ? 'Envoyer vos réponses ?' : 'Submit your answers?'} onClose={() => setConfirm(false)}>
          <p className="text-sm text-slate-600">{answered < initial.questions.length ? (fr ? `Il reste ${initial.questions.length - answered} question(s) sans réponse. ` : `${initial.questions.length - answered} question(s) are unanswered. `) : ''}{fr ? 'Après l’envoi, vous ne pourrez plus modifier cet essai.' : 'After submitting you can no longer change this attempt.'}</p>
          <div className="flex justify-end gap-2 pt-4"><button className={btnGhost} onClick={() => setConfirm(false)}>{fr ? 'Continuer' : 'Keep working'}</button><button className={btnPrimary} disabled={busy} onClick={() => { setConfirm(false); void submit(); }}>{fr ? 'Envoyer' : 'Submit'}</button></div>
        </Modal>
      )}
    </div>
  );
}

function QuestionCard({ q, n, value, onChange }: { q: Question; n: number; value: unknown; onChange: (v: unknown) => void }) {
  const fr = useFr();
  return (
    <li className={`${card} p-4 space-y-3`}>
      <div className="flex gap-2"><span className="font-semibold text-slate-400">{n}.</span><p className="font-medium text-slate-800 whitespace-pre-wrap flex-1">{q.text}</p><span className="text-xs text-slate-400 whitespace-nowrap">{num(q.points)} pt</span></div>
      {q.type === 'single' && q.options?.map(o => <label key={o.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer"><input type="radio" name={q.id} checked={value === o.id} onChange={() => onChange(o.id)} /> {o.text}</label>)}
      {q.type === 'multiple' && <><p className="text-xs text-slate-400">{fr ? 'Plusieurs réponses possibles — tout ou rien.' : 'Select all that apply — all or nothing.'}</p>{q.options?.map(o => { const cur = (value as string[] | undefined) ?? []; return <label key={o.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer"><input type="checkbox" checked={cur.includes(o.id)} onChange={e => onChange(e.target.checked ? [...cur, o.id] : cur.filter(x => x !== o.id))} /> {o.text}</label>; })}</>}
      {q.type === 'true_false' && [true, false].map(b => <label key={String(b)} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer"><input type="radio" name={q.id} checked={value === b} onChange={() => onChange(b)} /> {b ? (fr ? 'Vrai' : 'True') : (fr ? 'Faux' : 'False')}</label>)}
      {q.type === 'short' && <input aria-label={q.text} className={`${input} w-full`} maxLength={1000} value={(value as string | undefined) ?? ''} onChange={e => onChange(e.target.value)} />}
    </li>
  );
}

function Result({ a, onBack }: { a: AttemptView; onBack: () => void }) {
  const fr = useFr();
  const text = (q: Question, v: unknown) => {
    if (v === undefined || v === null || v === '') return '—';
    if (q.options) return (Array.isArray(v) ? v : [v]).map(x => q.options?.find(o => o.id === x)?.text ?? String(x)).join(', ');
    if (typeof v === 'boolean') return v ? (fr ? 'Vrai' : 'True') : (fr ? 'Faux' : 'False');
    return String(v);
  };
  const expected = (q: Question) => (q.options ? (Array.isArray(q.answer) ? q.answer : [q.answer]).map((x: string) => q.options?.find(o => o.id === x)?.text).join(', ') : typeof q.answer === 'boolean' ? (q.answer ? (fr ? 'Vrai' : 'True') : (fr ? 'Faux' : 'False')) : (q.answer as string[]).join(' / '));
  return (
    <div className="space-y-5">
      <button className={btnGhost} onClick={onBack}><ArrowLeft size={14} /> {fr ? 'Retour' : 'Back'}</button>
      <div className={`${card} p-5 space-y-1`} data-testid="quiz-result">
        <h1 className="text-xl font-bold text-slate-800">{a.quiz.title} — #{a.attempt_no}</h1>
        <p className="text-3xl font-bold text-indigo-600">{num(a.score)} <span className="text-base font-normal text-slate-500">/ {num(a.max_score)}</span></p>
        {a.auto_submitted && <p className="text-sm text-amber-700">{fr ? 'Le temps était écoulé : seules les réponses enregistrées avant l’échéance ont été corrigées.' : 'Time ran out: only the answers saved before the deadline were graded.'}</p>}
        {a.override_note && <p className="text-sm text-slate-600">{fr ? 'Note ajustée par l’enseignant : ' : 'Adjusted by your lecturer: '}{a.override_note}</p>}
        {!a.answers_visible && <p className="text-sm text-slate-500">{a.quiz.show_answers ? (fr ? 'Le corrigé sera disponible après la clôture du quiz.' : 'The correct answers will be available once the quiz has closed.') : (fr ? 'Le corrigé n’est pas affiché pour ce quiz.' : 'Correct answers are not shown for this quiz.')}</p>}
      </div>
      {a.answers_visible && a.questions.map((q, i) => (
        <div key={q.id} className={`${card} p-4 space-y-1 border-l-4 ${q.correct ? 'border-l-emerald-500' : 'border-l-red-500'}`}>
          <p className="font-medium text-slate-800 flex items-start gap-2">{q.correct ? <CheckCircle2 size={18} className="text-emerald-600 shrink-0" /> : <XCircle size={18} className="text-red-600 shrink-0" />}<span>{i + 1}. {q.text} <span className="text-xs text-slate-400">({num(q.awarded)}/{num(q.points)})</span></span></p>
          <p className="text-sm text-slate-600">{fr ? 'Votre réponse : ' : 'Your answer: '}{text(q, a.responses[q.id])}</p>
          {!q.correct && <p className="text-sm text-emerald-700">{fr ? 'Bonne réponse : ' : 'Correct answer: '}{expected(q)}</p>}
          {q.explanation && <p className="text-sm text-slate-500 italic">{q.explanation}</p>}
        </div>
      ))}
    </div>
  );
}
