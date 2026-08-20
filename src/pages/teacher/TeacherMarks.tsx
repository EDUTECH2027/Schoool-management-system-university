import { useEffect, useState } from 'react';
import { Save, Lock, Unlock } from 'lucide-react';
import { api } from '../../api/client';
import type { ClassRecord, Student, Mark, Term, Subject, MarksSession } from '../../api/client';

interface MarkRow { student_id: string; student_name: string; student_number: string; subject_id: string; subject_name: string; ca_score: number; exam_score: number; }

export default function TeacherMarks() {
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classId, setClassId] = useState('');
  const [termId, setTermId] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [rows, setRows] = useState<MarkRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [session, setSession] = useState<{ isOpen: boolean; session: MarksSession | null }>({ isOpen: false, session: null });

  useEffect(() => {
    Promise.all([api.portalTeacherClasses(), api.getTerms(), api.getSubjects()])
      .then(([cls, trm, subj]) => {
        setClasses(cls);
        setTerms(trm);
        setSubjects(subj);
        if (cls[0]) setClassId(cls[0].id);
        if (trm[0]) setTermId(trm[0].id);
        if (subj[0]) { setSubjectId(subj[0].id); setSubjectName(subj[0].name); }
      }).catch(() => {});
    api.getCurrentMarksSession().then(setSession).catch(() => {});
  }, []);

  useEffect(() => {
    if (!classId) return;
    api.getClassStudents(classId).then(setStudents).catch(() => {});
  }, [classId]);

  useEffect(() => {
    if (!classId || !termId || !subjectId) return;
    api.portalTeacherMarks(classId, termId).then((marks: Mark[]) => {
      setRows(students.map(s => {
        const existing = marks.find(m => m.student_id === s.id && m.subject_id === subjectId);
        return { student_id: s.id, student_name: `${s.first_name} ${s.last_name}`, student_number: s.student_number, subject_id: subjectId, subject_name: subjectName, ca_score: existing?.ca_score ?? 0, exam_score: existing?.exam_score ?? 0 };
      }));
    }).catch(() => {});
  }, [classId, termId, subjectId, subjectName, students]);

  const update = (idx: number, field: 'ca_score' | 'exam_score', val: string) => {
    setRows(r => r.map((row, i) => i === idx ? { ...row, [field]: Math.min(100, Math.max(0, Number(val) || 0)) } : row));
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await api.portalTeacherSaveMarks(classId, termId, rows);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save marks');
      // The session may have just closed — refresh the banner so it's not stale.
      api.getCurrentMarksSession().then(setSession).catch(() => {});
    } finally { setSaving(false); }
  };

  const locked = !session.isOpen;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Mark Entry</h1>

      {locked ? (
        <div className="flex items-center gap-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm rounded-lg px-4 py-3">
          <Lock size={16} className="shrink-0" />
          Marks filling is currently closed. Ask an admin to open a new session before you can save marks — you can still view what's already recorded below.
        </div>
      ) : (
        <div className="flex items-center gap-2.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-sm rounded-lg px-4 py-3">
          <Unlock size={16} className="shrink-0" />
          Marks filling is open{session.session ? ` until ${new Date(session.session.end_at).toLocaleString()}` : ''}.
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <select value={classId} onChange={e => setClassId(e.target.value)} className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={termId} onChange={e => setTermId(e.target.value)} className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          {terms.map(t => <option key={t.id} value={t.id}>Semester {t.name === 'first' ? 1 : t.name === 'second' ? 2 : 3} {t.is_current ? '· current' : ''}</option>)}
        </select>
        <select value={subjectId} onChange={e => { setSubjectId(e.target.value); setSubjectName(subjects.find(s => s.id === e.target.value)?.name ?? ''); }}
          className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name} (coef. {s.coefficient})</option>)}
        </select>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700/50">
            <tr>
              {['Student', 'No.', 'CA (40%)', 'Exams (60%)', 'Total /100'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {rows.map((row, i) => (
              <tr key={row.student_id}>
                <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{row.student_name}</td>
                <td className="px-4 py-3 text-slate-500">{row.student_number}</td>
                <td className="px-4 py-2">
                  <input type="number" min={0} max={100} value={row.ca_score} disabled={locked} onChange={e => update(i, 'ca_score', e.target.value)}
                    className="w-20 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed" />
                </td>
                <td className="px-4 py-2">
                  <input type="number" min={0} max={100} value={row.exam_score} disabled={locked} onChange={e => update(i, 'exam_score', e.target.value)}
                    className="w-20 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed" />
                </td>
                <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{Math.round(row.ca_score * 0.4 + row.exam_score * 0.6)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button onClick={save} disabled={saving || locked || rows.length === 0}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
        <Save size={15} /> {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Marks'}
      </button>
    </div>
  );
}
