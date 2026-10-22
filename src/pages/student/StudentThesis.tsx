import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { thesisApi, type Milestone, type ProposalInput, type ThesisFull } from '../../api/thesis';
import { DefenceBox, KIND, MilestoneBadge, Stepper, SubmissionList, ThesisStatusBadge, Timeline } from '../../composants/thesis/shared';
import { ErrorBox, Field, Modal, PageHeader, Spinner, btnDanger, btnGhost, btnPrimary, fmtDate, input, msg, useFr, useLoad } from '../../composants/academics/ui';
import { useLanguage } from '../../i18n/LanguageContext';

function ProposalForm({ initial, onDone, onCancel }: { initial?: ThesisFull; onDone: () => void; onCancel?: () => void }) {
  const fr = useFr();
  const sup = useLoad(() => thesisApi.supervisors(), []);
  const [f, setF] = useState<ProposalInput>({ title: initial?.title ?? '', abstract: initial?.abstract ?? '', keywords: initial?.keywords ?? '', kind: initial?.kind ?? 'thesis', supervisor_id: initial?.supervisor?.id ?? '' });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const submit = async () => {
    setBusy(true); setErr('');
    try {
      const body = { ...f, supervisor_id: f.supervisor_id || null };
      if (initial) await thesisApi.edit(initial.id, body); else await thesisApi.propose(body);
      onDone();
    } catch (e) { setErr(msg(e)); } finally { setBusy(false); }
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 space-y-3 max-w-3xl">
      <ErrorBox message={err} />
      <Field label={fr ? 'Titre du sujet' : 'Topic title'}><input className={`${input} w-full`} maxLength={200} value={f.title} onChange={e => setF({ ...f, title: e.target.value })} /></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Type"><select className={`${input} w-full`} value={f.kind} onChange={e => setF({ ...f, kind: e.target.value as ProposalInput['kind'] })}>{Object.entries(KIND).map(([k, v]) => <option key={k} value={k}>{v[fr ? 1 : 0]}</option>)}</select></Field>
        <Field label={fr ? 'Encadrant souhaité' : 'Preferred supervisor'}>
          <select className={`${input} w-full`} value={f.supervisor_id ?? ''} onChange={e => setF({ ...f, supervisor_id: e.target.value })}>
            <option value="">{fr ? '— Aucun (à assigner par la scolarité) —' : '— None (to be assigned by the office) —'}</option>
            {(sup.data?.items ?? []).map(s => <option key={s.id} value={s.id} disabled={!s.available}>{s.name} ({s.load}/{s.max}){s.available ? '' : fr ? ' — complet' : ' — full'}</option>)}
          </select>
        </Field>
      </div>
      <Field label={fr ? 'Résumé' : 'Abstract'} hint={`${(f.abstract ?? '').length}/5000`}><textarea className={`${input} w-full`} rows={5} maxLength={5000} value={f.abstract} onChange={e => setF({ ...f, abstract: e.target.value })} /></Field>
      <Field label={fr ? 'Mots-clés (séparés par des virgules)' : 'Keywords (comma separated)'}><input className={`${input} w-full`} maxLength={300} value={f.keywords} onChange={e => setF({ ...f, keywords: e.target.value })} /></Field>
      <div className="flex gap-2">{onCancel && <button className={btnGhost} onClick={onCancel}>{fr ? 'Annuler' : 'Cancel'}</button>}<button className={btnPrimary} disabled={busy || !f.title.trim()} onClick={submit}>{busy ? '…' : initial ? (fr ? 'Enregistrer' : 'Save changes') : (fr ? 'Soumettre la proposition' : 'Submit proposal')}</button></div>
    </div>
  );
}

function MilestoneRow({ t, m, reload, setErr }: { t: ThesisFull; m: Milestone; reload: () => void; setErr: (s: string) => void }) {
  const fr = useFr(); const { lang } = useLanguage();
  const ref = useRef<HTMLInputElement>(null); const [busy, setBusy] = useState(false);
  const pick = async (file?: File) => {
    if (!file) return;
    setBusy(true); setErr('');
    try { await thesisApi.upload(t.id, file, m.id); reload(); } catch (e) { setErr(msg(e)); } finally { setBusy(false); if (ref.current) ref.current.value = ''; }
  };
  const canUpload = t.status === 'in_progress' && m.status !== 'accepted';
  return (
    <li className="py-3 flex flex-wrap items-start gap-x-4 gap-y-2">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-slate-800 break-words">{m.title}</p>
        <p className="text-xs text-slate-500">{m.due_date ? `${fr ? 'Échéance' : 'Due'} ${fmtDate(m.due_date, lang)}` : fr ? 'Sans échéance' : 'No due date'}</p>
        {m.feedback && <p className="text-xs mt-1 rounded bg-amber-50 border border-amber-200 text-amber-800 px-2 py-1 break-words whitespace-pre-line">{m.feedback}</p>}
      </div>
      <MilestoneBadge status={m.status} />
      {canUpload && (<>
        <input ref={ref} type="file" className="hidden" aria-label={`Upload ${m.title}`} onChange={e => void pick(e.target.files?.[0])} />
        <button className={btnGhost} disabled={busy} onClick={() => ref.current?.click()}><Upload size={14} /> {busy ? '…' : m.status === 'revision_requested' ? (fr ? 'Redéposer' : 'Upload revision') : (fr ? 'Déposer' : 'Upload')}</button>
      </>)}
    </li>
  );
}

export default function StudentThesis() {
  const fr = useFr();
  const mine = useLoad(() => thesisApi.mine(), []);
  const [err, setErr] = useState(''); const [editing, setEditing] = useState(false); const [confirm, setConfirm] = useState<'withdraw' | 'final' | null>(null); const [reason, setReason] = useState(''); const [busy, setBusy] = useState(false);
  const general = useRef<HTMLInputElement>(null);
  const reload = () => mine.reload();
  const d = mine.data; const t = d?.thesis ?? null;
  const act = async () => {
    if (!t || !confirm) return;
    setBusy(true); setErr('');
    try { if (confirm === 'withdraw') await thesisApi.withdraw(t.id, reason); else await thesisApi.submitFinal(t.id, reason); setConfirm(null); setReason(''); reload(); }
    catch (e) { setErr(msg(e)); setConfirm(null); } finally { setBusy(false); }
  };
  const uploadGeneral = async (file?: File) => {
    if (!file || !t) return;
    setErr(''); try { await thesisApi.upload(t.id, file); reload(); } catch (e) { setErr(msg(e)); } finally { if (general.current) general.current.value = ''; }
  };
  const open = t && !['completed', 'rejected', 'withdrawn'].includes(t.status);
  const allAccepted = !!t && t.milestones.every(m => m.status === 'accepted') && t.submissions.length > 0;
  return (
    <div className="space-y-5">
      <PageHeader title={fr ? 'Mon mémoire / projet' : 'My thesis / project'} subtitle={fr ? 'Proposition, encadrement, jalons, dépôts et soutenance.' : 'Proposal, supervision, milestones, submissions and defence.'} onRefresh={reload} />
      <ErrorBox message={err || mine.error} />
      {!d ? <Spinner /> : (!t || (!open && t.status !== 'completed')) && d.can_propose ? (
        <>
          {t && <p className="text-sm text-slate-500">{fr ? 'Votre précédent dossier' : 'Your previous file'}: <b>{t.title}</b> <ThesisStatusBadge status={t.status} />{t.decision_note ? ` — ${t.decision_note}` : ''}</p>}
          <ProposalForm onDone={reload} />
        </>
      ) : !t ? <p className="text-sm text-slate-500 bg-white rounded-xl border border-slate-200 p-4">{fr ? 'Seuls les étudiants actifs peuvent proposer un sujet.' : 'Only active students can propose a topic.'}</p> : editing ? (
        <ProposalForm initial={t} onDone={() => { setEditing(false); reload(); }} onCancel={() => setEditing(false)} />
      ) : (
        <>
          <section className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1"><h2 className="text-lg font-semibold text-slate-800 break-words">{t.title}</h2><p className="text-xs text-slate-500">{KIND[t.kind][fr ? 1 : 0]}{t.keywords ? ` · ${t.keywords}` : ''}</p></div>
              <ThesisStatusBadge status={t.status} />
            </div>
            <Stepper status={t.status} />
            {t.abstract && <p className="text-sm text-slate-600 whitespace-pre-line break-words">{t.abstract}</p>}
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div><p className="text-xs text-slate-500">{fr ? 'Encadrant' : 'Supervisor'}</p><p className="text-slate-800">{t.supervisor?.name ?? (fr ? 'Non assigné' : 'Not assigned yet')}{t.co_supervisor ? ` · ${t.co_supervisor.name}` : ''}</p></div>
              {t.decision_note && t.status !== 'completed' && <div><p className="text-xs text-slate-500">{fr ? 'Note de la scolarité' : 'Office note'}</p><p className="text-slate-800 break-words">{t.decision_note}</p></div>}
            </div>
            <div className="flex flex-wrap gap-2">
              {t.status === 'proposed' && <button className={btnGhost} onClick={() => setEditing(true)}>{fr ? 'Modifier la proposition' : 'Edit proposal'}</button>}
              {t.status === 'in_progress' && <><input ref={general} type="file" className="hidden" aria-label="Upload document" onChange={e => void uploadGeneral(e.target.files?.[0])} /><button className={btnGhost} onClick={() => general.current?.click()}><Upload size={14} /> {fr ? 'Déposer un document' : 'Upload a document'}</button></>}
              {t.status === 'in_progress' && <button className={btnPrimary} disabled={!allAccepted} title={allAccepted ? '' : (fr ? 'Tous les jalons doivent être validés' : 'All milestones must be accepted first')} onClick={() => setConfirm('final')}>{fr ? 'Déposer la version finale' : 'Submit final version'}</button>}
              {['proposed', 'supervisor_accepted', 'approved', 'in_progress'].includes(t.status) && <button className="text-sm text-red-600 hover:underline px-2" onClick={() => setConfirm('withdraw')}>{fr ? 'Retirer mon dossier' : 'Withdraw'}</button>}
            </div>
            {t.status === 'in_progress' && !allAccepted && <p className="text-xs text-slate-400">{fr ? 'La version finale ne peut être déposée que lorsque tous les jalons sont validés et qu’au moins un fichier est remis.' : 'The final version can only be submitted once every milestone is accepted and at least one file was uploaded.'}</p>}
          </section>
          <DefenceBox t={t} />
          {t.status === 'completed' && !t.defence && <p className="text-sm font-semibold text-emerald-700">{t.final_score}/100 · {t.final_grade}</p>}
          <section className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
            <h3 className="font-semibold text-slate-800 mb-1">{fr ? 'Jalons' : 'Milestones'}</h3>
            {t.milestones.length ? <ul className="divide-y divide-slate-100">{t.milestones.map(m => <MilestoneRow key={m.id} t={t} m={m} reload={reload} setErr={setErr} />)}</ul> : <p className="text-sm text-slate-400">{fr ? 'Votre encadrant n’a pas encore défini de jalons.' : 'Your supervisor has not defined milestones yet.'}</p>}
          </section>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5"><h3 className="font-semibold text-slate-800 mb-1">{fr ? 'Historique des dépôts' : 'Submission history'}</h3><SubmissionList items={t.submissions} milestones={t.milestones} empty={fr ? 'Aucun dépôt.' : 'Nothing uploaded yet.'} /></section>
            <section className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5"><h3 className="font-semibold text-slate-800 mb-2">{fr ? 'Suivi' : 'Activity'}</h3><Timeline events={t.events} /></section>
          </div>
        </>
      )}
      {d && d.past.length > 0 && <p className="text-xs text-slate-400">{fr ? 'Dossiers précédents' : 'Earlier files'}: {d.past.length}</p>}
      {confirm && t && (
        <Modal title={confirm === 'withdraw' ? (fr ? 'Retirer mon dossier ?' : 'Withdraw this thesis?') : (fr ? 'Déposer la version finale ?' : 'Submit the final version?')} onClose={() => setConfirm(null)}>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">{confirm === 'withdraw' ? (fr ? 'Cette action est définitive ; vous pourrez proposer un nouveau sujet ensuite.' : 'This cannot be undone; you can propose a new topic afterwards.') : (fr ? 'Vous ne pourrez plus déposer de fichiers ensuite.' : 'You will not be able to upload files afterwards.')}</p>
            <Field label={confirm === 'withdraw' ? (fr ? 'Motif (facultatif)' : 'Reason (optional)') : (fr ? 'Note (facultatif)' : 'Note (optional)')}><textarea className={`${input} w-full`} rows={3} value={reason} onChange={e => setReason(e.target.value)} /></Field>
            <div className="flex justify-end gap-2"><button className={btnGhost} onClick={() => setConfirm(null)}>{fr ? 'Annuler' : 'Cancel'}</button><button className={confirm === 'withdraw' ? btnDanger : btnPrimary} disabled={busy} onClick={act}>{busy ? '…' : fr ? 'Confirmer' : 'Confirm'}</button></div>
          </div>
        </Modal>
      )}
    </div>
  );
}
