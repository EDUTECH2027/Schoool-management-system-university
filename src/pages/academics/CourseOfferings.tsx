import { useState } from 'react';
import { Plus, Pencil, Trash2, Users, X } from 'lucide-react';
import { api } from '../../api/client';
import { acad, type Offering, type Slot } from '../../api/academics';
import { mapTerm } from '../../api/mappers';
import { Badge, ErrorBox, Field, Modal, PageHeader, Spinner, Table, btnGhost, btnPrimary, dayLabel, DAYS, input, msg, useFr, useLoad } from '../../composants/academics/ui';
import ConfirmDialog from '../../composants/ui/ConfirmDialog';

export default function CourseOfferings() {
  const fr = useFr();
  const terms = useLoad(async () => (await api.getTerms()).map(mapTerm));
  const [termId, setTermId] = useState('');
  const tid = termId || terms.data?.find(t => t.isCurrent)?.id || terms.data?.[0]?.id || '';
  const list = useLoad(() => (tid ? acad.offerings({ termId: tid }) : Promise.resolve([])), [tid]);
  const [edit, setEdit] = useState<Partial<Offering> | null>(null);
  const [roster, setRoster] = useState<string | null>(null);
  const [del, setDel] = useState<Offering | null>(null);
  const [err, setErr] = useState('');

  return (
    <div className="space-y-5">
      <PageHeader title={fr ? 'Cours ouverts' : 'Course offerings'} subtitle={fr ? 'Ce qui est enseigné chaque semestre : enseignant, créneaux, capacité' : 'What is taught each semester: lecturer, time slots, capacity'} onRefresh={() => void list.reload()}>
        <select aria-label="Semester" className={input} value={tid} onChange={e => setTermId(e.target.value)}>{terms.data?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
        <button className={btnPrimary} disabled={!tid} onClick={() => setEdit({ term_id: tid, section: 'A', is_open: true, slots: [] })}><Plus size={14} /> {fr ? 'Ouvrir un cours' : 'Open a course'}</button>
      </PageHeader>
      <ErrorBox message={err || list.error} />
      {!list.data ? <Spinner /> : (
        <Table min={900} head={[fr ? 'Cours' : 'Course', 'Sec.', fr ? 'Enseignant' : 'Lecturer', fr ? 'Créneaux' : 'Slots', fr ? 'Inscrits' : 'Enrolled', fr ? 'État' : 'State', '']} empty={list.data.length ? undefined : (fr ? 'Aucun cours ouvert ce semestre' : 'No courses offered this semester')}>
          {list.data.map(o => (
            <tr key={o.id}>
              <td className="px-4 py-3"><p className="font-medium text-slate-800">{o.course}</p><p className="text-xs text-slate-400 font-mono">{o.code} · {o.credits} cr</p></td>
              <td className="px-4 py-3">{o.section}</td>
              <td className="px-4 py-3 text-slate-600">{o.lecturer ?? <span className="text-amber-600">{fr ? 'non assigné' : 'unassigned'}</span>}</td>
              <td className="px-4 py-3 text-xs text-slate-600">{o.slots.length ? o.slots.map(s => `${dayLabel(s.day, fr).slice(0, 3)} ${s.period_key}${s.room ? ` (${s.room})` : ''}`).join(', ') : '—'}</td>
              <td className="px-4 py-3">{o.enrolled}{o.capacity != null && ` / ${o.capacity}`}</td>
              <td className="px-4 py-3">{o.is_open ? <Badge tone="green">{fr ? 'ouvert' : 'open'}</Badge> : <Badge tone="slate">{fr ? 'fermé' : 'closed'}</Badge>}</td>
              <td className="px-4 py-3"><div className="flex gap-1 justify-end">
                <button aria-label="Roster" className="p-1.5 text-slate-500 hover:text-indigo-600" onClick={() => setRoster(o.id)}><Users size={15} /></button>
                <button aria-label="Edit" className="p-1.5 text-slate-500 hover:text-indigo-600" onClick={() => setEdit(o)}><Pencil size={15} /></button>
                <button aria-label="Delete" className="p-1.5 text-slate-500 hover:text-red-600" onClick={() => setDel(o)}><Trash2 size={15} /></button></div></td>
            </tr>
          ))}
        </Table>
      )}
      {edit && <OfferingModal offering={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); void list.reload(); }} />}
      {roster && <RosterModal id={roster} onClose={() => setRoster(null)} />}
      {del && <ConfirmDialog title={fr ? 'Supprimer cette ouverture ?' : 'Delete this offering?'} message={`${del.course} (${del.section})`} confirmLabel={fr ? 'Supprimer' : 'Delete'}
        onConfirm={async () => { try { await acad.delOffering(del.id); setErr(''); void list.reload(); } catch (e) { setErr(msg(e)); } setDel(null); }} onCancel={() => setDel(null)} />}
    </div>
  );
}

function OfferingModal({ offering, onClose, onSaved }: { offering: Partial<Offering>; onClose: () => void; onSaved: () => void }) {
  const fr = useFr();
  const courses = useLoad(() => acad.courses({}));
  const teachers = useLoad(acad.teachers);
  const [f, setF] = useState({ subject_id: offering.subject_id ?? '', teacher_id: offering.teacher_id ?? '', section: offering.section ?? 'A', capacity: offering.capacity != null ? String(offering.capacity) : '', is_open: offering.is_open ?? true });
  const [slots, setSlots] = useState<Slot[]>(offering.slots?.map(s => ({ day: s.day, period_key: s.period_key, room: s.room ?? '' })) ?? []);
  const [err, setErr] = useState(''); const [conflict, setConflict] = useState(''); const [reason, setReason] = useState(''); const [busy, setBusy] = useState(false);

  const save = async (override = false) => {
    setBusy(true); setErr('');
    try {
      const body = { subject_id: f.subject_id, term_id: offering.term_id, teacher_id: f.teacher_id || null, section: f.section, capacity: f.capacity === '' ? null : Number(f.capacity), is_open: f.is_open, slots: slots.filter(s => s.period_key.trim()), ...(override && { override: true, override_reason: reason }) };
      await acad.saveOffering(offering.id ? { ...body, subject_id: undefined, term_id: undefined } : body, offering.id);
      onSaved();
    } catch (e) { const m = msg(e); if (/already teaches/.test(m)) setConflict(m); else setErr(m); } finally { setBusy(false); }
  };
  return (
    <Modal wide title={offering.id ? (fr ? 'Modifier l’ouverture' : 'Edit offering') : (fr ? 'Ouvrir un cours' : 'Open a course')} onClose={onClose}>
      <div className="grid sm:grid-cols-2 gap-3">
        {!offering.id && <div className="sm:col-span-2"><Field label={fr ? 'Cours' : 'Course'}><select className={`${input} w-full`} value={f.subject_id} onChange={e => setF(s => ({ ...s, subject_id: e.target.value }))}><option value="">—</option>{courses.data?.filter(c => c.is_active).map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}</select></Field></div>}
        <Field label={fr ? 'Enseignant' : 'Lecturer'}><select className={`${input} w-full`} value={f.teacher_id} onChange={e => setF(s => ({ ...s, teacher_id: e.target.value }))}><option value="">—</option>{teachers.data?.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}</select></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Section"><input className={`${input} w-full`} value={f.section} onChange={e => setF(s => ({ ...s, section: e.target.value }))} /></Field>
          <Field label={fr ? 'Capacité' : 'Capacity'} hint={fr ? 'Vide = illimité' : 'Empty = unlimited'}><input type="number" min={1} className={`${input} w-full`} value={f.capacity} onChange={e => setF(s => ({ ...s, capacity: e.target.value }))} /></Field>
        </div>
        <div className="sm:col-span-2">
          <p className="text-sm font-medium text-slate-600 mb-1">{fr ? 'Créneaux hebdomadaires' : 'Weekly time slots'}</p>
          <div className="space-y-2">
            {slots.map((s, i) => (
              <div key={i} className="flex flex-wrap gap-2 items-center">
                <select aria-label="Day" className={input} value={s.day} onChange={e => setSlots(l => l.map((x, j) => (j === i ? { ...x, day: e.target.value } : x)))}>{DAYS.map(d => <option key={d} value={d}>{dayLabel(d, fr)}</option>)}</select>
                <input aria-label="Period" list="periods" className={`${input} w-24`} placeholder="P1" value={s.period_key} onChange={e => setSlots(l => l.map((x, j) => (j === i ? { ...x, period_key: e.target.value } : x)))} />
                <input aria-label="Room" className={`${input} w-32`} placeholder={fr ? 'Salle' : 'Room'} value={s.room ?? ''} onChange={e => setSlots(l => l.map((x, j) => (j === i ? { ...x, room: e.target.value } : x)))} />
                <button aria-label="Remove slot" className="text-slate-400 hover:text-red-600" onClick={() => setSlots(l => l.filter((_, j) => j !== i))}><X size={16} /></button>
              </div>
            ))}
            <datalist id="periods">{['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'].map(p => <option key={p} value={p} />)}</datalist>
            <button className={btnGhost} onClick={() => setSlots(l => [...l, { day: 'monday', period_key: '', room: '' }])}><Plus size={14} /> {fr ? 'Ajouter un créneau' : 'Add a slot'}</button>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.is_open} onChange={e => setF(s => ({ ...s, is_open: e.target.checked }))} /> {fr ? 'Ouvert aux inscriptions' : 'Open for registration'}</label>
      </div>
      <div className="mt-3 space-y-2">
        <ErrorBox message={err} />
        {conflict && (
          <div className="border border-amber-300 bg-amber-50 rounded-lg p-3 space-y-2">
            <p className="text-sm text-amber-800">{conflict}</p>
            <input className={`${input} w-full`} placeholder={fr ? 'Motif de la dérogation (obligatoire)' : 'Reason for the exception (required)'} value={reason} onChange={e => setReason(e.target.value)} />
            <button className={btnPrimary} disabled={!reason.trim() || busy} onClick={() => save(true)}>{fr ? 'Enregistrer malgré le conflit' : 'Save anyway'}</button>
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-4"><button className={btnGhost} onClick={onClose}>{fr ? 'Annuler' : 'Cancel'}</button><button className={btnPrimary} disabled={busy || (!offering.id && !f.subject_id)} onClick={() => { setConflict(''); void save(); }}>{fr ? 'Enregistrer' : 'Save'}</button></div>
    </Modal>
  );
}

function RosterModal({ id, onClose }: { id: string; onClose: () => void }) {
  const fr = useFr();
  const r = useLoad(() => acad.roster(id));
  return (
    <Modal wide title={r.data ? `${r.data.offering.course} · ${r.data.offering.section}` : '…'} onClose={onClose}>
      <ErrorBox message={r.error} />
      {!r.data ? <Spinner /> : (
        <>
          <p className="text-sm text-slate-500 mb-3">{r.data.offering.term} · {r.data.offering.lecturer ?? '—'} · {r.data.students.length} {fr ? 'inscrits' : 'registered'}</p>
          <Table head={[fr ? 'Étudiant' : 'Student', 'Matricule', fr ? 'Filière' : 'Programme', fr ? 'Type' : 'Type']} empty={r.data.students.length ? undefined : (fr ? 'Aucun inscrit' : 'Nobody registered yet')}>
            {r.data.students.map(s => <tr key={s.student_id}><td className="px-4 py-2.5 font-medium text-slate-800">{s.name}</td><td className="px-4 py-2.5 font-mono text-xs">{s.matricule}</td><td className="px-4 py-2.5 text-slate-600">{s.programme ?? s.class_name ?? '—'}</td><td className="px-4 py-2.5">{s.kind !== 'regular' ? <Badge tone="amber">{s.kind}</Badge> : '—'}</td></tr>)}
          </Table>
        </>
      )}
    </Modal>
  );
}
