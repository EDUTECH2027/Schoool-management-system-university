import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { thesisApi, type Supervisee } from '../../api/thesis';
import SuperviseDetail from '../../composants/thesis/SuperviseDetail';
import { KIND, ThesisStatusBadge } from '../../composants/thesis/shared';
import { Badge, ErrorBox, Field, Modal, PageHeader, Spinner, Table, btnGhost, btnPrimary, fmtDate, input, msg, useFr, useLoad } from '../../composants/academics/ui';
import { useLanguage } from '../../i18n/LanguageContext';

export default function TeacherThesis() {
  const fr = useFr(); const { lang } = useLanguage();
  const sv = useLoad(() => thesisApi.supervision(), []);
  const [open, setOpen] = useState<string | null>(null); const [decline, setDecline] = useState<Supervisee | null>(null); const [reason, setReason] = useState('');
  const [err, setErr] = useState(''); const [busy, setBusy] = useState('');
  const d = sv.data;
  const accept = async (t: Supervisee) => { setBusy(t.id); setErr(''); try { await thesisApi.accept(t.id); sv.reload(); } catch (e) { setErr(msg(e)); } finally { setBusy(''); } };
  const doDecline = async () => {
    if (!decline) return;
    setBusy(decline.id); setErr('');
    try { await thesisApi.decline(decline.id, reason); setDecline(null); setReason(''); sv.reload(); } catch (e) { setErr(msg(e)); } finally { setBusy(''); }
  };
  return (
    <div className="space-y-5">
      <PageHeader title={fr ? 'Mémoires encadrés' : 'Thesis supervision'} subtitle={fr ? 'Demandes d’encadrement, jalons et relecture des dépôts.' : 'Supervision requests, milestones and submission reviews.'} onRefresh={sv.reload} />
      <ErrorBox message={err || sv.error} />
      {!d ? <Spinner /> : (
        <>
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center gap-x-6 gap-y-2">
            <div><p className="text-xs text-slate-500">{fr ? 'Étudiants encadrés' : 'Current supervisees'}</p><p className="text-xl font-bold text-slate-800">{d.load} / {d.max}</p></div>
            <div className="flex-1 min-w-40"><div className="h-2 rounded-full bg-slate-100"><div className={`h-2 rounded-full ${d.load >= d.max ? 'bg-red-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min(100, (d.load / d.max) * 100)}%` }} /></div></div>
            {d.load >= d.max && <p className="text-xs text-red-600 flex items-center gap-1"><AlertTriangle size={14} /> {fr ? 'Capacité atteinte : vous ne pouvez plus accepter de nouvelle demande.' : 'At capacity: you cannot accept new requests.'}</p>}
          </div>

          <section>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">{fr ? 'Demandes à traiter' : 'Requests to answer'} ({d.requests.length})</h2>
            {d.requests.length ? (
              <div className="space-y-3">
                {d.requests.map(t => (
                  <article key={t.id} className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
                    <div className="flex flex-wrap items-start gap-2"><div className="min-w-0 flex-1"><h3 className="font-semibold text-slate-800 break-words">{t.title}</h3><p className="text-xs text-slate-500">{t.student?.name} · {t.student?.programme ?? '—'} · {KIND[t.kind][fr ? 1 : 0]}</p></div></div>
                    {t.abstract && <p className="text-sm text-slate-600 whitespace-pre-line break-words line-clamp-5">{t.abstract}</p>}
                    {t.keywords && <p className="text-xs text-slate-400">{t.keywords}</p>}
                    <div className="flex flex-wrap gap-2"><button className={btnPrimary} disabled={busy === t.id || d.load >= d.max} onClick={() => accept(t)}>{fr ? 'Accepter d’encadrer' : 'Accept supervision'}</button><button className={btnGhost} onClick={() => { setDecline(t); setReason(''); }}>{fr ? 'Décliner' : 'Decline'}</button></div>
                  </article>
                ))}
              </div>
            ) : <p className="text-sm text-slate-400 bg-white rounded-xl border border-slate-200 px-4 py-6 text-center">{fr ? 'Aucune demande en attente.' : 'No pending requests.'}</p>}
          </section>

          <section>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">{fr ? 'Mes étudiants' : 'My supervisees'} ({d.supervisees.length})</h2>
            <Table min={760} head={[fr ? 'Étudiant' : 'Student', fr ? 'Sujet' : 'Topic', fr ? 'Statut' : 'Status', fr ? 'Jalons' : 'Milestones', fr ? 'Prochaine échéance' : 'Next deadline', '']} empty={d.supervisees.length ? undefined : (fr ? 'Aucun étudiant encadré.' : 'No supervisees yet.')}>
              {d.supervisees.map(t => (
                <tr key={t.id} className="align-top">
                  <td className="px-4 py-3"><p className="font-medium text-slate-800">{t.student?.name}</p><p className="text-xs text-slate-500">{t.student?.matricule}{t.role === 'co_supervisor' ? ` · ${fr ? 'co-encadrant' : 'co-supervisor'}` : ''}</p></td>
                  <td className="px-4 py-3 text-slate-700 break-words max-w-xs">{t.title}</td>
                  <td className="px-4 py-3"><ThesisStatusBadge status={t.status} /></td>
                  <td className="px-4 py-3 text-slate-600">{t.milestones_done}/{t.milestones_total}{t.awaiting_review > 0 && <span className="ml-2"><Badge tone="amber">{t.awaiting_review} {fr ? 'à relire' : 'to review'}</Badge></span>}</td>
                  <td className={`px-4 py-3 ${t.overdue ? 'text-red-600 font-medium' : 'text-slate-600'}`}>{fmtDate(t.next_deadline, lang)}{t.overdue ? ` (${fr ? 'en retard' : 'overdue'})` : ''}</td>
                  <td className="px-4 py-3 text-right"><button className="text-indigo-600 hover:underline text-sm" onClick={() => setOpen(t.id)}>{fr ? 'Ouvrir' : 'Open'}</button></td>
                </tr>
              ))}
            </Table>
          </section>
        </>
      )}
      {open && <SuperviseDetail id={open} onClose={() => setOpen(null)} onChanged={sv.reload} />}
      {decline && (
        <Modal title={fr ? 'Décliner la demande' : 'Decline this request'} onClose={() => setDecline(null)}>
          <div className="space-y-3">
            <p className="text-sm text-slate-600 break-words">{decline.title}</p>
            <Field label={fr ? 'Motif (obligatoire, communiqué à l’étudiant)' : 'Reason (required, shared with the student)'}><textarea className={`${input} w-full`} rows={4} maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} /></Field>
            <div className="flex justify-end gap-2"><button className={btnGhost} onClick={() => setDecline(null)}>{fr ? 'Annuler' : 'Cancel'}</button><button className={btnPrimary} disabled={!reason.trim() || busy === decline.id} onClick={doDecline}>{fr ? 'Décliner' : 'Decline'}</button></div>
          </div>
        </Modal>
      )}
    </div>
  );
}
