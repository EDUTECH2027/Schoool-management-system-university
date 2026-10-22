import { useEffect, useState } from 'react';
import { FileText, Plus, Send } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { services, type ServiceRequest, type ServiceType } from '../../api/services';
import { Badge, ErrorBox, Field, Modal, PageHeader, Spinner, Table, btnDanger, btnGhost, btnPrimary, fmtDate, fmtDateTime, input, msg, useFr, useLoad } from '../../composants/academics/ui';
import { ServiceStatusBadge, TYPE_LABEL, Timeline, textarea, typeLabel } from '../../composants/services/ServiceBits';

const TYPES = Object.keys(TYPE_LABEL) as ServiceType[];

function NewRequest({ onClose, onDone, max }: { onClose: () => void; onDone: (r: ServiceRequest) => void; max: number }) {
  const fr = useFr();
  const [type, setType] = useState<ServiceType>('certificate');
  const [subject, setSubject] = useState(''); const [description, setDescription] = useState('');
  const [p, setP] = useState<Record<string, string>>({});
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setP(x => ({ ...x, [k]: v }));
  const submit = async () => {
    setBusy(true); setErr('');
    try { onDone(await services.create({ type, subject, description, payload: p })); } catch (e) { setErr(msg(e)); } finally { setBusy(false); }
  };
  const doc = type === 'certificate' || type === 'transcript';
  return (
    <Modal title={fr ? 'Nouvelle demande' : 'New request'} onClose={onClose}>
      <div className="space-y-3">
        <Field label={fr ? 'Type de demande' : 'Request type'}>
          <select className={`${input} w-full`} value={type} onChange={e => setType(e.target.value as ServiceType)} aria-label="Request type">
            {TYPES.map(t => <option key={t} value={t}>{typeLabel(t, fr)}</option>)}
          </select>
        </Field>
        {doc && <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">{type === 'certificate'
          ? (fr ? 'Une fois approuvée, l’attestation officielle (avec code de vérification) apparaît dans « Dossier & documents ».' : 'Once approved, the official certificate (with a verification code) appears in “File & documents”.')
          : (fr ? 'Le relevé n’est délivré que si des résultats publiés existent. Il apparaîtra dans « Dossier & documents ».' : 'A transcript can only be issued when published results exist. It will appear in “File & documents”.')}</p>}
        <Field label={fr ? 'Objet' : 'Subject'} hint="3–150"><input className={`${input} w-full`} value={subject} maxLength={150} onChange={e => setSubject(e.target.value)} placeholder={typeLabel(type, fr)} /></Field>
        {doc && <Field label={fr ? 'Motif (visa, bourse, stage…)' : 'Purpose (visa, scholarship, internship…)'}><input className={`${input} w-full`} value={p.purpose ?? ''} onChange={e => set('purpose', e.target.value)} /></Field>}
        {type === 'correction' && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label={fr ? 'Donnée ou note à corriger' : 'Data or grade to correct'}><input className={`${input} w-full`} value={p.field ?? ''} onChange={e => set('field', e.target.value)} /></Field>
            <Field label={fr ? 'Valeur correcte' : 'Correct value'}><input className={`${input} w-full`} value={p.requested_value ?? ''} onChange={e => set('requested_value', e.target.value)} /></Field>
          </div>
        )}
        {type === 'leave' && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label={fr ? 'Début' : 'Start date'}><input type="date" className={`${input} w-full`} value={p.start_date ?? ''} onChange={e => set('start_date', e.target.value)} /></Field>
            <Field label={fr ? 'Fin prévue' : 'Expected end date'}><input type="date" className={`${input} w-full`} value={p.end_date ?? ''} onChange={e => set('end_date', e.target.value)} /></Field>
          </div>
        )}
        <Field label={fr ? 'Détails' : 'Details'}><textarea className={textarea} rows={4} maxLength={4000} value={description} onChange={e => setDescription(e.target.value)} /></Field>
        <p className="text-xs text-slate-400">{fr ? `Vous pouvez avoir ${max} demandes ouvertes au maximum.` : `You can have at most ${max} open requests.`}</p>
        <ErrorBox message={err} />
        <div className="flex justify-end gap-2"><button className={btnGhost} onClick={onClose}>{fr ? 'Fermer' : 'Close'}</button><button className={btnPrimary} disabled={busy || subject.trim().length < 3} onClick={submit}><Send size={14} /> {fr ? 'Envoyer' : 'Submit'}</button></div>
      </div>
    </Modal>
  );
}

function Detail({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const fr = useFr(); const nav = useNavigate();
  const d = useLoad(() => services.mineOne(id), [id]);
  const [text, setText] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [confirm, setConfirm] = useState(false);
  const r = d.data;
  const act = async (fn: () => Promise<unknown>) => { setBusy(true); setErr(''); try { await fn(); setText(''); setConfirm(false); d.reload(); onChanged(); } catch (e) { setErr(msg(e)); } finally { setBusy(false); } };
  return (
    <Modal title={r ? `${r.reference} · ${typeLabel(r.type, fr)}` : (fr ? 'Demande' : 'Request')} onClose={onClose} wide>
      {!r ? (d.error ? <ErrorBox message={d.error} /> : <Spinner />) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2"><ServiceStatusBadge status={r.status} /><span className="text-xs text-slate-500">{fr ? 'Créée le' : 'Created'} {fmtDateTime(r.created_at, fr ? 'fr' : 'en')}</span></div>
          <div><p className="font-semibold text-slate-800">{r.subject}</p>{r.description && <p className="text-sm text-slate-600 whitespace-pre-wrap mt-1">{r.description}</p>}</div>
          {r.payload && Object.keys(r.payload).length > 0 && <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">{Object.entries(r.payload).map(([k, v]) => <div key={k}><dt className="inline text-slate-500">{k.replace(/_/g, ' ')}: </dt><dd className="inline text-slate-800">{String(v)}</dd></div>)}</dl>}
          {r.decision_note && <p className="text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"><span className="font-medium">{fr ? 'Décision : ' : 'Decision: '}</span>{r.decision_note}</p>}
          {r.document_id && (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-sm text-emerald-800">
              <FileText size={16} /> <span className="mr-auto">{fr ? 'Votre document officiel a été émis.' : 'Your official document has been issued.'}</span>
              <button className={btnGhost} onClick={() => nav('/student/documents')}>{fr ? 'Ouvrir mes documents' : 'Open my documents'}</button>
            </div>
          )}
          {r.status === 'awaiting_info' && <p className="text-sm bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-lg px-3 py-2">{fr ? 'Le service attend votre réponse : répondez ci-dessous pour relancer l’examen.' : 'Staff are waiting for your answer: reply below to resume the review.'}</p>}
          <Timeline events={r.events} />
          {r.can_comment && (
            <div className="space-y-2">
              <textarea className={textarea} rows={3} maxLength={2000} value={text} onChange={e => setText(e.target.value)} placeholder={fr ? 'Écrire un message…' : 'Write a message…'} aria-label={fr ? 'Message' : 'Message'} />
              <div className="flex flex-wrap justify-end gap-2">
                {r.can_cancel && !confirm && <button className={btnGhost} onClick={() => setConfirm(true)}>{fr ? 'Annuler la demande' : 'Cancel request'}</button>}
                {confirm && <button className={btnDanger} disabled={busy} onClick={() => act(() => services.cancel(id))}>{fr ? 'Confirmer l’annulation' : 'Confirm cancellation'}</button>}
                <button className={btnPrimary} disabled={busy || !text.trim()} onClick={() => act(() => services.comment(id, text))}><Send size={14} /> {fr ? 'Envoyer' : 'Send'}</button>
              </div>
            </div>
          )}
          <ErrorBox message={err} />
        </div>
      )}
    </Modal>
  );
}

export default function StudentServices() {
  const fr = useFr();
  const [params, setParams] = useSearchParams();
  const meta = useLoad(() => services.meta(), []);
  const list = useLoad(() => services.mine(), []);
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(params.get('id'));
  const [ok, setOk] = useState('');
  useEffect(() => { const i = params.get('id'); if (i) setOpenId(i); }, [params]);
  const close = () => { setOpenId(null); if (params.get('id')) setParams({}, { replace: true }); };
  const rows = list.data ?? [];
  return (
    <div className="space-y-5">
      <PageHeader title={fr ? 'Mes demandes' : 'My service requests'} subtitle={fr ? 'Attestations, relevés, corrections, congés, réclamations' : 'Certificates, transcripts, corrections, leave, complaints'} onRefresh={list.reload}>
        <button className={btnPrimary} onClick={() => { setCreating(true); setOk(''); }}><Plus size={14} /> {fr ? 'Nouvelle demande' : 'New request'}</button>
      </PageHeader>
      <ErrorBox message={list.error} />
      {ok && <p role="status" className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{ok}</p>}
      {list.loading && !list.data ? <Spinner /> : (
        <Table head={[fr ? 'Référence' : 'Reference', 'Type', fr ? 'Objet' : 'Subject', fr ? 'Statut' : 'Status', fr ? 'Date' : 'Date']} empty={rows.length ? undefined : (fr ? 'Aucune demande pour le moment.' : 'No requests yet.')}>
          {rows.map(r => (
            <tr key={r.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setOpenId(r.id)} data-testid="req-row">
              <td className="px-4 py-3 font-mono text-xs"><button className="text-indigo-600 hover:underline" onClick={e => { e.stopPropagation(); setOpenId(r.id); }}>{r.reference}</button></td>
              <td className="px-4 py-3">{typeLabel(r.type, fr)}</td>
              <td className="px-4 py-3 max-w-[18rem] truncate">{r.subject}</td>
              <td className="px-4 py-3"><ServiceStatusBadge status={r.status} />{r.document_id && <span className="ml-1"><Badge tone="green">{fr ? 'Document' : 'Document'}</Badge></span>}</td>
              <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmtDate(r.created_at, fr ? 'fr' : 'en')}</td>
            </tr>
          ))}
        </Table>
      )}
      {creating && <NewRequest max={meta.data?.max_open ?? 10} onClose={() => setCreating(false)} onDone={r => { setCreating(false); setOk(`${fr ? 'Demande envoyée' : 'Request submitted'} — ${r.reference}`); list.reload(); setOpenId(r.id); }} />}
      {openId && <Detail id={openId} onClose={close} onChanged={list.reload} />}
    </div>
  );
}
