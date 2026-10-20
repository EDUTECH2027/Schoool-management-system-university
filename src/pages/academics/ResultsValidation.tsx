import { useState } from 'react';
import { Eye, History } from 'lucide-react';
import { api } from '../../api/client';
import { acad, type Batch } from '../../api/academics';
import { mapTerm } from '../../api/mappers';
import { Badge, ErrorBox, Field, Modal, PageHeader, Spinner, StatusBadge, Table, Tabs, btnDanger, btnGhost, btnPrimary, fmtDateTime, input, msg, useFr, useLoad } from '../../composants/academics/ui';
import { useLanguage } from '../../i18n/LanguageContext';

export default function ResultsValidation() {
  const fr = useFr();
  const [tab, setTab] = useState<'queue' | 'appeals'>('queue');
  const appeals = useLoad(() => acad.appeals('submitted'));
  return (
    <div className="space-y-5">
      <PageHeader title={fr ? 'Validation des résultats' : 'Results validation'} subtitle={fr ? 'Les notes saisies par les enseignants ne sont visibles des étudiants qu’une fois publiées.' : 'Marks entered by lecturers are visible to students only once published.'} />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'queue', label: fr ? 'File de validation' : 'Validation queue' }, { id: 'appeals', label: fr ? 'Réclamations' : 'Grade appeals', badge: appeals.data?.length }]} />
      {tab === 'queue' ? <Queue /> : <Appeals onChange={() => void appeals.reload()} />}
    </div>
  );
}

function Queue() {
  const fr = useFr();
  const terms = useLoad(async () => (await api.getTerms()).map(mapTerm));
  const [termId, setTermId] = useState('');
  const tid = termId || terms.data?.find(t => t.isCurrent)?.id || terms.data?.[0]?.id || '';
  const batches = useLoad(() => (tid ? acad.batches(tid) : Promise.resolve([])), [tid]);
  const [open, setOpen] = useState<Batch | null>(null);
  return (
    <div className="space-y-3">
      <select aria-label="Semester" className={input} value={tid} onChange={e => setTermId(e.target.value)}>{terms.data?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
      <ErrorBox message={batches.error} />
      {!batches.data ? <Spinner /> : (
        <Table min={760} head={[fr ? 'Cours' : 'Course', fr ? 'Enseignant(s)' : 'Lecturer(s)', fr ? 'Brouillon' : 'Draft', fr ? 'Soumis' : 'Submitted', fr ? 'Approuvé' : 'Approved', fr ? 'Publié' : 'Published', '']} empty={batches.data.length ? undefined : (fr ? 'Aucune note saisie ce semestre' : 'No marks entered this semester')}>
          {batches.data.map(b => (
            <tr key={`${b.subject_id}|${b.term_id}`}>
              <td className="px-4 py-3"><p className="font-medium text-slate-800">{b.course}</p><p className="text-xs text-slate-400 font-mono">{b.code}</p></td>
              <td className="px-4 py-3 text-slate-600">{b.lecturers.join(', ') || '—'}</td>
              <td className="px-4 py-3">{b.draft || '—'}</td>
              <td className="px-4 py-3">{b.submitted ? <Badge tone="amber">{b.submitted}</Badge> : '—'}</td>
              <td className="px-4 py-3">{b.approved ? <Badge tone="blue">{b.approved}</Badge> : '—'}</td>
              <td className="px-4 py-3">{b.published ? <Badge tone="green">{b.published}</Badge> : '—'}</td>
              <td className="px-4 py-3 text-right"><button className={btnGhost} onClick={() => setOpen(b)}><Eye size={14} /> {fr ? 'Examiner' : 'Review'}</button></td>
            </tr>
          ))}
        </Table>
      )}
      {open && <BatchModal batch={open} onClose={() => setOpen(null)} onChanged={() => void batches.reload()} />}
    </div>
  );
}

function BatchModal({ batch, onClose, onChanged }: { batch: Batch; onClose: () => void; onChanged: () => void }) {
  const { lang } = useLanguage(); const fr = lang === 'fr';
  const marks = useLoad(() => acad.batchMarks(batch.subject_id, batch.term_id), [batch.subject_id, batch.term_id]);
  const [reason, setReason] = useState(''); const [err, setErr] = useState(''); const [ok, setOk] = useState(''); const [busy, setBusy] = useState('');
  const [hist, setHist] = useState<{ name: string; rows: Awaited<ReturnType<typeof acad.markHistory>> } | null>(null);
  const count = (s: string) => marks.data?.filter(m => m.status === s).length ?? 0;
  const run = async (action: string) => {
    setBusy(action); setErr(''); setOk('');
    try { const r = await acad.transition({ action, subject_id: batch.subject_id, term_id: batch.term_id, reason: reason || undefined }); setOk(fr ? `${r.moved} note(s) mises à jour.` : `${r.moved} mark(s) updated.`); setReason(''); void marks.reload(); onChanged(); }
    catch (e) { setErr(msg(e)); } finally { setBusy(''); }
  };
  const needReason = !reason.trim();
  return (
    <Modal wide title={`${batch.course} · ${batch.term}`} onClose={onClose}>
      <ErrorBox message={err || marks.error} />{ok && <p className="text-sm text-emerald-600 mb-2">{ok}</p>}
      {!marks.data ? <Spinner /> : (
        <>
          <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-lg">
            <table className="w-full text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500 sticky top-0"><tr><th className="text-left px-3 py-2">{fr ? 'Étudiant' : 'Student'}</th><th className="px-3 py-2">CA</th><th className="px-3 py-2">{fr ? 'Examen' : 'Exam'}</th><th className="px-3 py-2">Total</th><th className="px-3 py-2">{fr ? 'Note' : 'Grade'}</th><th className="px-3 py-2">{fr ? 'Statut' : 'Status'}</th><th /></tr></thead>
              <tbody className="divide-y divide-slate-100 text-center">{marks.data.map(m => (
                <tr key={m.id}><td className="px-3 py-2 text-left"><p className="text-slate-800">{m.student_name}</p><p className="text-xs text-slate-400">{m.student_number}</p></td><td>{m.ca_score}</td><td>{m.exam_absent ? (fr ? 'Absent' : 'Absent') : m.exam_score}</td><td className="font-medium">{m.total_score}</td><td>{m.grade}</td><td><StatusBadge status={m.status} /></td>
                  <td><button aria-label="History" className="p-1.5 text-slate-400 hover:text-indigo-600" onClick={async () => setHist({ name: m.student_name ?? '', rows: await acad.markHistory(m.id) })}><History size={14} /></button></td></tr>))}</tbody></table>
          </div>
          <Field label={fr ? 'Motif (obligatoire pour refuser ou rouvrir)' : 'Reason (required to reject or reopen)'}><input className={`${input} w-full mt-3`} value={reason} onChange={e => setReason(e.target.value)} /></Field>
          <div className="flex flex-wrap gap-2 pt-3">
            <button className={btnPrimary} disabled={!count('submitted') || !!busy} onClick={() => run('approve')}>{fr ? `Approuver (${count('submitted')})` : `Approve (${count('submitted')})`}</button>
            <button className={btnPrimary} disabled={!count('approved') || !!busy} onClick={() => run('publish')}>{fr ? `Publier (${count('approved')})` : `Publish (${count('approved')})`}</button>
            <button className={btnDanger} disabled={needReason || (!count('submitted') && !count('approved')) || !!busy} onClick={() => run('reject')}>{fr ? 'Renvoyer à l’enseignant' : 'Send back to lecturer'}</button>
            <button className={btnGhost} disabled={needReason || !count('published') || !!busy} onClick={() => run('reopen')}>{fr ? 'Rouvrir les notes publiées' : 'Reopen published'}</button>
          </div>
        </>
      )}
      {hist && (
        <Modal title={`${fr ? 'Historique' : 'History'} · ${hist.name}`} onClose={() => setHist(null)}>
          <ol className="space-y-2 text-sm">{hist.rows.map(h => <li key={h.id} className="border-l-2 border-indigo-200 pl-3"><p className="font-medium text-slate-800">{h.action}{h.to_status && ` → ${h.to_status}`}</p><p className="text-xs text-slate-500">{h.actor_name ?? '—'} ({h.actor_role}) · {fmtDateTime(h.created_at, lang)}</p>{h.reason && <p className="text-xs text-slate-600 mt-0.5">“{h.reason}”</p>}</li>)}</ol>
        </Modal>
      )}
    </Modal>
  );
}

function Appeals({ onChange }: { onChange: () => void }) {
  const { lang } = useLanguage(); const fr = lang === 'fr';
  const [status, setStatus] = useState('submitted');
  const list = useLoad(() => acad.appeals(status || undefined), [status]);
  const [sel, setSel] = useState<{ id: string; name: string; course: string; ca: number; exam: number } | null>(null);
  const [f, setF] = useState({ note: '', ca: '', exam: '' }); const [err, setErr] = useState('');
  const decide = async (decision: 'uphold' | 'reject' | 'review') => {
    try {
      await acad.decideAppeal(sel!.id, { decision, note: f.note || undefined, ...(decision === 'uphold' && f.ca !== '' ? { new_ca: Number(f.ca) } : {}), ...(decision === 'uphold' && f.exam !== '' ? { new_exam: Number(f.exam) } : {}) });
      setSel(null); setErr(''); void list.reload(); onChange();
    } catch (e) { setErr(msg(e)); }
  };
  return (
    <div className="space-y-3">
      <select aria-label="Status" className={input} value={status} onChange={e => setStatus(e.target.value)}>{['submitted', 'under_review', 'upheld', 'rejected', ''].map(s => <option key={s} value={s}>{s ? s.replace('_', ' ') : (fr ? 'Toutes' : 'All')}</option>)}</select>
      <ErrorBox message={list.error} />
      {!list.data ? <Spinner /> : (
        <Table min={760} head={[fr ? 'Étudiant' : 'Student', fr ? 'Cours' : 'Course', fr ? 'Note actuelle' : 'Current mark', fr ? 'Motif' : 'Reason', fr ? 'Statut' : 'Status', '']} empty={list.data.length ? undefined : (fr ? 'Aucune réclamation' : 'No appeals')}>
          {list.data.map(a => (
            <tr key={a.id}><td className="px-4 py-3"><p className="font-medium text-slate-800">{a.student}</p><p className="text-xs text-slate-400">{a.matricule}</p></td><td className="px-4 py-3">{a.course}</td>
              <td className="px-4 py-3">{a.total_score} ({a.grade})</td><td className="px-4 py-3 text-slate-600 max-w-xs">{a.reason}</td><td className="px-4 py-3"><StatusBadge status={a.status} /></td>
              <td className="px-4 py-3 text-right">{['submitted', 'under_review'].includes(a.status) && <button className={btnGhost} onClick={() => { setF({ note: '', ca: '', exam: '' }); setSel({ id: a.id, name: a.student, course: a.course, ca: a.ca_score, exam: a.exam_score }); }}>{fr ? 'Traiter' : 'Decide'}</button>}</td></tr>
          ))}
        </Table>
      )}
      {sel && (
        <Modal title={`${sel.name} · ${sel.course}`} onClose={() => setSel(null)}>
          <p className="text-sm text-slate-500 mb-3">{fr ? 'CA actuel' : 'Current CA'} {sel.ca} · {fr ? 'Examen' : 'Exam'} {sel.exam}</p>
          <div className="grid grid-cols-2 gap-3"><Field label={fr ? 'Nouveau CA (si accepté)' : 'New CA (if upheld)'}><input type="number" min={0} max={100} className={`${input} w-full`} value={f.ca} onChange={e => setF(s => ({ ...s, ca: e.target.value }))} /></Field><Field label={fr ? 'Nouvel examen' : 'New exam'}><input type="number" min={0} max={100} className={`${input} w-full`} value={f.exam} onChange={e => setF(s => ({ ...s, exam: e.target.value }))} /></Field></div>
          <div className="mt-3"><Field label={fr ? 'Décision motivée (obligatoire)' : 'Decision note (required)'}><textarea rows={3} className={`${input} w-full`} value={f.note} onChange={e => setF(s => ({ ...s, note: e.target.value }))} /></Field></div>
          <div className="mt-2"><ErrorBox message={err} /></div>
          <div className="flex flex-wrap justify-end gap-2 pt-3"><button className={btnGhost} onClick={() => decide('review')}>{fr ? 'Mettre en examen' : 'Mark under review'}</button><button className={btnDanger} disabled={!f.note.trim()} onClick={() => decide('reject')}>{fr ? 'Rejeter' : 'Reject'}</button><button className={btnPrimary} disabled={!f.note.trim()} onClick={() => decide('uphold')}>{fr ? 'Accepter' : 'Uphold'}</button></div>
        </Modal>
      )}
    </div>
  );
}
