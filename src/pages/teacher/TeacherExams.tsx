import { useState } from 'react';
import { acad, type Exam } from '../../api/academics';
import { Badge, ErrorBox, Modal, PageHeader, Spinner, StatusBadge, Table, btnGhost, fmtDate, msg, useLoad } from '../../composants/academics/ui';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';

/** Exams of the courses I teach and the sessions I invigilate; invigilators record who sat the exam. */
export default function TeacherExams() {
  const { lang } = useLanguage(); const fr = lang === 'fr'; useAuth();
  const list = useLoad(() => acad.exams());
  const [open, setOpen] = useState<Exam | null>(null);
  return (
    <div className="space-y-5">
      <PageHeader title={fr ? 'Examens & surveillance' : 'Exams & invigilation'} onRefresh={() => void list.reload()} />
      <ErrorBox message={list.error} />
      {!list.data ? <Spinner /> : (
        <Table min={760} head={[fr ? 'Examen' : 'Exam', 'Date', fr ? 'Horaire' : 'Time', fr ? 'Salle' : 'Room', fr ? 'Statut' : 'Status', '']} empty={list.data.length ? undefined : (fr ? 'Aucun examen ne vous concerne' : 'No exams concern you')}>
          {list.data.map(e => (
            <tr key={e.id}><td className="px-4 py-3"><p className="font-medium text-slate-800">{e.title}</p><p className="text-xs text-slate-400">{e.code}</p></td><td className="px-4 py-3">{fmtDate(e.date, lang)}</td><td className="px-4 py-3">{e.start_time}–{e.end_time}</td><td className="px-4 py-3">{e.room ?? '—'}</td><td className="px-4 py-3"><StatusBadge status={e.status} /></td>
              <td className="px-4 py-3 text-right"><button className={btnGhost} onClick={() => setOpen(e)}>{fr ? 'Candidats' : 'Candidates'}</button></td></tr>
          ))}
        </Table>
      )}
      {open && <Candidates exam={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function Candidates({ exam, onClose }: { exam: Exam; onClose: () => void }) {
  const { lang } = useLanguage(); const fr = lang === 'fr';
  const c = useLoad(() => acad.candidates(exam.id));
  const [err, setErr] = useState('');
  const mark = async (studentId: string, attendance: 'present' | 'absent') => {
    try { const r = await acad.examAttendance(exam.id, [{ student_id: studentId, attendance }]); setErr(r.skipped[0]?.error ?? ''); void c.reload(); } catch (e) { setErr(msg(e)); }
  };
  return (
    <Modal wide title={exam.title} onClose={onClose}>
      <ErrorBox message={err || c.error} />
      {!c.data ? <Spinner /> : (
        <Table min={560} head={[fr ? 'Étudiant' : 'Student', fr ? 'Éligibilité' : 'Eligibility', fr ? 'Présence' : 'Attendance', '']} empty={c.data.candidates.length ? undefined : (fr ? 'La liste n’a pas encore été générée.' : 'The candidate list has not been generated yet.')}>
          {c.data.candidates.map(x => (
            <tr key={x.id}><td className="px-4 py-2.5"><p className="font-medium text-slate-800">{x.name}</p><p className="text-xs text-slate-400">{x.matricule}</p></td>
              <td className="px-4 py-2.5">{x.eligible ? <Badge tone="green">{fr ? 'éligible' : 'eligible'}</Badge> : <Badge tone="red">{fr ? 'non éligible' : 'not eligible'}</Badge>}</td>
              <td className="px-4 py-2.5">{x.attendance ? <Badge tone={x.attendance === 'present' ? 'green' : 'amber'}>{x.attendance}</Badge> : '—'}</td>
              <td className="px-4 py-2.5"><div className="flex gap-1 justify-end"><button className={btnGhost} onClick={() => mark(x.student_id, 'present')}>{fr ? 'Présent' : 'Present'}</button><button className={btnGhost} onClick={() => mark(x.student_id, 'absent')}>{fr ? 'Absent' : 'Absent'}</button></div></td></tr>
          ))}
        </Table>
      )}
      <p className="text-xs text-slate-400 mt-3">{fr ? 'Seuls les surveillants désignés peuvent enregistrer la présence.' : 'Only the assigned invigilators can record attendance.'}</p>
    </Modal>
  );
}
