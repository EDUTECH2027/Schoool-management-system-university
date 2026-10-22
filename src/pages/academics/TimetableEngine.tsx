import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Download } from 'lucide-react';
import { tt, type TtConflict } from '../../api/rooms';
import { Badge, ErrorBox, Field, PageHeader, Spinner, Tabs, btnGhost, input, msg, useDebounced, useFr, useLoad } from '../../composants/academics/ui';
import { ExamList, TimetableGrid } from '../../composants/timetable/TimetableGrid';

type Tab = 'timetable' | 'conflicts';
type Kind = 'student' | 'lecturer' | 'room' | 'programme';
const SEV_TONE = { error: 'red', warning: 'amber', info: 'slate' } as const;

export default function TimetableEngine() {
  const fr = useFr();
  const [tab, setTab] = useState<Tab>('timetable');
  const [kind, setKind] = useState<Kind>('lecturer');
  const [termId, setTermId] = useState('');
  const opts = useLoad(() => tt.options(), []);
  const term = termId || opts.data?.current_term_id || '';
  const conflicts = useLoad(() => tt.conflicts(term || undefined), [term]);
  const errCount = conflicts.data?.summary.error ?? 0;
  return (
    <div className="space-y-5">
      <PageHeader title={fr ? 'Emploi du temps' : 'Timetable'} subtitle={fr ? 'Emplois du temps générés à partir des cours ouverts, des salles et des inscriptions.' : 'Timetables generated from offerings, rooms and registrations.'} onRefresh={conflicts.reload}>
        {opts.data && <select aria-label="Semester" className={input} value={term} onChange={e => setTermId(e.target.value)}>{opts.data.terms.map(t => <option key={t.id} value={t.id}>{t.academic_year} · {t.name}</option>)}</select>}
      </PageHeader>
      <ErrorBox message={opts.error} />
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ id: 'timetable', label: fr ? 'Emploi du temps' : 'Timetable' }, { id: 'conflicts', label: fr ? 'Conflits' : 'Conflicts', badge: errCount || undefined }]} />
      {tab === 'timetable' ? (opts.data ? <Viewer kind={kind} setKind={setKind} term={term} opts={opts.data} /> : <Spinner />) : <Conflicts report={conflicts} />}
    </div>
  );
}

function Viewer({ kind, setKind, term, opts }: { kind: Kind; setKind: (k: Kind) => void; term: string; opts: NonNullable<ReturnType<typeof useLoad<Awaited<ReturnType<typeof tt.options>>>>['data']> }) {
  const fr = useFr();
  const [id, setId] = useState(''); const [level, setLevel] = useState('');
  const [sq, setSq] = useState(''); const dsq = useDebounced(sq);
  const students = useLoad(() => (kind === 'student' && dsq.length >= 2 ? tt.students(dsq) : Promise.resolve([])), [kind, dsq]);
  const [err, setErr] = useState('');
  const view = useLoad(() => {
    if (!id) return Promise.resolve(null);
    if (kind === 'student') return tt.student(id, term || undefined);
    if (kind === 'lecturer') return tt.lecturer(id, term || undefined);
    if (kind === 'room') return tt.room(id, term || undefined);
    return tt.programme(id, level || undefined, term || undefined);
  }, [kind, id, level, term]);
  const kinds: [Kind, string][] = [['student', fr ? 'Étudiant' : 'Student'], ['lecturer', fr ? 'Enseignant' : 'Lecturer'], ['room', fr ? 'Salle' : 'Room'], ['programme', fr ? 'Filière + niveau' : 'Programme + level']];
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3 items-end">
        <Field label={fr ? 'Afficher par' : 'View by'}><select aria-label="View by" className={input} value={kind} onChange={e => { setKind(e.target.value as Kind); setId(''); setSq(''); }}>{kinds.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
        {kind === 'student' && (
          <Field label={fr ? 'Nom ou matricule' : 'Name or matricule'}>
            <div className="relative"><input aria-label="Student search" className={`${input} w-64`} value={sq} onChange={e => { setSq(e.target.value); setId(''); }} placeholder={fr ? 'Au moins 2 caractères' : 'At least 2 characters'} />
              {!id && (students.data ?? []).length > 0 && <ul className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg text-sm">{(students.data ?? []).map(s => <li key={s.id}><button className="w-full text-left px-3 py-2 hover:bg-slate-50" onClick={() => { setId(s.id); setSq(`${s.name} (${s.matricule})`); }}>{s.name} <span className="text-slate-400">{s.matricule}</span></button></li>)}</ul>}</div>
          </Field>
        )}
        {kind === 'lecturer' && <Field label={fr ? 'Enseignant' : 'Lecturer'}><select aria-label="Lecturer" className={input} value={id} onChange={e => setId(e.target.value)}><option value="">—</option>{opts.lecturers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></Field>}
        {kind === 'room' && <Field label={fr ? 'Salle' : 'Room'}><select aria-label="Room" className={input} value={id} onChange={e => setId(e.target.value)}><option value="">—</option>{opts.rooms.map(r => <option key={r.id} value={r.id}>{r.code} · {r.name}</option>)}</select></Field>}
        {kind === 'programme' && (<>
          <Field label={fr ? 'Filière' : 'Programme'}><select aria-label="Programme" className={input} value={id} onChange={e => setId(e.target.value)}><option value="">—</option>{opts.programmes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          <Field label={fr ? 'Niveau' : 'Level'}><select aria-label="Level" className={input} value={level} onChange={e => setLevel(e.target.value)}><option value="">{fr ? 'Tous' : 'All'}</option>{opts.levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></Field>
        </>)}
        {(kind === 'student' || kind === 'lecturer') && id && <button className={`${btnGhost} ml-auto`} onClick={async () => { try { await tt.ics(kind, id, term || undefined); } catch (e) { setErr(msg(e)); } }}><Download size={14} /> {fr ? 'Exporter (.ics)' : 'Download .ics'}</button>}
      </div>
      <ErrorBox message={err || view.error} />
      {!id ? <p className="px-4 py-10 text-center text-slate-400 text-sm bg-white rounded-xl border border-slate-200">{fr ? 'Choisissez une personne, une salle ou une filière.' : 'Pick a person, a room or a programme.'}</p>
        : view.loading && !view.data ? <Spinner /> : view.data && (
          <>
            <h2 className="font-semibold text-slate-800">{view.data.subject.name} <span className="text-sm font-normal text-slate-500">· {view.data.term.academic_year} {view.data.term.name}</span></h2>
            {view.data.entries.length ? <TimetableGrid view={view.data} show={kind === 'lecturer' ? 'room' : 'lecturer'} /> : <p className="px-4 py-8 text-center text-slate-400 text-sm bg-white rounded-xl border border-slate-200">{fr ? 'Aucun cours programmé.' : 'Nothing scheduled this semester.'}</p>}
            <ExamList view={view.data} />
            {view.data.bookings.length > 0 && <p className="text-sm text-slate-500">{fr ? 'Réservations ponctuelles' : 'Ad-hoc bookings'}: {view.data.bookings.map(b => `${b.date} ${b.start_time}–${b.end_time} ${b.title}`).join(' · ')}</p>}
          </>
        )}
    </div>
  );
}

function Conflicts({ report }: { report: ReturnType<typeof useLoad<Awaited<ReturnType<typeof tt.conflicts>>>> }) {
  const fr = useFr();
  const [sev, setSev] = useState('');
  if (report.error) return <ErrorBox message={report.error} />;
  if (!report.data) return <Spinner />;
  const d = report.data, rows: TtConflict[] = d.conflicts.filter(c => !sev || c.severity === sev);
  const typeName = (t: string) => ({ lecturer_double_booked: fr ? 'Enseignant en double' : 'Lecturer double-booked', room_double_booked: fr ? 'Salle en double' : 'Room double-booked', student_clash: fr ? 'Conflit étudiant' : 'Student clash', room_over_capacity: fr ? 'Salle trop petite' : 'Room over capacity', unknown_period: fr ? 'Créneau inconnu' : 'Unknown period', no_room: fr ? 'Sans salle' : 'No room', room_inactive: fr ? 'Salle désactivée' : 'Room inactive', exam_room_double_booked: fr ? 'Salle d’examen en double' : 'Exam room double-booked', exam_student_clash: fr ? 'Examens simultanés' : 'Overlapping exams' } as Record<string, string>)[t] ?? t;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {([['', fr ? 'Tous' : 'All', d.conflicts.length], ['error', fr ? 'Erreurs' : 'Errors', d.summary.error], ['warning', fr ? 'Alertes' : 'Warnings', d.summary.warning], ['info', 'Info', d.summary.info]] as const).map(([k, l, n]) => (
          <button key={k} className={`px-3 py-1.5 rounded-full text-sm border ${sev === k ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-300'}`} onClick={() => setSev(k)}>{l} ({n})</button>
        ))}
      </div>
      {rows.length === 0 ? <p className="px-4 py-10 text-center text-emerald-700 text-sm bg-emerald-50 rounded-xl border border-emerald-200">{fr ? 'Aucun conflit détecté.' : 'No conflicts detected.'}</p> : (
        <ul className="space-y-2">
          {rows.map(c => (
            <li key={c.id} data-testid="conflict" className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3 items-start">
              <Badge tone={SEV_TONE[c.severity]}>{c.severity}</Badge>
              <div className="flex-1 min-w-[240px]"><p className="text-sm font-medium text-slate-800">{typeName(c.type)}</p><p className="text-sm text-slate-600">{c.message}</p></div>
              <div className="flex gap-3 text-sm">{c.links.map(l => <Link key={l.to} to={l.to} className="text-indigo-600 hover:underline">{l.label} →</Link>)}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
