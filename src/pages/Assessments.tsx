import { useState, useEffect } from 'react';
import { Save, FileText, BarChart2, CheckCircle2, XCircle, BookOpen } from 'lucide-react';
import type { Class, Student, Term, Subject } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { api } from '../api/client';
import { mapClass, mapStudent, mapTerm } from '../api/mappers';

type Filter = 'all' | 'passed' | 'failed';

const gradeColor: Record<string, string> = {
  'A+': 'bg-emerald-100 text-emerald-700', 'A': 'bg-green-100 text-green-700',
  'B':  'bg-blue-100 text-blue-700',        'C': 'bg-yellow-100 text-yellow-700',
  'D':  'bg-orange-100 text-orange-700',    'F': 'bg-red-100 text-red-700',
};

type MarkScores = Record<string, { ca: string; exam: string; resit: string }>;

export default function Assessments() {
  const { t, lang } = useLanguage();

  const [classes,  setClasses]  = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [terms,    setTerms]    = useState<Term[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  const [classId,   setClassId]   = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [termId,    setTermId]    = useState('');
  const [saved,     setSaved]     = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [filter,    setFilter]    = useState<Filter>('all');

  const [loadingClasses,  setLoadingClasses]  = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [scores, setScores] = useState<MarkScores>({});
  const [studentsReady, setStudentsReady] = useState(false);

  // Load classes + terms + subjects once
  useEffect(() => {
    Promise.all([api.getClasses(), api.getTerms(), api.getSubjects()])
      .then(([cls, tms, subs]) => {
        const mappedCls  = cls.map(mapClass);
        const mappedTrms = tms.map(mapTerm);
        setClasses(mappedCls);
        setTerms(mappedTrms);
        setSubjects(subs);
        if (mappedCls.length > 0)  setClassId(mappedCls[0].id);
        if (subs.length > 0)       setSubjectId(subs[0].id);
        const current = mappedTrms.find(t => t.isCurrent);
        if (current)                setTermId(current.id);
        else if (mappedTrms.length) setTermId(mappedTrms[0].id);
      })
      .catch(console.error)
      .finally(() => setLoadingClasses(false));
  }, []);

  // Load students when classId changes
  useEffect(() => {
    if (!classId) return;
    setStudentsReady(false);
    setLoadingStudents(true);
    setStudents([]);
    api.getClassStudents(classId)
      .then(data => {
        const mapped = data.map(mapStudent);
        setStudents(mapped);
        const init: MarkScores = {};
        mapped.forEach(s => { init[s.id] = { ca: '', exam: '', resit: '' }; });
        setScores(init);
        setSaved(false);
        setFilter('all');
        setStudentsReady(true);
      })
      .catch(console.error)
      .finally(() => setLoadingStudents(false));
  }, [classId]);

  // Reload marks when subject, term, or students change
  useEffect(() => {
    if (!studentsReady || !classId || !subjectId || !termId) return;
    api.getMarks({ classId, subjectId, termId })
      .then(existingMarks => {
        setScores(prev => {
          const updated: MarkScores = {};
          Object.keys(prev).forEach(id => { updated[id] = { ca: '', exam: '', resit: '' }; });
          existingMarks.forEach(m => {
            if (m.student_id in updated) {
              updated[m.student_id] = {
                ca: m.ca_score   != null ? String(m.ca_score)   : '',
                exam: m.exam_score != null ? String(m.exam_score) : '',
                resit: m.resit_score != null ? String(m.resit_score) : '',
              };
            }
          });
          return updated;
        });
        setSaved(false);
      })
      .catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentsReady, subjectId, termId]);

  // The input's max="100" is only a UI hint — browsers don't stop someone
  // typing past it — so clamp here too, same as the teacher's Mark Entry page.
  const updateScore = (sid: string, field: 'ca' | 'exam' | 'resit', val: string) => {
    const clamped = val === '' ? '' : String(Math.min(100, Math.max(0, Number(val) || 0)));
    setScores(prev => ({ ...prev, [sid]: { ...prev[sid], [field]: clamped } }));
    setSaved(false);
  };

  const getGrade = (total: number): { grade: string; remark: string } => {
    if (total >= 90) return { grade: 'A+', remark: lang === 'fr' ? 'Excellent'   : 'Excellent'   };
    if (total >= 80) return { grade: 'A',  remark: lang === 'fr' ? 'Très bien'   : 'Very Good'   };
    if (total >= 70) return { grade: 'B',  remark: lang === 'fr' ? 'Bien'        : 'Good'        };
    if (total >= 60) return { grade: 'C',  remark: lang === 'fr' ? 'Assez bien'  : 'Average'     };
    if (total >= 50) return { grade: 'D',  remark: lang === 'fr' ? 'Insuffisant' : 'Below Avg'   };
    return              { grade: 'F',  remark: lang === 'fr' ? 'Échec'       : 'Fail'        };
  };

  // CA is worth 40% of the total, the exam 60% — same weighting the backend
  // applies when saving (see marks.js), kept in sync here purely for the
  // live preview before a save.
  const rows = students.map(s => {
    const ca  = parseFloat(scores[s.id]?.ca ?? '') || 0;
    const exam  = parseFloat(scores[s.id]?.exam ?? '') || 0;
    const hasAny = (scores[s.id]?.ca ?? '') !== '' || (scores[s.id]?.exam ?? '') !== '';
    const total  = hasAny ? Math.round(ca * 0.4 + exam * 0.6) : 0;
    const { grade, remark } = getGrade(total);
    const resitInput = scores[s.id]?.resit ?? '';
    const hasResit = resitInput !== '';
    const resit = hasResit ? parseFloat(resitInput) || 0 : null;
    const resitGrade = hasResit ? getGrade(resit as number).grade : null;
    return { ...s, ca, exam, total, grade, remark, hasAny, resit, resitGrade };
  });

  const visibleRows = filter === 'passed'
    ? rows.filter(r => r.hasAny && r.total >= 50)
    : filter === 'failed'
    ? rows.filter(r => r.hasAny && r.total < 50)
    : rows;

  const classAvg = rows.length
    ? Math.round(rows.reduce((sum, r) => sum + r.total, 0) / rows.length)
    : 0;

  const className   = classes.find(c => c.id === classId)?.name ?? '';
  const subjectName = subjects.find(s => s.id === subjectId)?.name ?? '';

  const termLabel = (tm: Term) => {
    const n = tm.name === 'first' ? 1 : tm.name === 'second' ? 2 : 3;
    return lang === 'fr' ? `Semestre ${n}` : `Semester ${n}`;
  };

  const caHeader = lang === 'fr' ? 'CC (40%)' : 'CA (40%)';
  const examHeader = lang === 'fr' ? 'Examen (60%)' : 'Exams (60%)';
  const formulaHint = lang === 'fr'
    ? 'CC×40% + Examen×60% = Total /100'
    : 'CA×40% + Exam×60% = Total /100';

  const handleSave = async () => {
    if (!classId || !subjectId) return;
    setSaving(true);
    const subject = subjects.find(s => s.id === subjectId);
    const records = students
      .filter(s => (scores[s.id]?.ca ?? '') !== '' || (scores[s.id]?.exam ?? '') !== '' || (scores[s.id]?.resit ?? '') !== '')
      .map(s => {
        const ca = parseFloat(scores[s.id]?.ca ?? '') || 0;
        const exam = parseFloat(scores[s.id]?.exam ?? '') || 0;
        const total = Math.round(ca * 0.4 + exam * 0.6);
        const { grade, remark } = getGrade(total);
        const resitInput = scores[s.id]?.resit ?? '';
        return {
          studentId:     s.id,
          studentName:   `${s.firstName} ${s.lastName}`,
          studentNumber: s.studentNumber,
          classId,
          subjectId,
          subjectName:   subject?.name ?? '',
          termId:        termId || undefined,
          caScore:       ca,
          examScore:     exam,
          totalScore:    total,
          grade,
          remark,
          resitScore:    resitInput !== '' ? parseFloat(resitInput) || 0 : null,
        };
      });
    try {
      await api.saveMarks(records);
      setSaved(true);
    } catch (err) {
      console.error('Failed to save marks:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loadingClasses) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
          <BookOpen size={28} className="text-slate-400" />
        </div>
        <h3 className="text-slate-700 font-semibold text-lg mb-1">No specialities yet</h3>
        <p className="text-slate-400 text-sm max-w-xs">Add specialities first before entering assessments.</p>
      </div>
    );
  }

  if (terms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-4">
          <BookOpen size={28} className="text-amber-400" />
        </div>
        <h3 className="text-slate-700 font-semibold text-lg mb-1">
          {lang === 'fr' ? 'Aucun semestre configuré' : 'No academic semester configured'}
        </h3>
        <p className="text-slate-400 text-sm max-w-xs">
          {lang === 'fr'
            ? 'Ajoutez une année académique et au moins un semestre dans les Paramètres avant de saisir des notes.'
            : 'Add an academic year and at least one semester in Settings before entering marks.'}
        </p>
      </div>
    );
  }

  if (subjects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-4">
          <BookOpen size={28} className="text-amber-400" />
        </div>
        <h3 className="text-slate-700 font-semibold text-lg mb-1">
          {lang === 'fr' ? 'Aucun cours configuré' : 'No courses configured'}
        </h3>
        <p className="text-slate-400 text-sm max-w-xs">
          {lang === 'fr'
            ? 'Ajoutez des cours dans les Paramètres avant de saisir des notes.'
            : 'Add courses in Settings before entering marks.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">{t.assessments.class}</label>
            <select
              value={classId}
              onChange={e => setClassId(e.target.value)}
              className="py-2 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">{t.assessments.subject}</label>
            <select
              value={subjectId}
              onChange={e => { setSubjectId(e.target.value); setSaved(false); }}
              className="py-2 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">{t.settings.subjectCoefficient}</label>
            <span className="inline-flex items-center h-9 px-3 text-sm font-semibold text-violet-700 bg-violet-50 border border-violet-100 rounded-lg">
              {subjects.find(s => s.id === subjectId)?.coefficient ?? 1}
            </span>
          </div>
          {terms.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">{t.assessments.term}</label>
              <select
                value={termId}
                onChange={e => { setTermId(e.target.value); setSaved(false); }}
                className="py-2 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {terms.map(tm => (
                  <option key={tm.id} value={tm.id}>{termLabel(tm)}</option>
                ))}
              </select>
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors ml-auto"
          >
            <Save size={14} />
            {saving ? 'Saving…' : saved ? t.common.saved : t.assessments.saveMarks}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div
          onClick={() => setFilter('all')}
          className={`relative overflow-hidden rounded-xl border p-4 cursor-pointer select-none
            transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg group
            ${filter === 'all'
              ? 'bg-indigo-600 border-indigo-600 shadow-indigo-200 shadow-md'
              : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-indigo-100'}`}
        >
          <div className={`absolute -right-3 -top-3 w-16 h-16 rounded-full opacity-10 ${filter === 'all' ? 'bg-white' : 'bg-indigo-400'}`} />
          <BarChart2 size={20} className={`mb-2 transition-colors ${filter === 'all' ? 'text-indigo-200' : 'text-indigo-400 group-hover:text-indigo-500'}`} />
          <p className={`text-2xl font-bold transition-colors ${filter === 'all' ? 'text-white' : 'text-indigo-600'}`}>{classAvg}</p>
          <p className={`text-sm mt-0.5 transition-colors ${filter === 'all' ? 'text-indigo-200' : 'text-slate-500'}`}>{t.assessments.classAverage}</p>
        </div>

        <div
          onClick={() => setFilter(f => f === 'passed' ? 'all' : 'passed')}
          className={`relative overflow-hidden rounded-xl border p-4 cursor-pointer select-none
            transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg group
            ${filter === 'passed'
              ? 'bg-emerald-500 border-emerald-500 shadow-emerald-200 shadow-md'
              : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-emerald-100'}`}
        >
          <div className={`absolute -right-3 -top-3 w-16 h-16 rounded-full opacity-10 ${filter === 'passed' ? 'bg-white' : 'bg-emerald-400'}`} />
          <CheckCircle2 size={20} className={`mb-2 transition-colors ${filter === 'passed' ? 'text-emerald-100' : 'text-emerald-500 group-hover:text-emerald-600'}`} />
          <p className={`text-2xl font-bold transition-colors ${filter === 'passed' ? 'text-white' : 'text-emerald-600'}`}>{rows.filter(r => r.hasAny && r.total >= 50).length}</p>
          <p className={`text-sm mt-0.5 transition-colors ${filter === 'passed' ? 'text-emerald-100' : 'text-slate-500'}`}>{t.assessments.passed}</p>
        </div>

        <div
          onClick={() => setFilter(f => f === 'failed' ? 'all' : 'failed')}
          className={`relative overflow-hidden rounded-xl border p-4 cursor-pointer select-none
            transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg group
            ${filter === 'failed'
              ? 'bg-red-500 border-red-500 shadow-red-200 shadow-md'
              : 'bg-white border-slate-200 hover:border-red-300 hover:shadow-red-100'}`}
        >
          <div className={`absolute -right-3 -top-3 w-16 h-16 rounded-full opacity-10 ${filter === 'failed' ? 'bg-white' : 'bg-red-400'}`} />
          <XCircle size={20} className={`mb-2 transition-colors ${filter === 'failed' ? 'text-red-100' : 'text-red-400 group-hover:text-red-500'}`} />
          <p className={`text-2xl font-bold transition-colors ${filter === 'failed' ? 'text-white' : 'text-red-500'}`}>{rows.filter(r => r.hasAny && r.total < 50).length}</p>
          <p className={`text-sm mt-0.5 transition-colors ${filter === 'failed' ? 'text-red-100' : 'text-slate-500'}`}>{t.assessments.failed}</p>
        </div>
      </div>

      {/* Marks table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100">
          <FileText size={16} className="text-indigo-500" />
          <h3 className="font-semibold text-slate-800">{className} · {subjectName}</h3>
          <span className="text-slate-400 text-sm ml-1">{formulaHint}</span>
        </div>

        {loadingStudents ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : students.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            No students enrolled in this speciality yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-5 py-3 font-medium w-8">#</th>
                  <th className="text-left px-5 py-3 font-medium">{t.common.name}</th>
                  <th className="text-center px-5 py-3 font-medium">{caHeader}</th>
                  <th className="text-center px-5 py-3 font-medium">{examHeader}</th>
                  <th className="text-center px-5 py-3 font-medium">{t.assessments.totalOutOf}</th>
                  <th className="text-center px-5 py-3 font-medium">{t.assessments.grade}</th>
                  <th className="text-center px-5 py-3 font-medium">{t.assessments.remark}</th>
                  <th className="text-center px-5 py-3 font-medium">{lang === 'fr' ? 'Rattrapage /100' : 'Resit /100'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleRows.map((s, i) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 text-slate-400">{i + 1}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${s.gender === 'female' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>
                          {s.firstName[0]}{s.lastName[0]}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{s.firstName} {s.lastName}</p>
                          <p className="text-xs text-slate-400">{s.studentNumber}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <input
                        type="number" min="0" max="100"
                        value={scores[s.id]?.ca ?? ''}
                        onChange={e => updateScore(s.id, 'ca', e.target.value)}
                        className="w-16 text-center py-1 px-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        placeholder="—"
                      />
                    </td>
                    <td className="px-5 py-3 text-center">
                      <input
                        type="number" min="0" max="100"
                        value={scores[s.id]?.exam ?? ''}
                        onChange={e => updateScore(s.id, 'exam', e.target.value)}
                        className="w-16 text-center py-1 px-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        placeholder="—"
                      />
                    </td>
                    <td className="px-5 py-3 text-center font-bold text-slate-800">
                      {s.hasAny ? s.total : '—'}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {s.hasAny && (
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${gradeColor[s.grade] ?? 'bg-slate-100 text-slate-600'}`}>
                          {s.grade}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-center text-slate-500 text-xs">
                      {s.hasAny ? s.remark : '—'}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <input
                          type="number" min="0" max="100"
                          value={scores[s.id]?.resit ?? ''}
                          onChange={e => updateScore(s.id, 'resit', e.target.value)}
                          className="w-16 text-center py-1 px-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          placeholder="—"
                        />
                        {s.resitGrade && (
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${gradeColor[s.resitGrade] ?? 'bg-slate-100 text-slate-600'}`}>
                            {s.resitGrade}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
