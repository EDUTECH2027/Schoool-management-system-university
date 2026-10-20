import { useState } from 'react';
import { Check, Plus, Pencil, Trash2, X, UserPlus } from 'lucide-react';
import { api } from '../../api/client';
import { acad, type Period } from '../../api/academics';
import { mapTerm } from '../../api/mappers';
import { Badge, ErrorBox, Field, Modal, PageHeader, Pager, Spinner, StatusBadge, Table, Tabs, btnGhost, btnPrimary, fmtDateTime, input, msg, toLocalInput, useDebounced, useFr, useLoad } from '../../composants/academics/ui';
import ConfirmDialog from '../../composants/ui/ConfirmDialog';
import { useLanguage } from '../../i18n/LanguageContext';

export default function RegistrationAdmin() {
  const fr = useFr();
  const [tab, setTab] = useState<'queue' | 'periods'>('queue');
  const pending = useLoad(() => acad.registrations({ status: 'pending_approval', limit: 1 }));
  const [onBehalf, setOnBehalf] = useState(false);
  return (
    <div className="space-y-5">
      <PageHeader title={fr ? 'Inscriptions aux cours' : 'Course registration'} subtitle={fr ? 'Périodes d’inscription, demandes de dérogation et inscriptions manuelles' : 'Registration periods, exception requests and manual registrations'}>
        <button className={btnPrimary} onClick={() => setOnBehalf(true)}><UserPlus size={14} /> {fr ? 'Inscrire un étudiant' : 'Register a student'}</button>
      </PageHeader>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'queue', label: fr ? 'Demandes & inscriptions' : 'Requests & registrations', badge: pending.data?.total }, { id: 'periods', label: fr ? 'Périodes d’inscription' : 'Registration periods' }]} />
      {tab === 'queue' ? <Queue onChange={() => void pending.reload()} /> : <Periods />}
      {onBehalf && <OnBehalf onClose={() => setOnBehalf(false)} onDone={() => { setOnBehalf(false); void pending.reload(); }} />}
    </div>
  );
}

function Queue({ onChange }: { onChange: () => void }) {
  const { lang } = useLanguage(); const fr = lang === 'fr';
  const [status, setStatus] = useState('pending_approval'); const [q, setQ] = useState(''); const dq = useDebounced(q); const [page, setPage] = useState(1);
  const list = useLoad(() => acad.registrations({ status, q: dq, page, limit: 20 }), [status, dq, page]);
  const [decide, setDecide] = useState<{ id: string; decision: 'approve' | 'reject'; name: string } | null>(null);
  const [note, setNote] = useState(''); const [err, setErr] = useState('');
  const [drop, setDrop] = useState<{ id: string; name: string } | null>(null);
  const submit = async () => {
    try {
      if (decide) await acad.decide(decide.id, decide.decision, note || undefined);
      if (drop) await acad.dropFor(drop.id, note);
      setDecide(null); setDrop(null); setNote(''); setErr(''); void list.reload(); onChange();
    } catch (e) { setErr(msg(e)); }
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <select aria-label="Status" className={input} value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
          {['pending_approval', 'registered', 'rejected', 'dropped', ''].map(s => <option key={s} value={s}>{s ? s.replace('_', ' ') : (fr ? 'Tous' : 'All')}</option>)}
        </select>
        <input aria-label="Search" className={`${input} w-64`} placeholder={fr ? 'Étudiant ou matricule…' : 'Student or matricule…'} value={q} onChange={e => { setQ(e.target.value); setPage(1); }} />
      </div>
      <ErrorBox message={err || list.error} />
      {!list.data ? <Spinner /> : (
        <div className="bg-white rounded-xl border border-slate-200">
          <Table min={900} head={[fr ? 'Étudiant' : 'Student', fr ? 'Cours' : 'Course', fr ? 'Type' : 'Type', fr ? 'Motif' : 'Reason', fr ? 'Statut' : 'Status', fr ? 'Date' : 'Date', '']} empty={list.data.items.length ? undefined : (fr ? 'Rien à afficher' : 'Nothing to show')}>
            {list.data.items.map(r => (
              <tr key={r.id}>
                <td className="px-4 py-3"><p className="font-medium text-slate-800">{r.student}</p><p className="text-xs text-slate-400">{r.matricule} · {r.programme ?? '—'}</p></td>
                <td className="px-4 py-3">{r.course}<p className="text-xs text-slate-400 font-mono">{r.code} · {r.section}</p></td>
                <td className="px-4 py-3">{r.kind === 'regular' ? '—' : <Badge tone="amber">{r.kind}</Badge>}</td>
                <td className="px-4 py-3 text-slate-600 max-w-xs">{r.exception_reason ?? r.decision_note ?? '—'}</td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmtDateTime(r.registered_at, lang)}</td>
                <td className="px-4 py-3"><div className="flex gap-1 justify-end">
                  {r.status === 'pending_approval' && <>
                    <button aria-label="Approve" title={fr ? 'Approuver' : 'Approve'} className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50" onClick={() => { setNote(''); setDecide({ id: r.id, decision: 'approve', name: r.student }); }}><Check size={16} /></button>
                    <button aria-label="Reject" title={fr ? 'Refuser' : 'Reject'} className="p-1.5 rounded-lg text-red-600 hover:bg-red-50" onClick={() => { setNote(''); setDecide({ id: r.id, decision: 'reject', name: r.student }); }}><X size={16} /></button></>}
                  {r.status === 'registered' && <button aria-label="Drop" title={fr ? 'Retirer' : 'Drop'} className="p-1.5 rounded-lg text-slate-500 hover:text-red-600" onClick={() => { setNote(''); setDrop({ id: r.id, name: r.student }); }}><Trash2 size={15} /></button>}
                </div></td>
              </tr>
            ))}
          </Table>
          <Pager page={page} limit={20} total={list.data.total} onPage={setPage} />
        </div>
      )}
      {(decide || drop) && (
        <Modal title={decide ? (decide.decision === 'approve' ? (fr ? 'Approuver la demande' : 'Approve request') : (fr ? 'Refuser la demande' : 'Reject request')) : (fr ? 'Retirer l’inscription' : 'Drop registration')} onClose={() => { setDecide(null); setDrop(null); }}>
          <p className="text-sm text-slate-600 mb-3">{decide?.name ?? drop?.name}</p>
          <Field label={decide?.decision === 'approve' ? (fr ? 'Note (facultative)' : 'Note (optional)') : (fr ? 'Motif (obligatoire)' : 'Reason (required)')}><textarea rows={3} className={`${input} w-full`} value={note} onChange={e => setNote(e.target.value)} /></Field>
          <ErrorBox message={err} />
          <div className="flex justify-end gap-2 pt-3"><button className={btnGhost} onClick={() => { setDecide(null); setDrop(null); }}>{fr ? 'Annuler' : 'Cancel'}</button>
            <button className={btnPrimary} disabled={(decide?.decision !== 'approve') && !note.trim()} onClick={submit}>{fr ? 'Confirmer' : 'Confirm'}</button></div>
        </Modal>
      )}
    </div>
  );
}

function Periods() {
  const { lang } = useLanguage(); const fr = lang === 'fr';
  const list = useLoad(() => acad.periods());
  const terms = useLoad(async () => (await api.getTerms()).map(mapTerm));
  const [edit, setEdit] = useState<Partial<Period> | null>(null);
  const [del, setDel] = useState<Period | null>(null); const [err, setErr] = useState('');
  return (
    <div className="space-y-3">
      <div className="flex"><button className={`${btnPrimary} ml-auto`} onClick={() => setEdit({ term_id: terms.data?.find(t => t.isCurrent)?.id ?? terms.data?.[0]?.id, min_credits: 12, max_credits: 30, allow_exceptions: true })}><Plus size={14} /> {fr ? 'Nouvelle période' : 'New period'}</button></div>
      <ErrorBox message={err || list.error} />
      {!list.data ? <Spinner /> : (
        <Table min={860} head={[fr ? 'Semestre' : 'Semester', fr ? 'Portée' : 'Applies to', fr ? 'Ouverture' : 'Opens', fr ? 'Clôture' : 'Closes', fr ? 'Ajout/retrait jusqu’au' : 'Add/drop until', 'Crédits', '']} empty={list.data.length ? undefined : (fr ? 'Aucune période : les étudiants ne peuvent pas s’inscrire.' : 'No periods yet — students cannot register.')}>
          {list.data.map(p => (
            <tr key={p.id}>
              <td className="px-4 py-3 font-medium text-slate-800">{p.term_name} <span className="text-xs text-slate-400">{p.academic_year}</span> {p.is_open && <Badge tone="green">{fr ? 'ouverte' : 'open'}</Badge>}</td>
              <td className="px-4 py-3 text-slate-600">{p.programme_name ?? (fr ? 'Toutes les filières' : 'All programmes')}{p.name && <p className="text-xs text-slate-400">{p.name}</p>}</td>
              <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmtDateTime(p.opens_at, lang)}</td><td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmtDateTime(p.closes_at, lang)}</td>
              <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{p.add_drop_until ? fmtDateTime(p.add_drop_until, lang) : '—'}</td>
              <td className="px-4 py-3">{p.min_credits}–{p.max_credits}{p.allow_exceptions && <p className="text-xs text-slate-400">{fr ? 'dérogations permises' : 'exceptions allowed'}</p>}</td>
              <td className="px-4 py-3"><div className="flex gap-1 justify-end"><button aria-label="Edit" className="p-1.5 text-slate-500 hover:text-indigo-600" onClick={() => setEdit(p)}><Pencil size={15} /></button><button aria-label="Delete" className="p-1.5 text-slate-500 hover:text-red-600" onClick={() => setDel(p)}><Trash2 size={15} /></button></div></td>
            </tr>
          ))}
        </Table>
      )}
      {edit && <PeriodModal period={edit} terms={terms.data ?? []} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); void list.reload(); }} />}
      {del && <ConfirmDialog title={fr ? 'Supprimer cette période ?' : 'Delete this period?'} message={`${del.term_name}`} confirmLabel={fr ? 'Supprimer' : 'Delete'} onConfirm={async () => { try { await acad.delPeriod(del.id); void list.reload(); } catch (e) { setErr(msg(e)); } setDel(null); }} onCancel={() => setDel(null)} />}
    </div>
  );
}

function PeriodModal({ period, terms, onClose, onSaved }: { period: Partial<Period>; terms: { id: string; name: string }[]; onClose: () => void; onSaved: () => void }) {
  const fr = useFr();
  const programmes = useLoad(acad.programmes);
  const [f, setF] = useState({ term_id: period.term_id ?? '', programme_id: period.programme_id ?? '', name: period.name ?? '', opens_at: toLocalInput(period.opens_at), closes_at: toLocalInput(period.closes_at), add_drop_until: toLocalInput(period.add_drop_until), min_credits: String(period.min_credits ?? 12), max_credits: String(period.max_credits ?? 30), allow_exceptions: period.allow_exceptions ?? true });
  const [err, setErr] = useState(''); const set = (k: string, v: unknown) => setF(s => ({ ...s, [k]: v }));
  const save = async () => {
    try {
      await acad.savePeriod({ term_id: f.term_id, programme_id: f.programme_id || null, name: f.name || null, opens_at: new Date(f.opens_at).toISOString(), closes_at: new Date(f.closes_at).toISOString(), add_drop_until: f.add_drop_until ? new Date(f.add_drop_until).toISOString() : null, min_credits: Number(f.min_credits), max_credits: Number(f.max_credits), allow_exceptions: f.allow_exceptions }, period.id);
      onSaved();
    } catch (e) { setErr(msg(e)); }
  };
  return (
    <Modal wide title={period.id ? (fr ? 'Modifier la période' : 'Edit period') : (fr ? 'Nouvelle période d’inscription' : 'New registration period')} onClose={onClose}>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label={fr ? 'Semestre' : 'Semester'}><select className={`${input} w-full`} value={f.term_id} onChange={e => set('term_id', e.target.value)}>{terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
        <Field label={fr ? 'Filière (vide = toutes)' : 'Programme (empty = all)'}><select className={`${input} w-full`} value={f.programme_id} onChange={e => set('programme_id', e.target.value)}><option value="">—</option>{programmes.data?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        <Field label={fr ? 'Ouverture' : 'Opens'}><input type="datetime-local" className={`${input} w-full`} value={f.opens_at} onChange={e => set('opens_at', e.target.value)} /></Field>
        <Field label={fr ? 'Clôture' : 'Closes'}><input type="datetime-local" className={`${input} w-full`} value={f.closes_at} onChange={e => set('closes_at', e.target.value)} /></Field>
        <Field label={fr ? 'Ajout/retrait possible jusqu’au' : 'Add/drop allowed until'} hint={fr ? 'Vide = jusqu’à la clôture' : 'Empty = until closing'}><input type="datetime-local" className={`${input} w-full`} value={f.add_drop_until} onChange={e => set('add_drop_until', e.target.value)} /></Field>
        <Field label={fr ? 'Libellé' : 'Label'}><input className={`${input} w-full`} value={f.name} onChange={e => set('name', e.target.value)} /></Field>
        <Field label={fr ? 'Crédits minimum' : 'Minimum credits'}><input type="number" min={0} className={`${input} w-full`} value={f.min_credits} onChange={e => set('min_credits', e.target.value)} /></Field>
        <Field label={fr ? 'Crédits maximum' : 'Maximum credits'}><input type="number" min={0} className={`${input} w-full`} value={f.max_credits} onChange={e => set('max_credits', e.target.value)} /></Field>
        <label className="sm:col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={f.allow_exceptions} onChange={e => set('allow_exceptions', e.target.checked)} /> {fr ? 'Autoriser les demandes de dérogation (prérequis, hors cursus, cours déjà validé)' : 'Allow exception requests (missing prerequisite, outside curriculum, already passed)'}</label>
      </div>
      <div className="mt-3"><ErrorBox message={err} /></div>
      <div className="flex justify-end gap-2 pt-4"><button className={btnGhost} onClick={onClose}>{fr ? 'Annuler' : 'Cancel'}</button><button className={btnPrimary} disabled={!f.term_id || !f.opens_at || !f.closes_at} onClick={save}>{fr ? 'Enregistrer' : 'Save'}</button></div>
    </Modal>
  );
}

function OnBehalf({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const fr = useFr();
  const [q, setQ] = useState(''); const dq = useDebounced(q);
  const students = useLoad(() => (dq.length >= 2 ? acad.students(dq) : Promise.resolve([])), [dq]);
  const terms = useLoad(async () => (await api.getTerms()).map(mapTerm));
  const [studentId, setStudentId] = useState(''); const [termId, setTermId] = useState('');
  const tid = termId || terms.data?.find(t => t.isCurrent)?.id || terms.data?.[0]?.id || '';
  const offerings = useLoad(() => (tid ? acad.offerings({ termId: tid }) : Promise.resolve([])), [tid]);
  const [offeringId, setOfferingId] = useState(''); const [override, setOverride] = useState(false); const [reason, setReason] = useState(''); const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const go = async () => {
    try { await acad.registerFor({ student_id: studentId, offering_id: offeringId, override, reason: reason || undefined }); setOk(fr ? 'Inscription enregistrée.' : 'Registered.'); setErr(''); setTimeout(onDone, 600); }
    catch (e) { setErr(msg(e)); }
  };
  return (
    <Modal wide title={fr ? 'Inscrire un étudiant à un cours' : 'Register a student for a course'} onClose={onClose}>
      <div className="space-y-3">
        <Field label={fr ? 'Étudiant' : 'Student'}>
          <input className={`${input} w-full`} placeholder={fr ? 'Nom ou matricule (2 lettres min.)' : 'Name or matricule (min. 2 letters)'} value={q} onChange={e => { setQ(e.target.value); setStudentId(''); }} />
        </Field>
        {students.data && students.data.length > 0 && !studentId && (
          <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-40 overflow-y-auto">{students.data.slice(0, 20).map(s => <button key={s.id} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50" onClick={() => { setStudentId(s.id); setQ(`${s.first_name} ${s.last_name}`); }}>{s.first_name} {s.last_name} <span className="text-xs text-slate-400 ml-1">{s.student_number}</span></button>)}</div>
        )}
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label={fr ? 'Semestre' : 'Semester'}><select className={`${input} w-full`} value={tid} onChange={e => setTermId(e.target.value)}>{terms.data?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
          <Field label={fr ? 'Cours' : 'Course'}><select className={`${input} w-full`} value={offeringId} onChange={e => setOfferingId(e.target.value)}><option value="">—</option>{offerings.data?.map(o => <option key={o.id} value={o.id}>{o.code} {o.section} — {o.course}</option>)}</select></Field>
        </div>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5" checked={override} onChange={e => setOverride(e.target.checked)} /> <span>{fr ? 'Passer outre les règles (prérequis, capacité, période…). Un motif est obligatoire et l’action est journalisée.' : 'Override the rules (prerequisites, capacity, period…). A reason is required and the action is logged.'}</span></label>
        {override && <Field label={fr ? 'Motif' : 'Reason'}><input className={`${input} w-full`} value={reason} onChange={e => setReason(e.target.value)} /></Field>}
        <ErrorBox message={err} />{ok && <p className="text-sm text-emerald-600">{ok}</p>}
        <div className="flex justify-end gap-2"><button className={btnGhost} onClick={onClose}>{fr ? 'Fermer' : 'Close'}</button><button className={btnPrimary} disabled={!studentId || !offeringId || (override && !reason.trim())} onClick={go}>{fr ? 'Inscrire' : 'Register'}</button></div>
      </div>
    </Modal>
  );
}
