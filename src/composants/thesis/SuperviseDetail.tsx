import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { thesisApi, type Submission, type ThesisFull } from '../../api/thesis';
import { DefenceBox, KIND, MilestoneBadge, Stepper, SubmissionList, ThesisStatusBadge, Timeline } from './shared';
import { ErrorBox, Field, Modal, Spinner, btnGhost, btnPrimary, fmtDate, input, msg, useFr, useLoad } from '../academics/ui';
import { useLanguage } from '../../i18n/LanguageContext';

function ReviewModal({ s, title, onClose, onDone }: { s: Submission; title: string; onClose: () => void; onDone: () => void }) {
  const fr = useFr();
  const [fb, setFb] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const go = async (decision?: 'accepted' | 'revision_requested') => {
    setBusy(true); setErr('');
    try { await thesisApi.review(s.id, { decision: s.milestone_id ? decision : undefined, feedback: fb || undefined }); onDone(); } catch (e) { setErr(msg(e)); } finally { setBusy(false); }
  };
  return (
    <Modal title={`${title} — v${s.version}`} onClose={onClose}>
      <div className="space-y-3">
        <ErrorBox message={err} />
        <button className="text-sm text-indigo-600 hover:underline break-all" onClick={() => void thesisApi.download(s)}>{s.file_name}</button>
        {s.note && <p className="text-sm text-slate-600 break-words">{s.note}</p>}
        <Field label={fr ? 'Commentaires pour l’étudiant' : 'Feedback for the student'}><textarea className={`${input} w-full`} rows={4} maxLength={3000} value={fb} onChange={e => setFb(e.target.value)} /></Field>
        <div className="flex flex-wrap justify-end gap-2">
          {s.milestone_id ? (<>
            <button className={btnGhost} disabled={busy || !fb.trim()} onClick={() => go('revision_requested')}>{fr ? 'Demander des corrections' : 'Request revision'}</button>
            <button className={btnPrimary} disabled={busy} onClick={() => go('accepted')}>{fr ? 'Valider le jalon' : 'Accept milestone'}</button>
          </>) : <button className={btnPrimary} disabled={busy || !fb.trim()} onClick={() => go()}>{fr ? 'Envoyer le commentaire' : 'Send feedback'}</button>}
        </div>
      </div>
    </Modal>
  );
}

/** Supervisor workspace for one thesis: milestones builder, submissions to review, history. */
export default function SuperviseDetail({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const fr = useFr(); const { lang } = useLanguage();
  const th = useLoad<ThesisFull>(() => thesisApi.get(id), [id]);
  const [title, setTitle] = useState(''); const [due, setDue] = useState(''); const [err, setErr] = useState(''); const [rev, setRev] = useState<Submission | null>(null); const [note, setNote] = useState('');
  const t = th.data;
  const refresh = () => { th.reload(); onChanged(); };
  const run = async (fn: () => Promise<unknown>) => { setErr(''); try { await fn(); refresh(); } catch (e) { setErr(msg(e)); } };
  const editable = !!t && ['approved', 'in_progress'].includes(t.status);
  const latest = (t?.submissions ?? []).filter(s => !s.reviewed_at);
  return (
    <Modal title={t?.title ?? '…'} onClose={onClose} wide>
      {!t ? (th.error ? <ErrorBox message={th.error} /> : <Spinner />) : (
        <div className="space-y-5">
          <ErrorBox message={err} />
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2"><ThesisStatusBadge status={t.status} /><span className="text-xs text-slate-500">{t.student?.name} · {t.student?.matricule} · {KIND[t.kind][fr ? 1 : 0]}</span></div>
            <Stepper status={t.status} />
            {t.abstract && <p className="text-sm text-slate-600 whitespace-pre-line break-words">{t.abstract}</p>}
            {t.status === 'approved' && <button className={btnPrimary} onClick={() => run(() => thesisApi.start(t.id))}>{fr ? 'Démarrer les travaux' : 'Start the work'}</button>}
          </div>
          <DefenceBox t={t} />
          <section>
            <h3 className="font-semibold text-slate-800 mb-1">{fr ? 'Jalons' : 'Milestones'}</h3>
            <ul className="divide-y divide-slate-100">
              {t.milestones.map(m => (
                <li key={m.id} className="py-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="flex-1 min-w-40 break-words text-slate-800">{m.title}</span>
                  <span className="text-xs text-slate-500">{m.due_date ? fmtDate(m.due_date, lang) : '—'}</span><MilestoneBadge status={m.status} />
                  {editable && m.status === 'pending' && <button aria-label="Delete milestone" className="text-slate-400 hover:text-red-600" onClick={() => run(() => thesisApi.deleteMilestone(m.id))}><Trash2 size={14} /></button>}
                </li>
              ))}
              {!t.milestones.length && <li className="py-2 text-sm text-slate-400">{fr ? 'Aucun jalon défini.' : 'No milestones defined yet.'}</li>}
            </ul>
            {editable ? (
              <div className="mt-2 flex flex-wrap gap-2">
                <input aria-label="Milestone title" className={`${input} flex-1 min-w-48`} placeholder={fr ? 'Nouveau jalon (ex. revue de littérature)' : 'New milestone (e.g. literature review)'} maxLength={200} value={title} onChange={e => setTitle(e.target.value)} />
                <input aria-label="Due date" type="date" className={input} value={due} onChange={e => setDue(e.target.value)} />
                <button className={btnGhost} disabled={!title.trim()} onClick={() => run(async () => { await thesisApi.addMilestone(t.id, { title, due_date: due || null }); setTitle(''); setDue(''); })}><Plus size={14} /> {fr ? 'Ajouter' : 'Add'}</button>
              </div>
            ) : <p className="mt-1 text-xs text-slate-400">{fr ? 'Les jalons se définissent une fois le sujet approuvé.' : 'Milestones can be defined once the topic is approved.'}</p>}
          </section>
          <section>
            <h3 className="font-semibold text-slate-800 mb-1">{fr ? 'Dépôts' : 'Submissions'} {latest.length > 0 && <span className="text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 ml-1">{latest.length} {fr ? 'à relire' : 'to review'}</span>}</h3>
            {t.status === 'in_progress' && latest.map(s => <button key={s.id} className="mr-2 mb-2 text-xs rounded-lg border border-slate-300 px-2 py-1 hover:bg-slate-50 text-slate-700" onClick={() => setRev(s)}>{fr ? 'Relire' : 'Review'}: v{s.version} · {t.milestones.find(m => m.id === s.milestone_id)?.title ?? (fr ? 'Document' : 'Document')}</button>)}
            <SubmissionList items={t.submissions} milestones={t.milestones} empty={fr ? 'Aucun dépôt.' : 'Nothing submitted yet.'} />
          </section>
          <section>
            <h3 className="font-semibold text-slate-800 mb-2">{fr ? 'Suivi' : 'Activity'}</h3>
            <div className="flex gap-2 mb-3"><input aria-label="Comment" className={`${input} flex-1`} placeholder={fr ? 'Ajouter un commentaire…' : 'Add a comment…'} value={note} onChange={e => setNote(e.target.value)} /><button className={btnGhost} disabled={!note.trim()} onClick={() => run(async () => { await thesisApi.comment(t.id, note); setNote(''); })}>{fr ? 'Envoyer' : 'Send'}</button></div>
            <Timeline events={t.events} />
          </section>
        </div>
      )}
      {rev && t && <ReviewModal s={rev} title={t.milestones.find(m => m.id === rev.milestone_id)?.title ?? (fr ? 'Document' : 'Document')} onClose={() => setRev(null)} onDone={() => { setRev(null); refresh(); }} />}
    </Modal>
  );
}
