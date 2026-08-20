import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { Mark, Term, AcademicYear } from '../../api/client';

const GRADE_COLOR: Record<string, string> = {
  A: 'text-emerald-600', B: 'text-blue-600', C: 'text-amber-600', D: 'text-orange-600', F: 'text-red-600',
};

// A university term is a semester — only "first"/"second" ever surface here,
// regardless of any legacy "third" term data left over from the old
// trimester-based school model.
const SEMESTER_LABEL: Record<string, string> = { first: 'First Semester', second: 'Second Semester' };

type Filter = 'normal' | 'resit';

export default function StudentMarks() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [yearId, setYearId] = useState('');
  const [terms, setTerms] = useState<Term[]>([]);
  const [termId, setTermId] = useState('');
  const [marks, setMarks] = useState<Mark[]>([]);
  const [filter, setFilter] = useState<Filter>('normal');

  useEffect(() => {
    api.getYears().then(ys => {
      setYears(ys);
      const current = ys.find(y => y.is_current);
      setYearId(current?.id ?? ys[0]?.id ?? '');
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!yearId) { setTerms([]); setTermId(''); return; }
    api.getTerms(yearId).then(ts => {
      const semesters = ts.filter(t => t.name === 'first' || t.name === 'second');
      setTerms(semesters);
      const current = semesters.find(t => t.is_current);
      setTermId(current?.id ?? semesters[0]?.id ?? '');
    }).catch(() => {});
  }, [yearId]);

  useEffect(() => {
    if (!termId) { setMarks([]); return; }
    api.portalStudentMarks(termId).then(setMarks).catch(() => {});
    setFilter('normal');
  }, [termId]);

  const normalAvg = marks.length ? Math.round(marks.reduce((s, m) => s + m.total_score, 0) / marks.length) : null;
  const resits = marks.filter(m => m.resit_score != null);
  const resitAvg = resits.length ? Math.round(resits.reduce((s, m) => s + (m.resit_score ?? 0), 0) / resits.length) : null;

  const visibleMarks = filter === 'resit' ? resits : marks;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">My Marks</h1>
        <div className="flex items-center gap-2">
          <select value={yearId} onChange={e => setYearId(e.target.value)}
            className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {years.map(y => <option key={y.id} value={y.id}>{y.label} {y.is_current ? '(current)' : ''}</option>)}
          </select>
          <select value={termId} onChange={e => setTermId(e.target.value)} disabled={terms.length === 0}
            className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-60">
            {terms.length === 0 && <option value="">No semesters</option>}
            {terms.map(t => (
              <option key={t.id} value={t.id}>{SEMESTER_LABEL[t.name] ?? t.name} {t.is_current ? '(current)' : ''}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => setFilter('normal')}
          className={`text-left rounded-xl p-4 flex items-center gap-4 border transition-colors cursor-pointer
            ${filter === 'normal'
              ? 'bg-emerald-600 border-emerald-600 shadow-md'
              : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 hover:border-emerald-400'}`}
        >
          <div className="text-center">
            <p className={`text-3xl font-bold ${filter === 'normal' ? 'text-white' : 'text-emerald-600'}`}>{marks.length}</p>
            <p className={`text-xs ${filter === 'normal' ? 'text-emerald-100' : 'text-emerald-600'}`}>Normal Session Exams</p>
          </div>
          <div className={`text-sm ${filter === 'normal' ? 'text-emerald-100' : 'text-emerald-700 dark:text-emerald-400'}`}>
            {normalAvg !== null ? `Avg ${normalAvg}%` : 'No marks yet'}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilter('resit')}
          className={`text-left rounded-xl p-4 flex items-center gap-4 border transition-colors cursor-pointer
            ${filter === 'resit'
              ? 'bg-amber-600 border-amber-600 shadow-md'
              : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 hover:border-amber-400'}`}
        >
          <div className="text-center">
            <p className={`text-3xl font-bold ${filter === 'resit' ? 'text-white' : 'text-amber-600'}`}>{resits.length}</p>
            <p className={`text-xs ${filter === 'resit' ? 'text-amber-100' : 'text-amber-600'}`}>Resit Exams</p>
          </div>
          <div className={`text-sm ${filter === 'resit' ? 'text-amber-100' : 'text-amber-700 dark:text-amber-400'}`}>
            {resitAvg !== null ? `Avg ${resitAvg}%` : 'No resits this semester'}
          </div>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700/50">
            <tr>
              {['Course', 'CA (40)', 'Exam (60)', 'Total', 'Grade', 'Remark', 'Resit'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {visibleMarks.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  {filter === 'resit' ? 'No resits this semester.' : 'No marks for this semester.'}
                </td>
              </tr>
            )}
            {visibleMarks.map(m => (
              <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{m.subject_name}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{m.ca_score}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{m.exam_score}</td>
                <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{m.total_score}</td>
                <td className="px-4 py-3">
                  <span className={`font-bold ${GRADE_COLOR[m.grade?.[0]] ?? 'text-slate-600'}`}>{m.grade ?? '—'}</span>
                </td>
                <td className="px-4 py-3 text-slate-500">{m.remark ?? '—'}</td>
                <td className="px-4 py-3">
                  {m.resit_score != null ? (
                    <span className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{m.resit_score}</span>
                      <span className={`font-bold text-xs ${GRADE_COLOR[m.resit_grade?.[0] ?? ''] ?? 'text-slate-600'}`}>{m.resit_grade}</span>
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
