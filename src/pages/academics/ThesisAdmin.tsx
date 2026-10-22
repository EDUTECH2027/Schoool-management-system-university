import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { acad } from '../../api/academics';
import { THESIS_STEPS, thesisApi, type JuryMember, type Thesis, type ThesisFull } from '../../api/thesis';
import { DefenceBox, KIND, Stepper, SubmissionList, ThesisStatusBadge, Timeline, statusLabel } from '../../composants/thesis/shared';
import { Badge, ErrorBox, Field, Modal, PageHeader, Pager, Spinner, Stat, Table, Tabs, btnDanger, btnGhost, btnPrimary, fmtDate, input, msg, useDebounced, useFr, useLoad } from '../../composants/academics/ui';
import { useLanguage } from '../../i18n/LanguageContext';

type Tab = 'queue' | 'workload' | 'defences';

function Detail({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const fr = useFr();
  const th = useLoad<ThesisFull>(() => thesisApi.get(id), [id]);
  const sup = useLoad(() => thesisApi.supervisors(), []);
  const [err, setErr] = useState(''); const [note, setNote] = useState(''); const [busy, setBusy] = useState(false);
  const [s1, setS1] = useState(''); const [s2, setS2] = useState('');
  const [when, setWhen] = useState({ date: '', time: '09:00', room: '' }); const [jury, setJury] = useState<JuryMember[]>([]);
  const [res, setRes] = useState({ score: '', grade: '' });
  const t = th.data;
  const run = async (fn: () => Promise<unknown>) => { setBusy(true); setErr(''); try { await fn(); th.reload(); onChanged(); setNote(''); } catch (e) { setErr(msg(e)); } finally { setBusy(false); } };
  const supOpts = (sup.data?.items ?? []);
  const sel = (v: string, set: (s: string) => void, none: string) => (
    <select className={`${input} w-full`} value={v} onChange={e => set(e.target.value)}><option value="">{none}</option>{supOpts.map(s => <option key={s.id} value={s.id}>{s.name} ({s.load}/{s.max})</option>)}</select>
  );
  const addJury = (teacherId: string) => { const s = supOpts.find(x => x.id === teacherId); if (s && !jury.some(j => j.teacher_id === s.id)) setJury([...jury, { name: s.name, role: 'member', teacher_id: s.id }]); };
  return (
    <Modal title={t?.title ?? '…'} onClose={onClose} wide>
      {!t ? (th.error ? <ErrorBox message={th.error} /> : <Spinner />) : (
        <div className="space-y-5">
          <ErrorBox message={err} />
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2"><ThesisStatusBadge status={t.status} /><span className="text-xs text-slate-500">{t.student?.name} · {t.student?.matricule} · {t.student?.programme ?? '—'} · {KIND[t.kind][fr ? 1 : 0]}</span></div>
            <Stepper status={t.status} />
            {t.abstract && <p className="text-sm text-slate-600 whitespace-pre-line break-words">{t.abstract}</p>}
            <p className="text-sm text-slate-700">{fr ? 'Encadrant' : 'Supervisor'}: <b>{t.supervisor?.name ?? '—'}</b>{t.co_supervisor ? ` · ${fr ? 'Co-encadrant' : 'Co-supervisor'}: ${t.co_supervisor.name}` : ''}</p>
            {t.decision_note && <p className="text-sm text-slate-500 break-words">{t.decision_note}</p>}
          </div>
          <DefenceBox t={t} />

          {['proposed', 'supervisor_accepted', 'approved', 'in_progress', 'submitted'].includes(t.status) && (
            <section className="rounded-xl border border-slate-200 p-3 space-y-2">
              <h3 className="text-sm font-semibold text-slate-700">{fr ? 'Encadrement' : 'Supervision'}</h3>
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                {sel(s1, setS1, fr ? '— Encadrant —' : '— Supervisor —')}{sel(s2, setS2, fr ? '— Co-encadrant —' : '— Co-supervisor —')}
                <button className={btnGhost} disabled={busy || (!s1 && !s2)} onClick={() => run(() => thesisApi.assign(t.id, { ...(s1 ? { supervisor_id: s1 } : {}), ...(s2 ? { co_supervisor_id: s2 } : {}) }))}>{fr ? 'Affecter' : 'Assign'}</button>
              </div>
              {t.status === 'supervisor_accepted' && <p className="text-xs text-slate-400">{fr ? 'Changer d’encadrant renvoie le dossier à l’acceptation du nouvel encadrant.' : 'Changing the supervisor sends the proposal back for the new supervisor to accept.'}</p>}
            </section>
          )}

          {['proposed', 'supervisor_accepted', 'approved'].includes(t.status) && (
            <section className="rounded-xl border border-slate-200 p-3 space-y-2">
              <h3 className="text-sm font-semibold text-slate-700">{fr ? 'Décision' : 'Decision'}</h3>
              <Field label={fr ? 'Note (obligatoire pour refuser)' : 'Note (required to reject)'}><textarea className={`${input} w-full`} rows={2} maxLength={1000} value={note} onChange={e => setNote(e.target.value)} /></Field>
              <div className="flex flex-wrap gap-2">
                {t.status === 'supervisor_accepted' && <button className={btnPrimary} disabled={busy} onClick={() => run(() => thesisApi.approve(t.id, note))}>{fr ? 'Approuver le sujet' : 'Approve topic'}</button>}
                <button className={btnDanger} disabled={busy || !note.trim()} onClick={() => run(() => thesisApi.reject(t.id, note))}>{fr ? 'Refuser' : 'Reject'}</button>
              </div>
            </section>
          )}

          {['submitted', 'defence_scheduled'].includes(t.status) && (
            <section className="rounded-xl border border-slate-200 p-3 space-y-2">
              <h3 className="text-sm font-semibold text-slate-700">{t.status === 'submitted' ? (fr ? 'Planifier la soutenance' : 'Schedule the defence') : (fr ? 'Replanifier la soutenance' : 'Reschedule the defence')}</h3>
              <div className="grid gap-2 sm:grid-cols-3">
                <input aria-label="Defence date" type="date" className={input} value={when.date} onChange={e => setWhen({ ...when, date: e.target.value })} />
                <input aria-label="Defence time" type="time" className={input} value={when.time} onChange={e => setWhen({ ...when, time: e.target.value })} />
                <input aria-label="Defence room" className={input} placeholder={fr ? 'Salle' : 'Room'} maxLength={100} value={when.room} onChange={e => setWhen({ ...when, room: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs text-slate-500">{fr ? 'Jury' : 'Jury'}</p>
                {jury.map((j, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input aria-label="Jury name" className={`${input} flex-1 min-w-0`} value={j.name} disabled={!!j.teacher_id} onChange={e => setJury(jury.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))} />
                    <input aria-label="Jury role" className={`${input} w-28`} value={j.role} onChange={e => setJury(jury.map((x, k) => (k === i ? { ...x, role: e.target.value } : x)))} />
                    <button aria-label="Remove jury member" className="text-slate-400 hover:text-red-600" onClick={() => setJury(jury.filter((_, k) => k !== i))}><X size={16} /></button>
                  </div>
                ))}
                <div className="flex flex-wrap gap-2">
                  <select aria-label="Add lecturer to jury" className={input} value="" onChange={e => addJury(e.target.value)}><option value="">{fr ? '+ Enseignant du jury' : '+ Lecturer on the jury'}</option>{supOpts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                  <button className={btnGhost} onClick={() => setJury([...jury, { name: '', role: 'external' }])}><Plus size={14} /> {fr ? 'Membre externe' : 'External member'}</button>
                </div>
              </div>
              <button className={btnPrimary} disabled={busy || !when.date || !when.room.trim()} onClick={() => run(() => thesisApi.scheduleDefence(t.id, { ...when, jury: jury.filter(j => j.name.trim()) }))}>{fr ? 'Enregistrer et notifier' : 'Save and notify'}</button>
            </section>
          )}

          {['defence_scheduled', 'defended'].includes(t.status) && (
            <section className="rounded-xl border border-slate-200 p-3 space-y-2">
              <h3 className="text-sm font-semibold text-slate-700">{fr ? 'Résultat de la soutenance' : 'Defence result'}</h3>
              <div className="grid gap-2 sm:grid-cols-[8rem_8rem_1fr]">
                <input aria-label="Score" type="number" min={0} max={100} step="0.01" className={input} placeholder={fr ? 'Note /100' : 'Score /100'} value={res.score} onChange={e => setRes({ ...res, score: e.target.value })} />
                <input aria-label="Grade" className={input} placeholder={fr ? 'Mention' : 'Grade'} maxLength={10} value={res.grade} onChange={e => setRes({ ...res, grade: e.target.value })} />
                <input aria-label="Result note" className={input} placeholder={fr ? 'Commentaire du jury' : 'Jury comment'} maxLength={2000} value={note} onChange={e => setNote(e.target.value)} />
              </div>
              <div className="flex flex-wrap gap-2">
                {t.status === 'defence_scheduled' && <button className={btnGhost} disabled={busy} onClick={() => run(() => thesisApi.defended(t.id))}>{fr ? 'Marquer comme soutenu' : 'Mark as defended'}</button>}
                <button className={btnPrimary} disabled={busy || res.score === '' || !res.grade.trim()} onClick={() => run(() => thesisApi.result(t.id, { score: Number(res.score), grade: res.grade, note }))}>{fr ? 'Enregistrer le résultat' : 'Record result'}</button>
              </div>
            </section>
          )}
          <div className="grid gap-4 lg:grid-cols-2">
            <section><h3 className="font-semibold text-slate-800 mb-1">{fr ? 'Dépôts' : 'Submissions'}</h3><SubmissionList items={t.submissions} milestones={t.milestones} empty={fr ? 'Aucun dépôt.' : 'No submissions.'} /></section>
            <section><h3 className="font-semibold text-slate-800 mb-2">{fr ? 'Historique' : 'History'}</h3><Timeline events={t.events} /></section>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Queue({ onChanged }: { onChanged: () => void }) {
  const fr = useFr();
  const [f, setF] = useState({ status: '', supervisor_id: '', programme_id: '', q: '' }); const [page, setPage] = useState(1); const [open, setOpen] = useState<Thesis | null>(null);
  const dq = useDebounced(f.q);
  const progs = useLoad(() => acad.programmes(), []);
  const sup = useLoad(() => thesisApi.supervisors(), []);
  const list = useLoad(() => thesisApi.list({ ...f, q: dq, page, limit: 15 }), [f.status, f.supervisor_id, f.programme_id, dq, page]);
  const set = (k: keyof typeof f, v: string) => { setPage(1); setF(x => ({ ...x, [k]: v })); };
  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <input aria-label="Search" className={input} placeholder={fr ? 'Étudiant ou sujet…' : 'Student or topic…'} value={f.q} onChange={e => set('q', e.target.value)} />
        <select aria-label="Status" className={input} value={f.status} onChange={e => set('status', e.target.value)}><option value="">{fr ? 'Tous statuts' : 'All statuses'}</option>{[...THESIS_STEPS, 'rejected', 'withdrawn'].map(s => <option key={s} value={s}>{statusLabel(s as never, fr)}</option>)}</select>
        <select aria-label="Programme" className={input} value={f.programme_id} onChange={e => set('programme_id', e.target.value)}><option value="">{fr ? 'Toutes filières' : 'All programmes'}</option>{(progs.data ?? []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <select aria-label="Supervisor" className={input} value={f.supervisor_id} onChange={e => set('supervisor_id', e.target.value)}><option value="">{fr ? 'Tous encadrants' : 'All supervisors'}</option>{(sup.data?.items ?? []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
      </div>
      <ErrorBox message={list.error} />
      {!list.data ? <Spinner /> : (
        <div className="bg-white rounded-xl border border-slate-200">
          <Table min={760} head={[fr ? 'Étudiant' : 'Student', fr ? 'Sujet' : 'Topic', fr ? 'Encadrant' : 'Supervisor', fr ? 'Statut' : 'Status', '']} empty={list.data.items.length ? undefined : (fr ? 'Aucun dossier.' : 'No theses.')}>
            {list.data.items.map(t => (
              <tr key={t.id}>
                <td className="px-4 py-3"><p className="font-medium text-slate-800">{t.student?.name}</p><p className="text-xs text-slate-500">{t.student?.programme ?? '—'}</p></td>
                <td className="px-4 py-3 text-slate-700 break-words max-w-xs">{t.title}</td>
                <td className="px-4 py-3 text-slate-600">{t.supervisor?.name ?? <span className="text-amber-600">{fr ? 'À affecter' : 'Unassigned'}</span>}</td>
                <td className="px-4 py-3"><ThesisStatusBadge status={t.status} /></td>
                <td className="px-4 py-3 text-right"><button className="text-indigo-600 hover:underline text-sm" onClick={() => setOpen(t)}>{fr ? 'Ouvrir' : 'Open'}</button></td>
              </tr>
            ))}
          </Table>
          <Pager page={page} limit={15} total={list.data.total} onPage={setPage} />
        </div>
      )}
      {open && <Detail id={open.id} onClose={() => setOpen(null)} onChanged={() => { list.reload(); onChanged(); }} />}
    </div>
  );
}

export default function ThesisAdmin() {
  const fr = useFr(); const { lang } = useLanguage();
  const [tab, setTab] = useState<Tab>('queue');
  const dash = useLoad(() => thesisApi.dashboard(), []);
  const d = dash.data;
  const c = d?.status_counts;
  return (
    <div className="space-y-5">
      <PageHeader title={fr ? 'Mémoires & thèses' : 'Thesis & final-year projects'} subtitle={fr ? 'Propositions, encadrement, soutenances et résultats.' : 'Proposals, supervision, defences and results.'} onRefresh={dash.reload} />
      <ErrorBox message={dash.error} />
      {c && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Stat label={fr ? 'À approuver' : 'Awaiting approval'} value={String(d.awaiting_approval)} tone={d.awaiting_approval ? 'warn' : undefined} />
          <Stat label={fr ? 'En attente d’encadrant' : 'Proposed'} value={String(c.proposed)} />
          <Stat label={fr ? 'En cours' : 'In progress'} value={String(c.in_progress + c.approved)} />
          <Stat label={fr ? 'Soutenances à venir' : 'Defences scheduled'} value={String(c.defence_scheduled)} />
          <Stat label={fr ? 'Terminés' : 'Completed'} value={String(c.completed)} tone="good" />
        </div>
      )}
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ id: 'queue', label: fr ? 'Dossiers' : 'Queue', badge: d?.awaiting_approval }, { id: 'workload', label: fr ? 'Charge des encadrants' : 'Supervisor workload' }, { id: 'defences', label: fr ? 'Soutenances' : 'Defences' }]} />
      {tab === 'queue' && <Queue onChanged={dash.reload} />}
      {tab === 'workload' && (!d ? <Spinner /> : (
        <Table min={520} head={[fr ? 'Encadrant' : 'Supervisor', fr ? 'En charge' : 'Current load', fr ? 'Terminés' : 'Completed', '']}>
          {d.workload.map(w => (
            <tr key={w.supervisor_id}>
              <td className="px-4 py-3 font-medium text-slate-800">{w.name}</td>
              <td className="px-4 py-3 text-slate-700">{w.load} / {w.max}</td>
              <td className="px-4 py-3 text-slate-600">{w.completed}</td>
              <td className="px-4 py-3 w-48"><div className="h-2 rounded-full bg-slate-100"><div className={`h-2 rounded-full ${w.load >= w.max ? 'bg-red-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min(100, (w.load / w.max) * 100)}%` }} /></div></td>
            </tr>
          ))}
        </Table>
      ))}
      {tab === 'defences' && (!d ? <Spinner /> : (
        <Table min={640} head={[fr ? 'Date' : 'Date', fr ? 'Étudiant' : 'Student', fr ? 'Sujet' : 'Topic', fr ? 'Salle' : 'Room', 'Jury']} empty={d.upcoming_defences.length ? undefined : (fr ? 'Aucune soutenance planifiée.' : 'No upcoming defences.')}>
          {d.upcoming_defences.map(t => (
            <tr key={t.id} className="align-top">
              <td className="px-4 py-3 whitespace-nowrap text-slate-800">{fmtDate(t.defence?.date, lang)} · {t.defence?.time}</td>
              <td className="px-4 py-3 text-slate-700">{t.student?.name}</td><td className="px-4 py-3 text-slate-600 break-words max-w-xs">{t.title}</td>
              <td className="px-4 py-3 text-slate-600">{t.defence?.room}</td>
              <td className="px-4 py-3 text-xs text-slate-500">{(t.defence?.jury ?? []).map(j => <Badge key={j.name}>{j.name}</Badge>)}</td>
            </tr>
          ))}
        </Table>
      ))}
    </div>
  );
}
