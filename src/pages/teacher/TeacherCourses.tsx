import { useEffect, useState } from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import { acad, type LecturerOffering, type RosterStudent } from '../../api/academics';
import { Badge, ErrorBox, PageHeader, Spinner, StatusBadge, btnGhost, btnPrimary, dayLabel, input, msg, useLoad } from '../../composants/academics/ui';
import { useLanguage } from '../../i18n/LanguageContext';

export default function TeacherCourses() {
  const { lang } = useLanguage(); const fr = lang === 'fr';
  const [open, setOpen] = useState<LecturerOffering | null>(null);
  const list = useLoad(() => acad.myOfferings());
  if (open) return <Marks offering={open} onBack={() => { setOpen(null); void list.reload(); }} />;
  return (
    <div className="space-y-5">
      <PageHeader title={fr ? 'Mes cours' : 'My courses'} subtitle={fr ? 'Les cours que vous enseignez, leurs inscrits et la saisie des notes' : 'The courses you teach, who is registered, and mark entry'} onRefresh={() => void list.reload()} />
      <ErrorBox message={list.error} />
      {!list.data ? <Spinner /> : list.data.length === 0 ? (
        <p className="text-sm text-slate-400 bg-white rounded-xl border border-slate-200 p-8 text-center">{fr ? 'Aucun cours ne vous est attribué.' : 'No course is assigned to you.'}</p>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {list.data.map(o => (
            <button key={o.id} onClick={() => setOpen(o)} className="text-left bg-white rounded-xl border border-slate-200 p-4 hover:border-indigo-300 hover:shadow-sm transition space-y-2">
              <div><h3 className="font-semibold text-slate-800">{o.course}</h3><p className="text-xs text-slate-400 font-mono">{o.code} · {fr ? 'Section' : 'Section'} {o.section} · {o.credits} cr</p></div>
              <p className="text-xs text-slate-500">{o.academic_year} · {o.term}</p>
              <p className="text-xs text-slate-500">{o.slots.map((s: { day: string; period?: string; period_key?: string }) => `${dayLabel(s.day, fr).slice(0, 3)} ${s.period ?? s.period_key}`).join(', ') || '—'}</p>
              <div className="flex flex-wrap gap-1.5"><Badge tone="indigo">{o.registered}{o.capacity != null ? `/${o.capacity}` : ''} {fr ? 'inscrits' : 'registered'}</Badge>
                {o.marks.draft > 0 && <Badge tone="slate">{o.marks.draft} {fr ? 'brouillon' : 'draft'}</Badge>}{o.marks.submitted > 0 && <Badge tone="amber">{o.marks.submitted} {fr ? 'soumises' : 'submitted'}</Badge>}{o.marks.published > 0 && <Badge tone="green">{o.marks.published} {fr ? 'publiées' : 'published'}</Badge>}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface Row extends RosterStudent { ca: string; exam: string; absent: boolean }

function Marks({ offering, onBack }: { offering: LecturerOffering; onBack: () => void }) {
  const { lang } = useLanguage(); const fr = lang === 'fr';
  const r = useLoad(() => acad.lecturerRoster(offering.id), [offering.id]);
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState(''); const [ok, setOk] = useState(''); const [busy, setBusy] = useState('');
  useEffect(() => { if (r.data) setRows(r.data.students.map(s => ({ ...s, ca: s.mark ? String(s.mark.ca_score) : '', exam: s.mark ? String(s.mark.exam_score) : '', absent: !!s.mark?.exam_absent }))); }, [r.data]);
  const editable = (s: RosterStudent) => !s.mark || s.mark.status === 'draft';
  const upd = (id: string, patch: Partial<Row>) => setRows(l => l.map(x => (x.student_id === id ? { ...x, ...patch } : x)));
  const bad = (v: string) => v !== '' && !(Number(v) >= 0 && Number(v) <= 100);
  const invalid = rows.some(x => editable(x) && (bad(x.ca) || bad(x.exam)));

  const save = async () => {
    setBusy('save'); setErr(''); setOk('');
    try {
      const marks = rows.filter(x => editable(x) && (x.ca !== '' || x.exam !== '' || x.absent)).map(x => ({ student_id: x.student_id, ca_score: Number(x.ca || 0), exam_score: Number(x.exam || 0), exam_absent: x.absent }));
      const res = await acad.saveMarks(offering.id, marks);
      setOk(fr ? `${res.saved} note(s) enregistrée(s) en brouillon.` : `${res.saved} mark(s) saved as drafts.`); if (res.skipped.length) setErr(res.skipped.map(s => s.error).join(' ')); void r.reload();
    } catch (e) { setErr(msg(e)); } finally { setBusy(''); }
  };
  const submit = async () => {
    setBusy('submit'); setErr(''); setOk('');
    try { const res = await acad.submitMarks(offering.id); setOk(fr ? `${res.moved} note(s) soumises pour validation${res.students_without_marks ? ` — ${res.students_without_marks} étudiant(s) sans note` : ''}.` : `${res.moved} mark(s) submitted for validation${res.students_without_marks ? ` — ${res.students_without_marks} student(s) have no mark yet` : ''}.`); void r.reload(); }
    catch (e) { setErr(msg(e)); } finally { setBusy(''); }
  };
  const drafts = rows.filter(x => x.mark?.status === 'draft').length;
  return (
    <div className="space-y-5">
      <button className={btnGhost} onClick={onBack}><ArrowLeft size={14} /> {fr ? 'Mes cours' : 'My courses'}</button>
      <PageHeader title={`${offering.course} · ${offering.section}`} subtitle={`${offering.academic_year} · ${offering.term}`}>
        <button className={btnGhost} disabled={!!busy || invalid || !rows.some(editable)} onClick={save}>{fr ? 'Enregistrer (brouillon)' : 'Save drafts'}</button>
        <button className={btnPrimary} disabled={!!busy || drafts === 0} onClick={submit}><Send size={14} /> {fr ? `Soumettre pour validation (${drafts})` : `Submit for validation (${drafts})`}</button>
      </PageHeader>
      <p className="text-xs text-slate-500">{fr ? 'Les notes sont des brouillons : elles ne sont visibles des étudiants qu’après validation et publication par l’administration. Une fois soumises, vous ne pouvez plus les modifier.' : 'Marks are drafts: students see them only after the administration validates and publishes them. Once submitted you can no longer edit them.'}</p>
      <ErrorBox message={err || r.error} />{ok && <p role="status" className="text-sm text-emerald-700">{ok}</p>}
      {!r.data ? <Spinner /> : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="text-left px-4 py-3">{fr ? 'Étudiant' : 'Student'}</th><th className="px-2">CA /100</th><th className="px-2">{fr ? 'Examen' : 'Exam'} /100</th><th className="px-2">{fr ? 'Absent' : 'Absent'}</th><th className="px-2">Total</th><th className="px-2">{fr ? 'Note' : 'Grade'}</th><th className="px-2">{fr ? 'Statut' : 'Status'}</th><th className="px-2">{fr ? 'Examen autorisé' : 'Exam cleared'}</th></tr></thead>
            <tbody className="divide-y divide-slate-100 text-center">
              {rows.map(x => (
                <tr key={x.student_id}>
                  <td className="px-4 py-2 text-left"><p className="font-medium text-slate-800">{x.name}</p><p className="text-xs text-slate-400">{x.matricule}</p></td>
                  <td><input aria-label={`CA ${x.name}`} type="number" min={0} max={100} disabled={!editable(x)} className={`${input} w-20 text-center ${bad(x.ca) ? 'border-red-400' : ''}`} value={x.ca} onChange={e => upd(x.student_id, { ca: e.target.value })} /></td>
                  <td><input aria-label={`Exam ${x.name}`} type="number" min={0} max={100} disabled={!editable(x) || x.absent} className={`${input} w-20 text-center ${bad(x.exam) ? 'border-red-400' : ''}`} value={x.absent ? '' : x.exam} onChange={e => upd(x.student_id, { exam: e.target.value })} /></td>
                  <td><input aria-label={`Absent ${x.name}`} type="checkbox" disabled={!editable(x)} checked={x.absent} onChange={e => upd(x.student_id, { absent: e.target.checked })} /></td>
                  <td className="font-medium">{x.mark?.total_score ?? '—'}</td><td className="font-semibold">{x.mark?.grade ?? '—'}</td>
                  <td>{x.mark ? <StatusBadge status={x.mark.status} /> : '—'}</td>
                  <td>{x.exam_eligible === null ? '—' : x.exam_eligible ? <Badge tone="green">✓</Badge> : <Badge tone="red">✗</Badge>}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={8} className="px-4 py-10 text-slate-400">{fr ? 'Aucun étudiant inscrit à ce cours.' : 'Nobody is registered for this course yet.'}</td></tr>}
            </tbody></table>
        </div>
      )}
    </div>
  );
}
