import { useState } from 'react';
import { Check, X, Play } from 'lucide-react';
import { api } from '../../api/client';
import { acad, type Decision } from '../../api/academics';
import { Badge, ErrorBox, Field, Modal, PageHeader, Spinner, StatusBadge, Table, btnGhost, btnPrimary, input, msg, useDebounced, useFr, useLoad } from '../../composants/academics/ui';

export default function Progression() {
  const fr = useFr();
  const years = useLoad(() => api.getYears());
  const [yearId, setYearId] = useState('');
  const yid = yearId || years.data?.find(y => y.is_current)?.id || years.data?.[0]?.id || '';
  const [status, setStatus] = useState(''); const [outcome, setOutcome] = useState(''); const [q, setQ] = useState(''); const dq = useDebounced(q);
  const list = useLoad(() => (yid ? acad.decisions({ academicYearId: yid, status, outcome, q: dq }) : Promise.resolve([])), [yid, status, outcome, dq]);
  const cohorts = useLoad(acad.cohorts);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const [dec, setDec] = useState<{ d: Decision; decision: 'approve' | 'reject' } | null>(null);
  const [f, setF] = useState({ target: '', note: '' });

  const run = async () => {
    setBusy(true); setErr(''); setOk('');
    try { const r = await acad.runProgression({ academic_year_id: yid }); setOk(fr ? `${r.counts.proposed} proposition(s) calculée(s), ${r.counts.skipped} déjà validée(s).` : `${r.counts.proposed} proposal(s) computed, ${r.counts.skipped} already decided.`); void list.reload(); }
    catch (e) { setErr(msg(e)); } finally { setBusy(false); }
  };
  const submit = async () => {
    if (!dec) return;
    try { await acad.decideProgression(dec.d.id, { decision: dec.decision, target_class_id: f.target || undefined, note: f.note || undefined }); setDec(null); setErr(''); void list.reload(); } catch (e) { setErr(msg(e)); }
  };
  const apply = async (d: Decision) => { try { await acad.applyProgression(d.id); setErr(''); void list.reload(); } catch (e) { setErr(msg(e)); } };
  const needsTarget = (d: Decision) => d.outcome === 'promoted' || d.outcome === 'carryover';

  return (
    <div className="space-y-5">
      <PageHeader title={fr ? 'Passage de niveau & diplômes' : 'Progression & graduation'} subtitle={fr ? 'Calculé à partir des résultats publiés ; rien n’est appliqué sans validation.' : 'Computed from published results; nothing is applied without approval.'} onRefresh={() => void list.reload()}>
        <select aria-label="Academic year" className={input} value={yid} onChange={e => setYearId(e.target.value)}>{years.data?.map(y => <option key={y.id} value={y.id}>{y.label}</option>)}</select>
        <button className={btnPrimary} disabled={!yid || busy} onClick={run}><Play size={14} /> {fr ? 'Calculer les propositions' : 'Compute proposals'}</button>
      </PageHeader>
      <ErrorBox message={err || list.error} />{ok && <p className="text-sm text-emerald-600">{ok}</p>}
      <div className="flex flex-wrap gap-2">
        <input aria-label="Search" className={`${input} w-56`} placeholder={fr ? 'Étudiant…' : 'Student…'} value={q} onChange={e => setQ(e.target.value)} />
        <select aria-label="Status" className={input} value={status} onChange={e => setStatus(e.target.value)}><option value="">{fr ? 'Tous statuts' : 'All statuses'}</option>{['proposed', 'approved', 'rejected', 'applied'].map(s => <option key={s} value={s}>{s}</option>)}</select>
        <select aria-label="Outcome" className={input} value={outcome} onChange={e => setOutcome(e.target.value)}><option value="">{fr ? 'Toutes issues' : 'All outcomes'}</option>{['promoted', 'carryover', 'repeat', 'probation', 'eligible_graduation'].map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</select>
      </div>
      {!list.data ? <Spinner /> : (
        <Table min={940} head={[fr ? 'Étudiant' : 'Student', fr ? 'Classe' : 'Class', 'GPA', fr ? 'Crédits' : 'Credits', fr ? 'Proposition' : 'Proposal', fr ? 'Décision' : 'Decision', '']} empty={list.data.length ? undefined : (fr ? 'Aucune proposition : lancez le calcul.' : 'No proposals yet — run the computation.')}>
          {list.data.map(d => (
            <tr key={d.id}>
              <td className="px-4 py-3"><p className="font-medium text-slate-800">{d.name}</p><p className="text-xs text-slate-400">{d.matricule}</p></td>
              <td className="px-4 py-3 text-slate-600">{d.class_name ?? '—'}{d.target_class && <p className="text-xs text-indigo-600">→ {d.target_class}</p>}</td>
              <td className="px-4 py-3">{d.metrics.year_gpa}<p className="text-xs text-slate-400">{fr ? 'cumulé' : 'cumul.'} {d.metrics.cumulative_gpa}</p></td>
              <td className="px-4 py-3">{d.metrics.earned_credits}/{d.metrics.attempted_credits}{d.metrics.outstanding_courses > 0 && <p className="text-xs text-amber-600">{d.metrics.outstanding_courses} {fr ? 'à repasser' : 'outstanding'}</p>}</td>
              <td className="px-4 py-3"><StatusBadge status={d.outcome} />{d.metrics.reasons?.[0] && <p className="text-xs text-slate-500 mt-1 max-w-[16rem]">{d.metrics.reasons[0]}</p>}</td>
              <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
              <td className="px-4 py-3"><div className="flex gap-1 justify-end">
                {['proposed', 'rejected'].includes(d.status) && <><button aria-label="Approve" className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50" onClick={() => { setF({ target: d.target_class_id ?? '', note: '' }); setDec({ d, decision: 'approve' }); }}><Check size={16} /></button>
                  <button aria-label="Reject" className="p-1.5 rounded-lg text-red-600 hover:bg-red-50" onClick={() => { setF({ target: '', note: '' }); setDec({ d, decision: 'reject' }); }}><X size={16} /></button></>}
                {d.status === 'approved' && <button className={btnPrimary} onClick={() => apply(d)}>{fr ? 'Appliquer' : 'Apply'}</button>}
              </div></td>
            </tr>
          ))}
        </Table>
      )}
      {dec && (
        <Modal title={`${dec.decision === 'approve' ? (fr ? 'Approuver' : 'Approve') : (fr ? 'Refuser' : 'Reject')} · ${dec.d.name}`} onClose={() => setDec(null)}>
          <p className="text-sm text-slate-600 mb-3">{dec.d.outcome.replace('_', ' ')} <Badge tone="slate">GPA {dec.d.metrics.year_gpa}</Badge></p>
          {dec.decision === 'approve' && needsTarget(dec.d) && (
            <Field label={fr ? 'Classe d’accueil' : 'Class to move the student to'}><select className={`${input} w-full`} value={f.target} onChange={e => setF({ ...f, target: e.target.value })}><option value="">—</option>{cohorts.data?.map(c => <option key={c.id} value={c.id}>{c.name}{c.programme ? ` · ${c.programme}` : ''}</option>)}</select></Field>
          )}
          <div className="mt-3"><Field label={dec.decision === 'reject' ? (fr ? 'Motif (obligatoire)' : 'Reason (required)') : (fr ? 'Note (facultative)' : 'Note (optional)')}><textarea rows={3} className={`${input} w-full`} value={f.note} onChange={e => setF({ ...f, note: e.target.value })} /></Field></div>
          <div className="flex justify-end gap-2 pt-4"><button className={btnGhost} onClick={() => setDec(null)}>{fr ? 'Annuler' : 'Cancel'}</button><button className={btnPrimary} disabled={(dec.decision === 'reject' && !f.note.trim()) || (dec.decision === 'approve' && needsTarget(dec.d) && !f.target)} onClick={submit}>{fr ? 'Confirmer' : 'Confirm'}</button></div>
        </Modal>
      )}
    </div>
  );
}
