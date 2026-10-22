import { useEffect, useState } from 'react';
import { Clock, Lock, Send, UserCheck } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { services, type ServiceStatus, type StaffRequest } from '../../api/services';
import { Badge, ErrorBox, Modal, PageHeader, Pager, Spinner, Table, btnGhost, btnPrimary, fmtDate, input, msg, useDebounced, useFr, useLoad } from '../../composants/academics/ui';
import { STATUS_LABEL, ServiceStatusBadge, TYPE_LABEL, Timeline, statusLabel, textarea, typeLabel } from '../../composants/services/ServiceBits';

const STATUSES = Object.keys(STATUS_LABEL) as ServiceStatus[];
const NEEDS_NOTE: ServiceStatus[] = ['awaiting_info', 'rejected', 'cancelled'];
const FLOW: Record<ServiceStatus, ServiceStatus[]> = {
  submitted: ['in_review', 'cancelled'], in_review: ['awaiting_info', 'approved', 'rejected', 'cancelled'], awaiting_info: ['in_review', 'rejected', 'cancelled'],
  approved: ['completed'], rejected: [], completed: [], cancelled: [],
};
const ACTION_LABEL: Record<ServiceStatus, [string, string]> = {
  submitted: ['', ''], in_review: ['Start review', 'Prendre en charge'], awaiting_info: ['Ask for information', 'Demander des informations'], approved: ['Approve', 'Approuver'],
  rejected: ['Decline', 'Refuser'], completed: ['Complete', 'Terminer'], cancelled: ['Cancel request', 'Annuler la demande'],
};

function Drawer({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const fr = useFr();
  const d = useLoad(() => services.one(id), [id]);
  const users = useLoad(() => services.staffUsers(), []);
  const [mode, setMode] = useState<'reply' | 'note'>('reply');
  const [text, setText] = useState(''); const [note, setNote] = useState(''); const [pending, setPending] = useState<ServiceStatus | null>(null);
  const [err, setErr] = useState(''); const [info, setInfo] = useState(''); const [busy, setBusy] = useState(false);
  const r = d.data;
  const act = async (fn: () => Promise<unknown>, done?: string) => {
    setBusy(true); setErr(''); setInfo('');
    try { await fn(); setText(''); setNote(''); setPending(null); if (done) setInfo(done); d.reload(); onChanged(); } catch (e) { setErr(msg(e)); } finally { setBusy(false); }
  };
  const issues = r && (r.type === 'certificate' || r.type === 'transcript');
  return (
    <Modal title={r ? `${r.reference} · ${typeLabel(r.type, fr)}` : (fr ? 'Demande' : 'Request')} onClose={onClose} wide>
      {!r ? (d.error ? <ErrorBox message={d.error} /> : <Spinner />) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <ServiceStatusBadge status={r.status} />
            {r.overdue && <Badge tone="red">{fr ? 'En retard' : 'Overdue'}</Badge>}
            <span className="text-xs text-slate-500 flex items-center gap-1"><Clock size={12} /> {r.age_days} {fr ? 'j' : 'd'} / SLA {r.sla_days} {fr ? 'j' : 'd'}</span>
          </div>
          <div className="text-sm"><p className="font-semibold text-slate-800">{r.subject}</p>
            <p className="text-slate-500">{r.student} · {r.matricule}{r.class_name ? ` · ${r.class_name}` : ''}</p>
            {r.description && <p className="text-slate-600 whitespace-pre-wrap mt-1">{r.description}</p>}
          </div>
          {r.payload && Object.keys(r.payload).length > 0 && <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">{Object.entries(r.payload).map(([k, v]) => <div key={k}><dt className="inline text-slate-500">{k.replace(/_/g, ' ')}: </dt><dd className="inline">{String(v)}</dd></div>)}</dl>}
          {r.document_id && <p className="text-sm bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-3 py-2">{fr ? 'Document officiel émis et lié à la demande.' : 'Official document issued and linked to this request.'}</p>}

          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm text-slate-600 flex items-center gap-1.5"><UserCheck size={14} /> {fr ? 'Responsable' : 'Assignee'}
              <select aria-label="Assignee" className={input} value={r.assigned_to ?? ''} disabled={busy || !['submitted', 'in_review', 'awaiting_info', 'approved'].includes(r.status)}
                onChange={e => act(() => services.assign(id, e.target.value || null))}>
                <option value="">{fr ? '— Non assignée —' : '— Unassigned —'}</option>
                {(users.data ?? []).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </label>
          </div>

          {FLOW[r.status].length > 0 && (
            <div className="space-y-2" data-testid="status-actions">
              <div className="flex flex-wrap gap-2">
                {FLOW[r.status].map(to => (
                  <button key={to} className={to === 'rejected' || to === 'cancelled' ? btnGhost : btnPrimary} disabled={busy} onClick={() => { setPending(to); setNote(''); setErr(''); }}>
                    {to === 'completed' && issues ? (fr ? 'Terminer et émettre le document' : 'Complete & issue document') : ACTION_LABEL[to][fr ? 1 : 0]}
                  </button>
                ))}
              </div>
              {pending && (
                <div className="border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50">
                  <p className="text-sm font-medium">{statusLabel(pending, fr)}{NEEDS_NOTE.includes(pending) && <span className="text-red-600"> *</span>}</p>
                  <textarea className={textarea} rows={2} maxLength={2000} value={note} onChange={e => setNote(e.target.value)} aria-label="Decision note"
                    placeholder={NEEDS_NOTE.includes(pending) ? (fr ? 'Motif obligatoire (visible par l’étudiant)' : 'Reason required (visible to the student)') : (fr ? 'Note (visible par l’étudiant, facultatif)' : 'Note (visible to the student, optional)')} />
                  <div className="flex justify-end gap-2">
                    <button className={btnGhost} onClick={() => setPending(null)}>{fr ? 'Retour' : 'Back'}</button>
                    <button className={btnPrimary} disabled={busy || (NEEDS_NOTE.includes(pending) && note.trim().length < 3)} onClick={() => act(() => services.setStatus(id, pending, note.trim() || undefined), fr ? 'Statut mis à jour.' : 'Status updated.')}>{fr ? 'Confirmer' : 'Confirm'}</button>
                  </div>
                </div>
              )}
            </div>
          )}
          {info && <p role="status" className="text-sm text-emerald-700">{info}</p>}
          <ErrorBox message={err} />

          <Timeline events={r.events} />

          {['submitted', 'in_review', 'awaiting_info', 'approved'].includes(r.status) && (
            <div className="space-y-2">
              <div className="flex gap-1" role="tablist">
                <button role="tab" aria-selected={mode === 'reply'} className={`px-3 py-1.5 text-sm rounded-lg ${mode === 'reply' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`} onClick={() => setMode('reply')}>{fr ? 'Répondre à l’étudiant' : 'Reply to student'}</button>
                <button role="tab" aria-selected={mode === 'note'} className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1 ${mode === 'note' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'}`} onClick={() => setMode('note')}><Lock size={12} /> {fr ? 'Note interne' : 'Internal note'}</button>
              </div>
              <textarea className={textarea} rows={3} maxLength={2000} value={text} onChange={e => setText(e.target.value)} aria-label={mode === 'note' ? 'Internal note' : 'Reply'}
                placeholder={mode === 'note' ? (fr ? 'Visible uniquement par le personnel' : 'Only staff can see this') : (fr ? 'Visible par l’étudiant' : 'The student will see this')} />
              <div className="flex justify-end"><button className={btnPrimary} disabled={busy || !text.trim()} onClick={() => act(() => (mode === 'note' ? services.note(id, text) : services.reply(id, text)))}><Send size={14} /> {mode === 'note' ? (fr ? 'Ajouter la note' : 'Add note') : (fr ? 'Envoyer' : 'Send')}</button></div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export default function ServiceDesk() {
  const fr = useFr();
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState('open'); const [type, setType] = useState(''); const [assignee, setAssignee] = useState('');
  const [search, setSearch] = useState(''); const [overdue, setOverdue] = useState(false); const [page, setPage] = useState(1);
  const q = useDebounced(search);
  const [openId, setOpenId] = useState<string | null>(params.get('id'));
  const users = useLoad(() => services.staffUsers(), []);
  const list = useLoad(() => services.list({ status: overdue ? undefined : status === 'all' ? undefined : status, type, assignee, search: q, overdue: overdue ? '1' : undefined, page, limit: 20 }), [status, type, assignee, q, overdue, page]);
  useEffect(() => { setPage(1); }, [status, type, assignee, q, overdue]);
  useEffect(() => { const i = params.get('id'); if (i) setOpenId(i); }, [params]);
  const close = () => { setOpenId(null); if (params.get('id')) setParams({}, { replace: true }); };
  const d = list.data;
  const open = d ? (['submitted', 'in_review', 'awaiting_info', 'approved'] as const).reduce((n, s) => n + (d.counts[s] ?? 0), 0) : 0;
  return (
    <div className="space-y-5">
      <PageHeader title={fr ? 'Guichet des demandes' : 'Service desk'} subtitle={d ? `${open} ${fr ? 'ouvertes' : 'open'} · SLA ${d.sla_days} ${fr ? 'jours' : 'days'}` : undefined} onRefresh={list.reload} />
      <div className="flex flex-wrap gap-2 items-center">
        <input className={`${input} w-full sm:w-64`} placeholder={fr ? 'Référence, objet, étudiant…' : 'Reference, subject, student…'} value={search} onChange={e => setSearch(e.target.value)} aria-label="Search" />
        <select className={input} value={status} onChange={e => setStatus(e.target.value)} disabled={overdue} aria-label="Status filter">
          <option value="open">{fr ? 'Ouvertes' : 'Open'}</option><option value="all">{fr ? 'Toutes' : 'All'}</option>
          {STATUSES.map(s => <option key={s} value={s}>{statusLabel(s, fr)}{d?.counts[s] ? ` (${d.counts[s]})` : ''}</option>)}
        </select>
        <select className={input} value={type} onChange={e => setType(e.target.value)} aria-label="Type filter"><option value="">{fr ? 'Tous types' : 'All types'}</option>{Object.keys(TYPE_LABEL).map(t => <option key={t} value={t}>{typeLabel(t, fr)}</option>)}</select>
        <select className={input} value={assignee} onChange={e => setAssignee(e.target.value)} aria-label="Assignee filter"><option value="">{fr ? 'Tous responsables' : 'Anyone'}</option><option value="me">{fr ? 'Moi' : 'Me'}</option><option value="none">{fr ? 'Non assignées' : 'Unassigned'}</option>{(users.data ?? []).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
        <label className="text-sm flex items-center gap-1.5 text-slate-600"><input type="checkbox" checked={overdue} onChange={e => setOverdue(e.target.checked)} /> {fr ? 'En retard' : 'Overdue only'}</label>
      </div>
      <ErrorBox message={list.error} />
      {list.loading && !d ? <Spinner /> : (
        <>
          <Table min={820} head={[fr ? 'Référence' : 'Reference', 'Type', fr ? 'Étudiant' : 'Student', fr ? 'Objet' : 'Subject', fr ? 'Statut' : 'Status', fr ? 'Responsable' : 'Assignee', fr ? 'Âge' : 'Age']} empty={d && d.items.length === 0 ? (fr ? 'Aucune demande.' : 'No requests match.') : undefined}>
            {(d?.items ?? []).map((r: StaffRequest) => (
              <tr key={r.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setOpenId(r.id)} data-testid="desk-row">
                <td className="px-4 py-3 font-mono text-xs text-indigo-600">{r.reference}</td>
                <td className="px-4 py-3">{typeLabel(r.type, fr)}</td>
                <td className="px-4 py-3">{r.student}<span className="block text-xs text-slate-400">{r.matricule}</span></td>
                <td className="px-4 py-3 max-w-[16rem] truncate">{r.subject}</td>
                <td className="px-4 py-3"><ServiceStatusBadge status={r.status} /></td>
                <td className="px-4 py-3 text-slate-600">{r.assignee_name ?? '—'}</td>
                <td className="px-4 py-3 whitespace-nowrap">{r.overdue ? <Badge tone="red">{r.age_days} {fr ? 'j' : 'd'} · {fr ? 'retard' : 'overdue'}</Badge> : <span className="text-slate-500">{r.age_days} {fr ? 'j' : 'd'}</span>}<span className="block text-xs text-slate-400">{fmtDate(r.created_at, fr ? 'fr' : 'en')}</span></td>
              </tr>
            ))}
          </Table>
          {d && <Pager page={d.page} limit={d.limit} total={d.total} onPage={setPage} />}
        </>
      )}
      {openId && <Drawer id={openId} onClose={close} onChanged={list.reload} />}
    </div>
  );
}
