import { useState } from 'react';
import { AlertTriangle, ArrowLeft, Download, Upload } from 'lucide-react';
import { assess } from '../../api/assessments';
import { ErrorBox, Spinner, btnGhost, btnPrimary, fmtDateTime, msg, useFr, useLoad } from '../academics/ui';
import { Due, StateBadge, card, num, textarea, useNow } from './shared';

export default function StudentAssignmentView({ id, onBack }: { id: string; onBack: () => void }) {
  const fr = useFr(); const lang = fr ? 'fr' : 'en';
  const r = useLoad(() => assess.assignment(id), [id]);
  const [text, setText] = useState<string | null>(null); const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState(''); const [ok, setOk] = useState(''); const [busy, setBusy] = useState(false);
  const now = useNow(15000);
  const a = r.data;
  const sub = a?.submission ?? null;
  const locked = !!sub && sub.status !== 'submitted';
  const overdue = !!a && now > new Date(a.due_at).getTime();
  const closedNow = !!a && (a.status !== 'published' || (overdue && !a.allow_late));
  const body = text ?? sub?.text ?? '';
  const empty = !body.trim() && !file;
  const tooBig = !!file && file.size > 10 * 1024 * 1024;
  const send = async () => {
    if (!a) return;
    setBusy(true); setErr(''); setOk('');
    try { await assess.submit(a.id, body, file); setFile(null); setText(null); setOk(fr ? 'Travail envoyé.' : 'Your work was submitted.'); r.reload(); } catch (e) { setErr(msg(e)); } finally { setBusy(false); }
  };
  return (
    <div className="space-y-5">
      <button className={btnGhost} onClick={onBack}><ArrowLeft size={14} /> {fr ? 'Retour' : 'Back'}</button>
      <ErrorBox message={r.error} />
      {!a ? <Spinner /> : (
        <>
          <div className={`${card} p-5 space-y-2`}>
            <div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-bold text-slate-800 mr-auto">{a.title}</h1>{sub ? <StateBadge status={sub.status} /> : <StateBadge status="missing" />}</div>
            <p className="text-sm text-slate-500">{a.offering?.course} · {a.offering?.code}</p>
            <p className="text-sm text-slate-600"><Due at={a.due_at} label={fr ? 'À rendre : ' : 'Due: '} /> · {fr ? 'Note sur' : 'Out of'} {num(a.max_score)}</p>
            {a.instructions && <p className="text-sm text-slate-700 whitespace-pre-wrap pt-1">{a.instructions}</p>}
          </div>
          {overdue && !closedNow && !locked && <p role="alert" className="flex items-center gap-2 text-sm bg-amber-50 text-amber-800 rounded-lg p-3"><AlertTriangle size={16} /> {fr ? 'La date limite est dépassée : votre travail sera signalé « en retard ».' : 'The deadline has passed: your work will be flagged as late.'}</p>}
          {closedNow && !locked && <p role="alert" className="text-sm bg-red-50 text-red-700 rounded-lg p-3">{a.status !== 'published' ? (fr ? 'Ce devoir est clôturé.' : 'This assignment is closed.') : (fr ? 'La date limite est dépassée et les retards ne sont pas acceptés.' : 'The deadline has passed and late work is not accepted.')}</p>}
          {sub && (
            <div className={`${card} p-5 space-y-2`}>
              <h2 className="font-semibold text-slate-800">{fr ? 'Votre rendu' : 'Your submission'}</h2>
              <p className="text-xs text-slate-500">{fr ? 'Envoyé le' : 'Submitted'} {fmtDateTime(sub.submitted_at, lang)}{sub.is_late && <span className="text-red-600 font-medium"> · {fr ? 'en retard' : 'late'}</span>}</p>
              {sub.text && <p className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-lg p-3">{sub.text}</p>}
              {sub.has_file && <button className={btnGhost} onClick={() => assess.downloadSubmission(a.id, sub.id, sub.file_name ?? 'file').catch(e => setErr(msg(e)))}><Download size={14} /> {sub.file_name}</button>}
              {locked && (
                <div className="border-t border-slate-200 pt-3 space-y-1" data-testid="grade-box">
                  <p className="text-lg font-bold text-slate-800">{num(sub.score)} <span className="text-sm font-normal text-slate-500">/ {num(a.max_score)}</span></p>
                  {sub.feedback ? <p className="text-sm text-slate-700"><span className="font-medium">{fr ? 'Commentaire : ' : 'Feedback: '}</span>{sub.feedback}</p> : null}
                  <p className="text-xs text-slate-400">{fr ? 'Noté : le travail ne peut plus être remplacé.' : 'Graded: the work can no longer be replaced.'}</p>
                </div>
              )}
            </div>
          )}
          {!locked && !closedNow && (
            <div className={`${card} p-5 space-y-3`}>
              <h2 className="font-semibold text-slate-800">{sub ? (fr ? 'Remplacer mon rendu' : 'Replace my submission') : (fr ? 'Rendre mon travail' : 'Hand in my work')}</h2>
              {sub && <p className="text-xs text-slate-500">{fr ? 'Un nouvel envoi remplace entièrement le précédent, jusqu’à ce qu’il soit noté.' : 'A new submission replaces the previous one entirely, until it is graded.'}</p>}
              {a.allow_text && <textarea aria-label={fr ? 'Votre réponse' : 'Your answer'} className={textarea} rows={7} maxLength={20000} placeholder={fr ? 'Votre réponse…' : 'Your answer…'} value={body} onChange={e => setText(e.target.value)} />}
              {a.allow_file && (
                <label className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                  <span className={`${btnGhost} cursor-pointer`}><Upload size={14} /> {fr ? 'Choisir un fichier' : 'Choose a file'}</span>
                  <input aria-label="file" type="file" className="sr-only" onChange={e => setFile(e.target.files?.[0] ?? null)} />
                  <span>{file ? `${file.name} (${Math.max(1, Math.round(file.size / 1024))} KB)` : (fr ? 'PDF, Office, texte, image, zip… (max 10 Mo)' : 'PDF, Office, text, image, zip… (max 10 MB)')}</span>
                </label>
              )}
              {tooBig && <p role="alert" className="text-sm text-red-600">{fr ? 'Fichier trop volumineux.' : 'File too large.'}</p>}
              <ErrorBox message={err} />{ok && <p role="status" className="text-sm text-emerald-700">{ok}</p>}
              <button className={btnPrimary} disabled={busy || empty || tooBig} onClick={send}>{fr ? 'Envoyer' : 'Submit'}</button>
            </div>
          )}
          {locked && <ErrorBox message={err} />}
        </>
      )}
    </div>
  );
}
