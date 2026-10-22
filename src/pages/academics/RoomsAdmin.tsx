import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { rooms, type AssignExam, type AssignSlot, type Occupant, type PeriodDef, type Room } from '../../api/rooms';
import { Badge, DAYS, ErrorBox, Field, Modal, PageHeader, Spinner, StatusBadge, Table, Tabs, btnGhost, btnPrimary, dayLabel, fmtDate, input, msg, useFr, useLoad } from '../../composants/academics/ui';

type Tab = 'rooms' | 'periods' | 'bookings' | 'availability' | 'assignments';
const ROOM_KINDS = ['classroom', 'lab', 'lecture_hall', 'exam_hall', 'other'];
const kindName = (k: string, fr: boolean) => ({ classroom: fr ? 'Salle de cours' : 'Classroom', lab: fr ? 'Laboratoire' : 'Lab', lecture_hall: fr ? 'Amphithéâtre' : 'Lecture hall', exam_hall: fr ? 'Salle d’examen' : 'Exam hall', other: fr ? 'Autre' : 'Other' } as Record<string, string>)[k] ?? k;
const today = () => new Date().toISOString().slice(0, 10);

export default function RoomsAdmin() {
  const fr = useFr();
  const [sp, setSp] = useSearchParams();
  const t = sp.get('tab') as Tab | null;
  const tab: Tab = t && ['rooms', 'periods', 'bookings', 'availability', 'assignments'].includes(t) ? t : 'rooms';
  return (
    <div className="space-y-5">
      <PageHeader title={fr ? 'Salles & créneaux' : 'Rooms & periods'} subtitle={fr ? 'Salles, créneaux horaires, réservations et affectation aux cours et examens.' : 'Rooms, timetable periods, bookings and assignment to classes and exams.'} />
      <Tabs<Tab> value={tab} onChange={v => setSp({ tab: v })} tabs={[
        { id: 'rooms', label: fr ? 'Salles' : 'Rooms' }, { id: 'periods', label: fr ? 'Créneaux' : 'Periods' }, { id: 'bookings', label: fr ? 'Réservations' : 'Bookings' },
        { id: 'availability', label: fr ? 'Disponibilités' : 'Availability' }, { id: 'assignments', label: fr ? 'Affectations' : 'Assignments' },
      ]} />
      {tab === 'rooms' && <RoomsTab />}
      {tab === 'periods' && <PeriodsTab />}
      {tab === 'bookings' && <BookingsTab />}
      {tab === 'availability' && <AvailabilityTab />}
      {tab === 'assignments' && <AssignmentsTab />}
    </div>
  );
}

// ── Rooms ─────────────────────────────────────────────────────────────────────
function RoomsTab() {
  const fr = useFr();
  const list = useLoad(() => rooms.list(), []);
  const [edit, setEdit] = useState<Room | 'new' | null>(null); const [err, setErr] = useState('');
  const del = async (r: Room) => {
    if (!window.confirm(fr ? `Supprimer la salle ${r.code} ?` : `Delete room ${r.code}?`)) return;
    try { await rooms.del(r.id); list.reload(); } catch (e) { setErr(msg(e)); }
  };
  return (
    <div className="space-y-3">
      <div className="flex justify-end"><button className={btnPrimary} onClick={() => setEdit('new')}><Plus size={15} /> {fr ? 'Nouvelle salle' : 'New room'}</button></div>
      <ErrorBox message={err || list.error} />
      {!list.data ? <Spinner /> : (
        <Table head={['Code', fr ? 'Nom' : 'Name', fr ? 'Bâtiment' : 'Building', fr ? 'Capacité' : 'Capacity', 'Type', fr ? 'Équipement' : 'Equipment', fr ? 'Utilisation' : 'Usage', '']} min={860} empty={list.data.length ? undefined : (fr ? 'Aucune salle.' : 'No rooms yet.')}>
          {list.data.map(r => (
            <tr key={r.id} className={r.is_active ? '' : 'opacity-60'}>
              <td className="px-4 py-3 font-semibold">{r.code}{!r.is_active && <span className="ml-2"><Badge tone="slate">{fr ? 'Inactive' : 'Inactive'}</Badge></span>}</td><td className="px-4 py-3">{r.name}</td><td className="px-4 py-3">{r.building ?? '—'}</td>
              <td className="px-4 py-3">{r.capacity}</td><td className="px-4 py-3">{kindName(r.kind, fr)}</td><td className="px-4 py-3 text-slate-500">{r.equipment ?? '—'}</td>
              <td className="px-4 py-3 text-xs text-slate-500">{r.slot_count} {fr ? 'cours' : 'classes'} · {r.exam_count} {fr ? 'examens' : 'exams'} · {r.booking_count} {fr ? 'rés.' : 'bookings'}</td>
              <td className="px-4 py-3 text-right whitespace-nowrap"><button className={`${btnGhost} inline-flex`} onClick={() => setEdit(r)}>{fr ? 'Modifier' : 'Edit'}</button> <button className="text-xs text-red-600 hover:underline ml-2" onClick={() => del(r)}>{fr ? 'Supprimer' : 'Delete'}</button></td>
            </tr>
          ))}
        </Table>
      )}
      {edit && <RoomModal room={edit === 'new' ? null : edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); list.reload(); }} />}
    </div>
  );
}

function RoomModal({ room, onClose, onSaved }: { room: Room | null; onClose: () => void; onSaved: () => void }) {
  const fr = useFr();
  const [f, setF] = useState({ code: room?.code ?? '', name: room?.name ?? '', building: room?.building ?? '', capacity: String(room?.capacity ?? 30), kind: room?.kind ?? 'classroom', equipment: room?.equipment ?? '', is_active: room?.is_active ?? true });
  const [err, setErr] = useState('');
  const set = (k: string, v: string | boolean) => setF(s => ({ ...s, [k]: v }));
  return (
    <Modal title={room ? (fr ? 'Modifier la salle' : 'Edit room') : (fr ? 'Nouvelle salle' : 'New room')} onClose={onClose}>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Code"><input className={`${input} w-full`} value={f.code} onChange={e => set('code', e.target.value)} /></Field>
        <Field label={fr ? 'Nom' : 'Name'}><input className={`${input} w-full`} value={f.name} onChange={e => set('name', e.target.value)} /></Field>
        <Field label={fr ? 'Bâtiment' : 'Building'}><input className={`${input} w-full`} value={f.building} onChange={e => set('building', e.target.value)} /></Field>
        <Field label={fr ? 'Capacité' : 'Capacity'}><input className={`${input} w-full`} type="number" min={1} value={f.capacity} onChange={e => set('capacity', e.target.value)} /></Field>
        <Field label="Type"><select className={`${input} w-full`} value={f.kind} onChange={e => set('kind', e.target.value)}>{ROOM_KINDS.map(k => <option key={k} value={k}>{kindName(k, fr)}</option>)}</select></Field>
        <Field label={fr ? 'Équipement' : 'Equipment'}><input className={`${input} w-full`} value={f.equipment} onChange={e => set('equipment', e.target.value)} /></Field>
        {room && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.is_active} onChange={e => set('is_active', e.target.checked)} /> {fr ? 'Active' : 'Active'}</label>}
      </div>
      <div className="mt-3"><ErrorBox message={err} /></div>
      <div className="flex justify-end gap-2 mt-4"><button className={btnGhost} onClick={onClose}>{fr ? 'Annuler' : 'Cancel'}</button>
        <button className={btnPrimary} disabled={!f.code.trim()} onClick={async () => { try { await rooms.save({ ...f, capacity: Number(f.capacity) }, room?.id); onSaved(); } catch (e) { setErr(msg(e)); } }}>{fr ? 'Enregistrer' : 'Save'}</button></div>
    </Modal>
  );
}

// ── Periods ───────────────────────────────────────────────────────────────────
function PeriodsTab() {
  const fr = useFr();
  const list = useLoad(() => rooms.periods(), []);
  const [edit, setEdit] = useState<PeriodDef | 'new' | null>(null); const [err, setErr] = useState('');
  const del = async (p: PeriodDef) => {
    if (!window.confirm(fr ? `Supprimer le créneau ${p.key} ?` : `Delete period ${p.key}?`)) return;
    try { await rooms.delPeriod(p.id); list.reload(); } catch (e) { setErr(msg(e)); }
  };
  return (
    <div className="space-y-3">
      <div className="flex justify-end"><button className={btnPrimary} onClick={() => setEdit('new')}><Plus size={15} /> {fr ? 'Nouveau créneau' : 'New period'}</button></div>
      <ErrorBox message={err || list.error} />
      {!list.data ? <Spinner /> : (
        <Table head={[fr ? 'Clé' : 'Key', fr ? 'Libellé' : 'Label', fr ? 'Début' : 'Start', fr ? 'Fin' : 'End', '']} min={520}>
          {list.data.map(p => (
            <tr key={p.id}><td className="px-4 py-3 font-semibold">{p.key}</td><td className="px-4 py-3">{p.label}</td><td className="px-4 py-3">{p.start_time}</td><td className="px-4 py-3">{p.end_time}</td>
              <td className="px-4 py-3 text-right whitespace-nowrap"><button className={`${btnGhost} inline-flex`} onClick={() => setEdit(p)}>{fr ? 'Modifier' : 'Edit'}</button> <button className="text-xs text-red-600 hover:underline ml-2" onClick={() => del(p)}>{fr ? 'Supprimer' : 'Delete'}</button></td></tr>
          ))}
        </Table>
      )}
      {edit && <PeriodModal period={edit === 'new' ? null : edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); list.reload(); }} />}
    </div>
  );
}

function PeriodModal({ period, onClose, onSaved }: { period: PeriodDef | null; onClose: () => void; onSaved: () => void }) {
  const fr = useFr();
  const [f, setF] = useState({ key: period?.key ?? '', label: period?.label ?? '', start_time: period?.start_time ?? '08:00', end_time: period?.end_time ?? '09:00' });
  const [err, setErr] = useState('');
  return (
    <Modal title={period ? `${fr ? 'Créneau' : 'Period'} ${period.key}` : (fr ? 'Nouveau créneau' : 'New period')} onClose={onClose}>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label={fr ? 'Clé' : 'Key'} hint={period ? (fr ? 'Non modifiable' : 'Cannot be changed') : 'P9'}><input className={`${input} w-full`} disabled={!!period} value={f.key} onChange={e => setF({ ...f, key: e.target.value })} /></Field>
        <Field label={fr ? 'Libellé' : 'Label'}><input className={`${input} w-full`} value={f.label} onChange={e => setF({ ...f, label: e.target.value })} /></Field>
        <Field label={fr ? 'Début' : 'Start'}><input className={`${input} w-full`} type="time" value={f.start_time} onChange={e => setF({ ...f, start_time: e.target.value })} /></Field>
        <Field label={fr ? 'Fin' : 'End'}><input className={`${input} w-full`} type="time" value={f.end_time} onChange={e => setF({ ...f, end_time: e.target.value })} /></Field>
      </div>
      <div className="mt-3"><ErrorBox message={err} /></div>
      <div className="flex justify-end gap-2 mt-4"><button className={btnGhost} onClick={onClose}>{fr ? 'Annuler' : 'Cancel'}</button>
        <button className={btnPrimary} disabled={!f.key.trim()} onClick={async () => { try { await rooms.savePeriod(period ? { label: f.label, start_time: f.start_time, end_time: f.end_time } : f, period?.id); onSaved(); } catch (e) { setErr(msg(e)); } }}>{fr ? 'Enregistrer' : 'Save'}</button></div>
    </Modal>
  );
}

// ── Bookings ──────────────────────────────────────────────────────────────────
function BookingsTab() {
  const fr = useFr();
  const [from, setFrom] = useState(today());
  const list = useLoad(() => rooms.bookings({ from }), [from]);
  const rl = useLoad(() => rooms.list({ active: 'true' }), []);
  const [f, setF] = useState({ room_id: '', title: '', date: today(), start_time: '14:00', end_time: '16:00' });
  const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const book = async () => {
    setErr(''); setOk('');
    try { await rooms.book(f); setOk(fr ? 'Salle réservée.' : 'Room booked.'); setF({ ...f, title: '' }); list.reload(); } catch (e) { setErr(msg(e)); }
  };
  return (
    <div className="space-y-4">
      <section className="bg-white rounded-xl border border-slate-200 p-4">
        <h2 className="font-semibold text-slate-800 mb-3">{fr ? 'Réserver une salle' : 'Book a room'}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <Field label={fr ? 'Salle' : 'Room'}><select className={`${input} w-full`} value={f.room_id} onChange={e => setF({ ...f, room_id: e.target.value })}><option value="">—</option>{(rl.data ?? []).map(r => <option key={r.id} value={r.id}>{r.code} ({r.capacity})</option>)}</select></Field>
          <Field label={fr ? 'Objet' : 'Title'}><input className={`${input} w-full`} value={f.title} onChange={e => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="Date"><input className={`${input} w-full`} type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></Field>
          <Field label={fr ? 'De' : 'From'}><input className={`${input} w-full`} type="time" value={f.start_time} onChange={e => setF({ ...f, start_time: e.target.value })} /></Field>
          <Field label={fr ? 'À' : 'To'}><input className={`${input} w-full`} type="time" value={f.end_time} onChange={e => setF({ ...f, end_time: e.target.value })} /></Field>
        </div>
        <div className="mt-3 space-y-2"><ErrorBox message={err} />{ok && <p role="status" className="text-sm text-emerald-700">{ok}</p>}</div>
        <div className="flex justify-end mt-3"><button className={btnPrimary} disabled={!f.room_id || !f.title.trim()} onClick={book}>{fr ? 'Réserver' : 'Book'}</button></div>
      </section>
      <div className="flex items-center gap-2 text-sm"><label htmlFor="bk-from">{fr ? 'À partir du' : 'From'}</label><input id="bk-from" className={input} type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
      <ErrorBox message={list.error} />
      {!list.data ? <Spinner /> : (
        <Table head={['Date', fr ? 'Horaire' : 'Time', fr ? 'Salle' : 'Room', fr ? 'Objet' : 'Title', fr ? 'Par' : 'By', fr ? 'État' : 'Status', '']} min={780} empty={list.data.length ? undefined : (fr ? 'Aucune réservation.' : 'No bookings.')}>
          {list.data.map(b => (
            <tr key={b.id}><td className="px-4 py-3">{fmtDate(b.date, fr ? 'fr' : 'en')}</td><td className="px-4 py-3">{b.start_time}–{b.end_time}</td><td className="px-4 py-3 font-medium">{b.room_code}</td><td className="px-4 py-3">{b.title}</td><td className="px-4 py-3">{b.booked_by ?? '—'}</td>
              <td className="px-4 py-3"><StatusBadge status={b.status === 'confirmed' ? 'scheduled' : 'cancelled'} /></td>
              <td className="px-4 py-3 text-right">{b.status === 'confirmed' && <button className="text-xs text-red-600 hover:underline" onClick={async () => { try { await rooms.cancelBooking(b.id); list.reload(); } catch (e) { setErr(msg(e)); } }}>{fr ? 'Annuler' : 'Cancel'}</button>}</td></tr>
          ))}
        </Table>
      )}
    </div>
  );
}

// ── Availability finder ───────────────────────────────────────────────────────
function AvailabilityTab() {
  const fr = useFr();
  const periods = useLoad(() => rooms.periods(), []);
  const [mode, setMode] = useState<'date' | 'period'>('date');
  const [f, setF] = useState({ date: today(), start_time: '10:00', end_time: '12:00', day: 'monday', period_key: 'P1', min_capacity: '', kind: '' });
  const [res, setRes] = useState<Room[] | null>(null); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const search = async () => {
    setBusy(true); setErr('');
    try {
      const common = { min_capacity: f.min_capacity ? Number(f.min_capacity) : undefined, kind: f.kind || undefined };
      setRes(await rooms.available(mode === 'date' ? { date: f.date, start_time: f.start_time, end_time: f.end_time, ...common } : { day: f.day, period_key: f.period_key, ...common }));
    } catch (e) { setErr(msg(e)); setRes(null); } finally { setBusy(false); }
  };
  return (
    <div className="space-y-4">
      <section className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="flex gap-2"><button className={mode === 'date' ? btnPrimary : btnGhost} onClick={() => setMode('date')}>{fr ? 'Par date et heure' : 'By date & time'}</button><button className={mode === 'period' ? btnPrimary : btnGhost} onClick={() => setMode('period')}>{fr ? 'Par jour et créneau' : 'By day & period'}</button></div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          {mode === 'date' ? (<>
            <Field label="Date"><input className={`${input} w-full`} type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></Field>
            <Field label={fr ? 'De' : 'From'}><input className={`${input} w-full`} type="time" value={f.start_time} onChange={e => setF({ ...f, start_time: e.target.value })} /></Field>
            <Field label={fr ? 'À' : 'To'}><input className={`${input} w-full`} type="time" value={f.end_time} onChange={e => setF({ ...f, end_time: e.target.value })} /></Field>
          </>) : (<>
            <Field label={fr ? 'Jour' : 'Day'}><select className={`${input} w-full`} value={f.day} onChange={e => setF({ ...f, day: e.target.value })}>{DAYS.map(d => <option key={d} value={d}>{dayLabel(d, fr)}</option>)}</select></Field>
            <Field label={fr ? 'Créneau' : 'Period'}><select className={`${input} w-full`} value={f.period_key} onChange={e => setF({ ...f, period_key: e.target.value })}>{(periods.data ?? []).map(p => <option key={p.key} value={p.key}>{p.key} · {p.start_time}–{p.end_time}</option>)}</select></Field>
          </>)}
          <Field label={fr ? 'Capacité min.' : 'Min capacity'}><input className={`${input} w-full`} type="number" min={0} value={f.min_capacity} onChange={e => setF({ ...f, min_capacity: e.target.value })} /></Field>
          <Field label="Type"><select className={`${input} w-full`} value={f.kind} onChange={e => setF({ ...f, kind: e.target.value })}><option value="">{fr ? 'Tous' : 'Any'}</option>{ROOM_KINDS.map(k => <option key={k} value={k}>{kindName(k, fr)}</option>)}</select></Field>
        </div>
        <ErrorBox message={err} />
        <div className="flex justify-end"><button className={btnPrimary} disabled={busy} onClick={search}><Search size={14} /> {fr ? 'Chercher' : 'Find rooms'}</button></div>
      </section>
      {res && (res.length ? (
        <Table head={['Code', fr ? 'Nom' : 'Name', fr ? 'Capacité' : 'Capacity', 'Type', fr ? 'Équipement' : 'Equipment']} min={520}>
          {res.map(r => <tr key={r.id}><td className="px-4 py-3 font-semibold">{r.code}</td><td className="px-4 py-3">{r.name}</td><td className="px-4 py-3">{r.capacity}</td><td className="px-4 py-3">{kindName(r.kind, fr)}</td><td className="px-4 py-3 text-slate-500">{r.equipment ?? '—'}</td></tr>)}
        </Table>
      ) : <p className="px-4 py-10 text-center text-slate-400 text-sm bg-white rounded-xl border border-slate-200">{fr ? 'Aucune salle libre pour ces critères.' : 'No room is free for these criteria.'}</p>)}
    </div>
  );
}

// ── Assignments ───────────────────────────────────────────────────────────────
type Pending = { kind: 'slot'; slot: AssignSlot } | { kind: 'exam'; exam: AssignExam } | null;
function AssignmentsTab() {
  const fr = useFr();
  const data = useLoad(() => rooms.assignments(), []);
  const [pending, setPending] = useState<Pending>(null);
  const [ok, setOk] = useState('');
  const [view, setView] = useState<'slots' | 'exams'>('slots');
  const d = data.data;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-2"><button className={view === 'slots' ? btnPrimary : btnGhost} onClick={() => setView('slots')}>{fr ? 'Cours hebdomadaires' : 'Weekly classes'}</button><button className={view === 'exams' ? btnPrimary : btnGhost} onClick={() => setView('exams')}>{fr ? 'Examens' : 'Exams'}</button></div>
        {d && <span className="text-sm text-slate-500">{d.term.academic_year} · {d.term.name}</span>}
      </div>
      <ErrorBox message={data.error} />
      {ok && <p role="status" className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{ok}</p>}
      {!d ? <Spinner /> : view === 'slots' ? (
        <Table head={[fr ? 'Cours' : 'Course', fr ? 'Enseignant' : 'Lecturer', fr ? 'Jour' : 'Day', fr ? 'Créneau' : 'Period', fr ? 'Inscrits' : 'Enrolled', fr ? 'Salle' : 'Room', '']} min={860} empty={d.slots.length ? undefined : (fr ? 'Aucun créneau ce semestre.' : 'No weekly slots this semester.')}>
          {d.slots.map(s => (
            <tr key={s.id}>
              <td className="px-4 py-3 font-medium">{s.code} <span className="font-normal text-slate-500">{s.course} ({s.section})</span></td><td className="px-4 py-3">{s.lecturer ?? '—'}</td><td className="px-4 py-3">{dayLabel(s.day, fr)}</td>
              <td className="px-4 py-3">{s.period_key}{s.start_time ? ` · ${s.start_time}–${s.end_time}` : <span className="ml-1"><Badge tone="red">{fr ? 'inconnu' : 'unknown'}</Badge></span>}</td><td className="px-4 py-3">{s.enrolled}{s.offering_capacity ? ` / ${s.offering_capacity}` : ''}</td>
              <td className="px-4 py-3">{s.room_code ?? s.room ?? <span className="text-slate-400">—</span>}{s.room_capacity != null && <span className="text-xs text-slate-400"> ({s.room_capacity})</span>}{s.over_capacity && <span className="ml-1"><Badge tone="amber">{fr ? 'trop petite' : 'over capacity'}</Badge></span>}</td>
              <td className="px-4 py-3 text-right"><button className={`${btnGhost} inline-flex`} onClick={() => setPending({ kind: 'slot', slot: s })}>{fr ? 'Affecter' : 'Assign'}</button></td>
            </tr>
          ))}
        </Table>
      ) : (
        <Table head={[fr ? 'Examen' : 'Exam', 'Date', fr ? 'Horaire' : 'Time', fr ? 'Candidats' : 'Candidates', fr ? 'Salle' : 'Room', '']} min={760} empty={d.exams.length ? undefined : (fr ? 'Aucun examen ce semestre.' : 'No exams this semester.')}>
          {d.exams.map(x => (
            <tr key={x.id}>
              <td className="px-4 py-3 font-medium">{x.code} <span className="font-normal text-slate-500">{x.title}</span> {x.status !== 'scheduled' && <StatusBadge status={x.status} />}</td><td className="px-4 py-3">{fmtDate(x.date, fr ? 'fr' : 'en')}</td><td className="px-4 py-3">{x.start_time}–{x.end_time}</td><td className="px-4 py-3">{x.candidates}</td>
              <td className="px-4 py-3">{x.room_code ?? x.room ?? <span className="text-slate-400">—</span>}{x.over_capacity && <span className="ml-1"><Badge tone="amber">{fr ? 'trop petite' : 'over capacity'}</Badge></span>}</td>
              <td className="px-4 py-3 text-right">{x.status === 'scheduled' && <button className={`${btnGhost} inline-flex`} onClick={() => setPending({ kind: 'exam', exam: x })}>{fr ? 'Affecter' : 'Assign'}</button>}</td>
            </tr>
          ))}
        </Table>
      )}
      {pending && <AssignModal pending={pending} onClose={() => setPending(null)} onDone={m => { setPending(null); setOk(m); data.reload(); }} />}
    </div>
  );
}

function AssignModal({ pending, onClose, onDone }: { pending: NonNullable<Pending>; onClose: () => void; onDone: (m: string) => void }) {
  const fr = useFr();
  const cur = pending.kind === 'slot' ? pending.slot.room_id : pending.exam.room_id;
  const [roomId, setRoomId] = useState(cur ?? ''); const [reason, setReason] = useState(''); const [needReason, setNeedReason] = useState(false);
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const free = useLoad(() => (pending.kind === 'slot'
    ? rooms.available({ day: pending.slot.day, period_key: pending.slot.period_key, all: true })
    : rooms.available({ date: pending.exam.date, start_time: pending.exam.start_time, end_time: pending.exam.end_time, all: true })), []);
  const need = pending.kind === 'slot' ? Math.max(pending.slot.enrolled, pending.slot.offering_capacity ?? 0) : pending.exam.candidates;
  const title = pending.kind === 'slot' ? `${pending.slot.code} · ${dayLabel(pending.slot.day, fr)} ${pending.slot.period_key}` : `${pending.exam.code} · ${fmtDate(pending.exam.date, fr ? 'fr' : 'en')} ${pending.exam.start_time}`;
  const busyBy = (o: Occupant[] | undefined) => (o ?? []).filter(x => !(pending.kind === 'slot' ? pending.slot.id === x.id : pending.exam.id === x.id)).map(x => x.title).join(', ');
  const submit = async (room_id: string | null) => {
    setBusy(true); setErr('');
    try {
      const body = { room_id, ...(needReason && reason.trim() ? { override_reason: reason.trim() } : {}) };
      const r = pending.kind === 'slot' ? await rooms.assignSlot({ slot_id: pending.slot.id, ...body }) : await rooms.assignExam({ exam_id: pending.exam.id, ...body });
      onDone(r.warnings?.[0] ?? (room_id ? (fr ? 'Salle affectée.' : 'Room assigned.') : (fr ? 'Affectation retirée.' : 'Assignment removed.')));
    } catch (e) { const m = msg(e); setErr(m); if (/override_reason/.test(m)) setNeedReason(true); } finally { setBusy(false); }
  };
  return (
    <Modal title={`${fr ? 'Affecter une salle' : 'Assign a room'} — ${title}`} onClose={onClose}>
      <p className="text-xs text-slate-500 mb-2">{fr ? 'Effectif attendu' : 'Expected seats'}: <strong>{need}</strong></p>
      {!free.data ? <Spinner /> : (
        <ul className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-64 overflow-y-auto text-sm">
          {free.data.map(r => {
            const other = busyBy(r.busy), blocked = !r.available && !!other;
            return (
              <li key={r.id}><label className={`flex items-center gap-3 px-3 py-2 ${blocked ? 'opacity-50' : 'cursor-pointer hover:bg-slate-50'}`}>
                <input type="radio" name="room" disabled={blocked} checked={roomId === r.id} onChange={() => setRoomId(r.id)} />
                <span className="font-medium">{r.code}</span><span className="text-slate-500 flex-1 truncate">{r.name}</span>
                <span className={r.capacity < need ? 'text-amber-600' : 'text-slate-500'}>{r.capacity} {fr ? 'places' : 'seats'}</span>
                {blocked && <Badge tone="red">{other.slice(0, 28)}</Badge>}
              </label></li>
            );
          })}
        </ul>
      )}
      <div className="mt-3 space-y-2">
        <ErrorBox message={err} />
        {needReason && <Field label={fr ? 'Motif de dérogation à la capacité' : 'Capacity override reason'}><input className={`${input} w-full`} value={reason} onChange={e => setReason(e.target.value)} /></Field>}
      </div>
      <div className="flex justify-between gap-2 mt-4">
        <div>{cur && <button className="text-sm text-red-600 hover:underline" disabled={busy} onClick={() => submit(null)}>{fr ? 'Retirer la salle' : 'Remove room'}</button>}</div>
        <div className="flex gap-2"><button className={btnGhost} onClick={onClose}>{fr ? 'Annuler' : 'Cancel'}</button><button className={btnPrimary} disabled={!roomId || busy || (needReason && reason.trim().length < 3)} onClick={() => submit(roomId)}>{fr ? 'Affecter' : 'Assign'}</button></div>
      </div>
    </Modal>
  );
}
