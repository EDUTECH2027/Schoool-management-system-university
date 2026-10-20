import { useState } from 'react';
import { Plus, Pencil, Users, Ban, CheckCheck } from 'lucide-react';
import { api } from '../../api/client';
import { acad, type Candidate, type Conflict, type Exam } from '../../api/academics';
import { mapTerm } from '../../api/mappers';
import { Badge, ErrorBox, Field, Modal, PageHeader, Spinner, StatusBadge, Table, btnDanger, btnGhost, btnPrimary, fmtDate, input, msg, useFr, useLoad } from '../../composants/academics/ui';
import { useLanguage } from '../../i18n/LanguageContext';

export default function Exams() {
  const { lang } = useLanguage(); const fr = lang === 'fr';
  const terms = useLoad(async () => (await api.getTerms()).map(mapTerm));
  const [termId, setTermId] = useState('');
  const tid = termId || terms.data?.find(t => t.isCurrent)?.id || terms.data?.[0]?.id || '';
  const list = useLoad(() => (tid ? acad.exams({ termId: tid }) : Promise.resolve([])), [tid]);
  const [edit, setEdit] = useState<Partial<Exam> | null>(null);
  const [cand, setCand] = useState<Exam | null>(null);
  const [cancel, setCancel] = useState<Exam | null>(null); const [reason, setReason] = useState(''); const [err, setErr] = useState('');
  return (
    <div className="space-y-5">
      <PageHeader title={fr ? 'Examens' : 'Examinations'} subtitle={fr ? 'Planification, surveillants, listes de candidats et présence' : 'Scheduling, invigilators, candidate lists and attendance'} onRefresh={() => void list.reload()}>
        <select aria-label="Semester" className={input} value={tid} onChange={e => setTermId(e.target.value)}>{terms.data?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
        <button className={btnPrimary} disabled={!tid} onClick={() => setEdit({ term_id: tid, kind: 'final' })}><Plus size={14} /> {fr ? 'Planifier un examen' : 'Schedule an exam'}</button>
      </PageHeader>
      <ErrorBox message={err || list.error} />
      {!list.data ? <Spinner /> : (
        <Table min={900} head={[fr ? 'Examen' : 'Exam', 'Date', fr ? 'Horaire' : 'Time', fr ? 'Salle' : 'Room', fr ? 'Surveillants' : 'Invigilators', 'Candidats', fr ? 'Statut' : 'Status', '']} empty={list.data.length ? undefined : (fr ? 'Aucun examen planifié' : 'No exams scheduled')}>
          {list.data.map(e => (
            <tr key={e.id} className={e.status === 'cancelled' ? 'opacity-60' : ''}>
              <td className="px-4 py-3"><p className="font-medium text-slate-800">{e.title}</p><p className="text-xs text-slate-400">{e.code} · {e.kind}</p></td>
              <td className="px-4 py-3 whitespace-nowrap">{fmtDate(e.date, lang)}</td><td className="px-4 py-3 whitespace-nowrap">{e.start_time}–{e.end_time}</td><td className="px-4 py-3">{e.room ?? '—'}</td>
              <td className="px-4 py-3 text-slate-600 text-xs">{e.invigilators.map(i => i.name).join(', ') || '—'}</td><td className="px-4 py-3">{e.candidates}</td>
              <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
              <td className="px-4 py-3"><div className="flex gap-1 justify-end">
                <button aria-label="Candidates" title={fr ? 'Candidats' : 'Candidates'} className="p-1.5 text-slate-500 hover:text-indigo-600" onClick={() => setCand(e)}><Users size={15} /></button>
                {e.status === 'scheduled' && <>
                  <button aria-label="Edit" className="p-1.5 text-slate-500 hover:text-indigo-600" onClick={() => setEdit(e)}><Pencil size={15} /></button>
                  <button aria-label="Mark held" title={fr ? 'Marquer comme tenu' : 'Mark as held'} className="p-1.5 text-slate-500 hover:text-emerald-600" onClick={async () => { try { await acad.completeExam(e.id); void list.reload(); } catch (x) { setErr(msg(x)); } }}><CheckCheck size={15} /></button>
                  <button aria-label="Cancel exam" className="p-1.5 text-slate-500 hover:text-red-600" onClick={() => { setReason(''); setCancel(e); }}><Ban size={15} /></button></>}
              </div></td>
            </tr>
          ))}
        </Table>
      )}
      {edit && <ExamModal exam={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); void list.reload(); }} />}
      {cand && <CandidatesModal exam={cand} onClose={() => { setCand(null); void list.reload(); }} />}
      {cancel && (
        <Modal title={`${fr ? 'Annuler' : 'Cancel'} · ${cancel.title}`} onClose={() => setCancel(null)}>
          <Field label={fr ? 'Motif (obligatoire)' : 'Reason (required)'}><input className={`${input} w-full`} value={reason} onChange={e => setReason(e.target.value)} /></Field>
          <div className="flex justify-end gap-2 pt-4"><button className={btnGhost} onClick={() => setCancel(null)}>{fr ? 'Retour' : 'Back'}</button><button className={btnDanger} disabled={!reason.trim()} onClick={async () => { try { await acad.cancelExam(cancel.id, reason); void list.reload(); } catch (x) { setErr(msg(x)); } setCancel(null); }}>{fr ? 'Annuler l’examen' : 'Cancel exam'}</button></div>
        </Modal>
      )}
    </div>
  );
}

function ExamModal({ exam, onClose, onSaved }: { exam: Partial<Exam>; onClose: () => void; onSaved: () => void }) {
  const fr = useFr();
  const courses = useLoad(() => acad.courses({}));
  const teachers = useLoad(acad.teachers);
  const [f, setF] = useState({ subject_id: exam.subject_id ?? '', title: exam.title ?? '', kind: exam.kind ?? 'final', date: exam.date ?? '', start_time: exam.start_time ?? '09:00', end_time: exam.end_time ?? '11:00', room: exam.room ?? '', invigilator_ids: exam.invigilators?.map(i => i.id) ?? [] as string[] });
  const [err, setErr] = useState(''); const [conflicts, setConflicts] = useState<Conflict[]>([]); const [reason, setReason] = useState('');
  const set = (k: string, v: unknown) => setF(s => ({ ...s, [k]: v }));
  const save = async (override = false) => {
    setErr('');
    try {
      await acad.saveExam({ ...f, term_id: exam.term_id, room: f.room || null, ...(exam.id && { subject_id: undefined }), ...(override && { override: true, override_reason: reason }) }, exam.id);
      onSaved();
    } catch (e) {
      // a conflict comes back as 409 with the list in the message — re-ask with the reason box
      const m = msg(e); if (/already|registered for both/.test(m)) setConflicts(m.split(/(?<=\.)\s/).map(x => ({ type: 'conflict', message: x }))); else setErr(m);
    }
  };
  return (
    <Modal wide title={exam.id ? (fr ? 'Modifier l’examen' : 'Edit exam') : (fr ? 'Planifier un examen' : 'Schedule an exam')} onClose={onClose}>
      <div className="grid sm:grid-cols-2 gap-3">
        {!exam.id && <Field label={fr ? 'Cours' : 'Course'}><select className={`${input} w-full`} value={f.subject_id} onChange={e => { set('subject_id', e.target.value); if (!f.title) set('title', `${courses.data?.find(c => c.id === e.target.value)?.name ?? ''} — exam`); }}><option value="">—</option>{courses.data?.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}</select></Field>}
        <Field label={fr ? 'Intitulé' : 'Title'}><input className={`${input} w-full`} value={f.title} onChange={e => set('title', e.target.value)} /></Field>
        <Field label="Type"><select className={`${input} w-full`} value={f.kind} onChange={e => set('kind', e.target.value)}><option value="final">{fr ? 'Final' : 'Final'}</option><option value="midterm">{fr ? 'Partiel' : 'Midterm'}</option><option value="resit">{fr ? 'Rattrapage' : 'Resit'}</option></select></Field>
        <Field label="Date"><input type="date" className={`${input} w-full`} value={f.date} onChange={e => set('date', e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3"><Field label={fr ? 'Début' : 'Start'}><input type="time" className={`${input} w-full`} value={f.start_time} onChange={e => set('start_time', e.target.value)} /></Field><Field label={fr ? 'Fin' : 'End'}><input type="time" className={`${input} w-full`} value={f.end_time} onChange={e => set('end_time', e.target.value)} /></Field></div>
        <Field label={fr ? 'Salle' : 'Room'}><input className={`${input} w-full`} value={f.room} onChange={e => set('room', e.target.value)} /></Field>
        <div className="sm:col-span-2"><Field label={fr ? 'Surveillants' : 'Invigilators'}>
          <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-lg p-2 grid sm:grid-cols-2 gap-1">{teachers.data?.map(t => <label key={t.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.invigilator_ids.includes(t.id)} onChange={e => set('invigilator_ids', e.target.checked ? [...f.invigilator_ids, t.id] : f.invigilator_ids.filter(x => x !== t.id))} />{t.first_name} {t.last_name}</label>)}</div></Field></div>
      </div>
      <div className="mt-3 space-y-2">
        <ErrorBox message={err} />
        {conflicts.length > 0 && (
          <div className="border border-amber-300 bg-amber-50 rounded-lg p-3 space-y-2" role="alert">
            <p className="text-sm font-medium text-amber-800">{fr ? 'Conflits détectés :' : 'Conflicts detected:'}</p>
            <ul className="text-sm text-amber-800 list-disc pl-5">{conflicts.map((c, i) => <li key={i}>{c.message}</li>)}</ul>
            <input className={`${input} w-full`} placeholder={fr ? 'Motif pour passer outre (obligatoire)' : 'Reason to override (required)'} value={reason} onChange={e => setReason(e.target.value)} />
            <button className={btnPrimary} disabled={!reason.trim()} onClick={() => save(true)}>{fr ? 'Planifier malgré les conflits' : 'Schedule anyway'}</button>
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-4"><button className={btnGhost} onClick={onClose}>{fr ? 'Annuler' : 'Cancel'}</button><button className={btnPrimary} disabled={(!exam.id && !f.subject_id) || !f.title.trim() || !f.date} onClick={() => { setConflicts([]); void save(); }}>{fr ? 'Enregistrer' : 'Save'}</button></div>
    </Modal>
  );
}

function CandidatesModal({ exam, onClose }: { exam: Exam; onClose: () => void }) {
  const fr = useFr();
  const c = useLoad(() => acad.candidates(exam.id));
  const [err, setErr] = useState(''); const [info, setInfo] = useState('');
  const [ovr, setOvr] = useState<Candidate | null>(null); const [reason, setReason] = useState('');
  const generate = async () => { try { const r = await acad.genCandidates(exam.id); setInfo(fr ? `${r.created} ajoutés, ${r.updated} mis à jour, ${r.ineligible} non éligibles.` : `${r.created} added, ${r.updated} updated, ${r.ineligible} not eligible.`); setErr(''); void c.reload(); } catch (e) { setErr(msg(e)); } };
  const mark = async (studentId: string, attendance: 'present' | 'absent') => { try { const r = await acad.examAttendance(exam.id, [{ student_id: studentId, attendance }]); if (r.skipped[0]) setErr(r.skipped[0].error); else setErr(''); void c.reload(); } catch (e) { setErr(msg(e)); } };
  return (
    <Modal wide title={`${exam.title} · ${fr ? 'Candidats' : 'Candidates'}`} onClose={onClose}>
      <div className="flex flex-wrap gap-2 mb-3"><button className={btnPrimary} onClick={generate}>{fr ? 'Générer / actualiser la liste' : 'Generate / refresh list'}</button><span className="text-xs text-slate-400 self-center">{fr ? 'À partir des inscriptions validées et des règles d’éligibilité.' : 'From confirmed registrations and the eligibility rules.'}</span></div>
      <ErrorBox message={err || c.error} />{info && <p className="text-sm text-emerald-600 mb-2">{info}</p>}
      {!c.data ? <Spinner /> : (
        <Table min={640} head={[fr ? 'Étudiant' : 'Student', fr ? 'Éligibilité' : 'Eligibility', fr ? 'Présence' : 'Attendance', '']} empty={c.data.candidates.length ? undefined : (fr ? 'Aucun candidat — générez la liste.' : 'No candidates — generate the list.')}>
          {c.data.candidates.map(x => (
            <tr key={x.id}>
              <td className="px-4 py-2.5"><p className="font-medium text-slate-800">{x.name}</p><p className="text-xs text-slate-400">{x.matricule}</p></td>
              <td className="px-4 py-2.5">{x.eligible ? <Badge tone="green">{x.override_reason ? (fr ? 'autorisé (dérogation)' : 'cleared (override)') : (fr ? 'éligible' : 'eligible')}</Badge> : <div><Badge tone="red">{fr ? 'non éligible' : 'not eligible'}</Badge><p className="text-xs text-red-600 mt-1">{x.reasons?.map(r => r.message).join(' ')}</p></div>}</td>
              <td className="px-4 py-2.5">{x.attendance ? <Badge tone={x.attendance === 'present' ? 'green' : 'amber'}>{x.attendance === 'present' ? (fr ? 'présent' : 'present') : (fr ? 'absent' : 'absent')}</Badge> : '—'}</td>
              <td className="px-4 py-2.5"><div className="flex gap-1 justify-end">
                {!x.eligible && <button className={btnGhost} onClick={() => { setReason(''); setOvr(x); }}>{fr ? 'Autoriser' : 'Allow'}</button>}
                <button className={btnGhost} onClick={() => mark(x.student_id, 'present')}>{fr ? 'Présent' : 'Present'}</button><button className={btnGhost} onClick={() => mark(x.student_id, 'absent')}>{fr ? 'Absent' : 'Absent'}</button></div></td>
            </tr>
          ))}
        </Table>
      )}
      {ovr && (
        <Modal title={`${fr ? 'Autoriser' : 'Allow'} · ${ovr.name}`} onClose={() => setOvr(null)}>
          <p className="text-sm text-slate-600 mb-3">{ovr.reasons?.map(r => r.message).join(' ')}</p>
          <Field label={fr ? 'Motif (obligatoire, journalisé)' : 'Reason (required, logged)'}><input className={`${input} w-full`} value={reason} onChange={e => setReason(e.target.value)} /></Field>
          <div className="flex justify-end gap-2 pt-4"><button className={btnGhost} onClick={() => setOvr(null)}>{fr ? 'Annuler' : 'Cancel'}</button><button className={btnPrimary} disabled={!reason.trim()} onClick={async () => { try { await acad.overrideCandidate(exam.id, ovr.student_id, reason); void c.reload(); } catch (e) { setErr(msg(e)); } setOvr(null); }}>{fr ? 'Autoriser à composer' : 'Allow to sit'}</button></div>
        </Modal>
      )}
    </Modal>
  );
}
