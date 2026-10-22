import { Download } from 'lucide-react';
import { useState } from 'react';
import { tt, type TtEntry, type TtView } from '../../api/rooms';
import { Badge, DAYS, ErrorBox, dayLabel, fmtDate, msg, useFr, useLoad, Spinner, btnGhost } from '../academics/ui';
import { useLanguage } from '../../i18n/LanguageContext';

/** Weekly grid: days as columns, periods (with their times) as rows. Cells holding several classes are flagged. */
export function TimetableGrid({ view, show = 'lecturer' }: { view: TtView; show?: 'lecturer' | 'room' }) {
  const fr = useFr();
  const rows = view.periods.filter(p => view.entries.some(e => e.period_key === p.key) || ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'].includes(p.key));
  const unknown = view.entries.filter(e => !e.period_known);
  const at = (day: string, key: string) => view.entries.filter(e => e.day === day && e.period_key === key);
  const detail = (e: TtEntry) => [show !== 'room' && e.lecturer, e.room && `${fr ? 'Salle' : 'Room'} ${e.room}`].filter(Boolean).join(' · ');
  return (
    <div className="space-y-2">
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]" aria-label="Weekly timetable">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="text-left px-3 py-3 w-28">{fr ? 'Créneau' : 'Period'}</th>{DAYS.map(d => <th key={d} className="text-left px-3 py-3">{dayLabel(d, fr)}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(p => (
              <tr key={p.key}>
                <td className="px-3 py-2 align-top"><span className="font-semibold text-slate-700">{p.key}</span><span className="block text-xs text-slate-400">{p.start_time}–{p.end_time}</span></td>
                {DAYS.map(d => {
                  const cell = at(d, p.key);
                  return (
                    <td key={d} className="px-2 py-2 align-top">
                      {cell.length === 0 ? <span className="text-slate-300 text-xs">—</span> : cell.map(e => (
                        <div key={e.slot_id} data-testid="tt-cell" className={`rounded-lg p-2 mb-1 text-xs ${cell.length > 1 ? 'bg-red-50 border border-red-200' : 'bg-indigo-50 border border-indigo-100'}`}>
                          <p className="font-semibold text-slate-800">{e.code}</p><p className="text-slate-600">{e.course} ({e.section})</p>
                          {detail(e) && <p className="text-slate-500">{detail(e)}</p>}
                        </div>
                      ))}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {unknown.length > 0 && <p className="text-xs text-amber-700">{fr ? 'Créneaux inconnus' : 'Slots on unknown periods'}: {unknown.map(e => `${e.code} (${e.day} ${e.period_key})`).join(', ')}</p>}
    </div>
  );
}

export function ExamList({ view }: { view: TtView }) {
  const fr = useFr(); const { lang } = useLanguage();
  if (!view.exams.length) return null;
  return (
    <section>
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">{fr ? 'Examens à venir' : 'Upcoming exams'}</h2>
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {view.exams.map(x => (
          <div key={x.id} className="px-4 py-3 flex flex-wrap gap-x-4 gap-y-1 items-center text-sm">
            <span className="font-medium">{x.code} {x.title}</span><span>{fmtDate(x.date, lang)} · {x.start_time}–{x.end_time}</span>
            {x.room ? <Badge tone="blue">{fr ? 'Salle' : 'Room'} {x.room}</Badge> : <Badge>{fr ? 'Salle à confirmer' : 'Room TBC'}</Badge>}
          </div>
        ))}
      </div>
    </section>
  );
}

/** Self-service block used under the legacy timetable pages: the engine-generated course timetable of the signed-in student / lecturer. */
export function CourseTimetable({ kind }: { kind: 'student' | 'lecturer' }) {
  const fr = useFr();
  const v = useLoad(() => (kind === 'student' ? tt.student('me') : tt.lecturer('me')), [kind]);
  const [err, setErr] = useState('');
  return (
    <section className="space-y-3 pt-2" aria-label="Course timetable">
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto"><h2 className="text-xl font-bold text-slate-800">{fr ? 'Emploi du temps des cours' : 'Course timetable'}</h2>
          {v.data && <p className="text-sm text-slate-500">{v.data.term.academic_year} · {v.data.term.name}</p>}</div>
        {v.data && v.data.entries.length > 0 && <button className={btnGhost} onClick={async () => { try { await tt.ics(kind, 'me'); } catch (e) { setErr(msg(e)); } }}><Download size={14} /> {fr ? 'Exporter (.ics)' : 'Export (.ics)'}</button>}
      </div>
      <ErrorBox message={err || v.error} />
      {v.loading && !v.data ? <Spinner /> : v.data && (v.data.entries.length ? <><TimetableGrid view={v.data} show={kind === 'student' ? 'lecturer' : 'room'} /><ExamList view={v.data} /></>
        : <p className="text-sm text-slate-500 bg-white rounded-xl border border-slate-200 px-4 py-6 text-center">{kind === 'student' ? (fr ? 'Inscrivez-vous à des cours pour voir votre emploi du temps.' : 'Register for courses to see your course timetable.') : (fr ? 'Aucun cours ne vous est attribué ce semestre.' : 'No course is assigned to you this semester.')}</p>)}
    </section>
  );
}
