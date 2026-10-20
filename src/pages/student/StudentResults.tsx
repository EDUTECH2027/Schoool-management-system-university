import { useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { acad } from '../../api/academics';
import { Badge, ErrorBox, Field, Modal, PageHeader, Spinner, Stat, StatusBadge, btnGhost, btnPrimary, input, msg, useLoad } from '../../composants/academics/ui';
import { useLanguage } from '../../i18n/LanguageContext';

export default function StudentResults() {
  const { lang } = useLanguage(); const fr = lang === 'fr';
  const r = useLoad(acad.myResults);
  const prog = useLoad(acad.myProgression);
  const [appeal, setAppeal] = useState<{ markId: string; course: string } | null>(null);
  const [reason, setReason] = useState(''); const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const send = async () => {
    try { await acad.appeal(appeal!.markId, reason); setOk(fr ? 'Réclamation envoyée.' : 'Appeal submitted.'); setAppeal(null); setReason(''); void r.reload(); }
    catch (e) { setErr(msg(e)); }
  };
  const OUT: Record<string, [string, string]> = { promoted: ['Admis en classe supérieure', 'Promoted to the next level'], carryover: ['Admis avec cours à repasser', 'Promoted with carry-over courses'], repeat: ['Redoublement', 'Repeat the level'], probation: ['Probation académique', 'Academic probation'], eligible_graduation: ['Éligible au diplôme', 'Eligible to graduate'] };
  return (
    <div className="space-y-5">
      <PageHeader title={fr ? 'Mes résultats' : 'My results'} subtitle={fr ? 'Seuls les résultats validés et publiés apparaissent ici.' : 'Only validated, published results appear here.'} onRefresh={() => void r.reload()} />
      <ErrorBox message={r.error} />{ok && <p role="status" className="text-sm text-emerald-700">{ok}</p>}
      {(prog.data ?? []).map(p => (
        <div key={p.id} className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm">
          <p className="font-semibold text-indigo-800">{p.academic_year} · {OUT[p.outcome]?.[fr ? 0 : 1] ?? p.outcome}</p>
          <p className="text-indigo-700/80">GPA {p.metrics.year_gpa} · {fr ? 'cumulé' : 'cumulative'} {p.metrics.cumulative_gpa} · {p.metrics.earned_credits} {fr ? 'crédits validés' : 'credits earned'}{p.note ? ` — ${p.note}` : ''}</p>
        </div>
      ))}
      {!r.data ? <Spinner /> : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Stat label={fr ? 'GPA cumulé' : 'Cumulative GPA'} value={String(r.data.cumulative.gpa)} />
            <Stat label={fr ? 'Crédits validés' : 'Credits earned'} value={String(r.data.cumulative.earned)} sub={`/ ${r.data.cumulative.credits}`} />
            <Stat label={fr ? 'Note de passage' : 'Pass mark'} value={String(r.data.pass_mark)} />
          </div>
          {r.data.terms.length === 0 && <p className="text-sm text-slate-400 bg-white rounded-xl border border-slate-200 p-8 text-center">{fr ? 'Aucun résultat publié pour le moment.' : 'No published results yet.'}</p>}
          {r.data.terms.map(t => (
            <section key={t.term_id} className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
              <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3"><h2 className="font-semibold text-slate-800 mr-auto">{t.academic_year} · {t.term}</h2><Badge tone="indigo">GPA {t.gpa}</Badge><span className="text-xs text-slate-500">{t.earned}/{t.credits} {fr ? 'crédits' : 'credits'}</span></div>
              <table className="w-full text-sm min-w-[640px]"><thead className="text-xs uppercase text-slate-500 bg-slate-50"><tr><th className="text-left px-4 py-2">{fr ? 'Cours' : 'Course'}</th><th className="px-2">CA</th><th className="px-2">{fr ? 'Examen' : 'Exam'}</th><th className="px-2">Total</th><th className="px-2">{fr ? 'Note' : 'Grade'}</th><th className="px-2">{fr ? 'Résultat' : 'Result'}</th><th /></tr></thead>
                <tbody className="divide-y divide-slate-100 text-center">{t.courses.map(c => (
                  <tr key={c.mark_id}><td className="px-4 py-2.5 text-left"><p className="font-medium text-slate-800">{c.course}</p><p className="text-xs text-slate-400 font-mono">{c.code} · {c.credits} cr</p></td>
                    <td>{c.ca_score}</td><td>{c.exam_absent ? (fr ? 'Absent' : 'Absent') : c.exam_score}</td><td className="font-medium">{c.total_score}</td><td className="font-semibold">{c.grade}</td>
                    <td>{c.passed ? <span className="inline-flex items-center gap-1 text-emerald-600 text-xs"><CheckCircle2 size={14} /> {fr ? 'Validé' : 'Passed'}</span> : <span className="inline-flex items-center gap-1 text-red-600 text-xs"><XCircle size={14} /> {fr ? 'Non validé' : 'Not passed'}</span>}</td>
                    <td className="px-3 text-right">{c.appeal ? <StatusBadge status={c.appeal.status} /> : <button className={btnGhost} onClick={() => { setErr(''); setReason(''); setAppeal({ markId: c.mark_id, course: c.course }); }}>{fr ? 'Contester' : 'Appeal'}</button>}</td></tr>))}</tbody></table>
            </section>
          ))}
        </>
      )}
      {appeal && (
        <Modal title={`${fr ? 'Réclamation' : 'Grade appeal'} · ${appeal.course}`} onClose={() => setAppeal(null)}>
          <Field label={fr ? 'Expliquez votre demande' : 'Explain your request'} hint={fr ? 'Au moins une phrase. Un responsable examinera votre demande.' : 'At least a sentence. A reviewer will look at your request.'}><textarea rows={4} className={`${input} w-full`} value={reason} onChange={e => setReason(e.target.value)} /></Field>
          <div className="mt-2"><ErrorBox message={err} /></div>
          <div className="flex justify-end gap-2 pt-4"><button className={btnGhost} onClick={() => setAppeal(null)}>{fr ? 'Annuler' : 'Cancel'}</button><button className={btnPrimary} disabled={reason.trim().length < 10} onClick={send}>{fr ? 'Envoyer' : 'Submit'}</button></div>
        </Modal>
      )}
    </div>
  );
}
