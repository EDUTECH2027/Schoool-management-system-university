import { useCallback, useEffect, useState } from 'react';
import { Upload, CheckCheck, Loader2, RefreshCw } from 'lucide-react';
import { payApi } from '../../api/payments';
import type { PayTx, ReconcileResult } from '../../api/payments';
import { useLanguage } from '../../i18n/LanguageContext';
import { ErrorBox, Spinner, btnGhost, btnPrimary } from '../../composants/payments/FinanceUi';
import { fmtMoney, fmtDateTime, TxStatusBadge } from '../../composants/payments/shared';
import TxDetail from '../../composants/payments/TxDetail';

const STATUS_TONE: Record<string, string> = {
  matched: 'bg-emerald-100 text-emerald-700', applied: 'bg-emerald-100 text-emerald-700', amount_mismatch: 'bg-red-100 text-red-700',
  not_found: 'bg-slate-100 text-slate-600', no_reference: 'bg-slate-100 text-slate-600', already_processed: 'bg-blue-100 text-blue-700', error: 'bg-red-100 text-red-700',
};

export default function FinanceReconciliation() {
  const { lang } = useLanguage();
  const fr = lang === 'fr';
  const [pending, setPending] = useState<PayTx[] | null>(null);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [csv, setCsv] = useState('');
  const [result, setResult] = useState<ReconcileResult | null>(null);
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => { try { setPending(await payApi.fin.pendingBank()); setErr(''); } catch (e) { setErr(e instanceof Error ? e.message : 'Failed'); } }, []);
  useEffect(() => { void load(); }, [load]);

  const run = async (apply: boolean) => {
    setBusy(apply ? 'apply' : 'preview'); setErr('');
    try { setResult(await payApi.fin.reconcile(csv, apply)); if (apply) await load(); } catch (e) { setErr(e instanceof Error ? e.message : 'Failed'); } finally { setBusy(''); }
  };
  const readFile = (f?: File) => { if (f) f.text().then(t => { setCsv(t); setResult(null); }); };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto"><h1 className="text-2xl font-bold text-slate-800">{fr ? 'Rapprochement bancaire' : 'Bank reconciliation'}</h1>
          <p className="text-sm text-slate-500">{fr ? 'Les virements ne sont crédités qu’après vérification.' : 'Bank transfers are credited only after verification.'}</p></div>
        <button className={btnGhost} onClick={() => void load()}><RefreshCw size={14} /> {fr ? 'Actualiser' : 'Refresh'}</button>
      </div>
      <ErrorBox message={err} />

      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">{fr ? 'Virements à vérifier' : 'Transfers awaiting verification'} {pending && `(${pending.length})`}</h2>
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          {!pending ? <Spinner /> : (
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="text-left px-4 py-3">{fr ? 'Référence' : 'Reference'}</th><th className="text-left px-4 py-3">{fr ? 'Étudiant' : 'Student'}</th><th className="text-right px-4 py-3">{fr ? 'Montant' : 'Amount'}</th><th className="text-left px-4 py-3">{fr ? 'Justificatif' : 'Slip'}</th><th className="text-left px-4 py-3">{fr ? 'Statut' : 'Status'}</th><th className="text-left px-4 py-3">{fr ? 'Créé' : 'Created'}</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {pending.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setOpen(t.id)}>
                    <td className="px-4 py-3 font-mono text-xs">{t.reference}</td>
                    <td className="px-4 py-3"><p className="font-medium text-slate-800">{t.student_name}</p><p className="text-xs text-slate-400">{t.matricule}</p></td>
                    <td className="px-4 py-3 text-right font-medium">{fmtMoney(t.amount, t.currency)}</td>
                    <td className="px-4 py-3 text-slate-600">{t.has_receipt ? '✓' : '—'}</td>
                    <td className="px-4 py-3"><TxStatusBadge status={t.status} /></td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmtDateTime(t.created_at, lang)}</td>
                  </tr>
                ))}
                {!pending.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400"><CheckCheck className="mx-auto mb-2 text-emerald-400" />{fr ? 'Tout est à jour' : 'Nothing waiting — all caught up'}</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <h2 className="font-semibold text-slate-800">{fr ? 'Importer un relevé bancaire (CSV)' : 'Import a bank statement (CSV)'}</h2>
        <p className="text-sm text-slate-500">{fr ? 'Chaque ligne contenant une référence EDU-… est comparée aux virements en attente (référence + montant exact). Commencez par un aperçu : rien n’est crédité tant que vous n’appliquez pas.' : 'Each row containing an EDU-… reference is matched to the waiting transfers (reference + exact amount). Preview first — nothing is credited until you apply.'}</p>
        <div className="flex flex-wrap gap-2 items-center">
          <label className={`${btnGhost} cursor-pointer`}><Upload size={14} /> {fr ? 'Choisir un fichier' : 'Choose file'}<input type="file" accept=".csv,text/csv,text/plain" className="sr-only" onChange={e => readFile(e.target.files?.[0])} /></label>
          <span className="text-xs text-slate-400">{csv ? `${csv.split('\n').length - 1} ${fr ? 'lignes' : 'rows'}` : ''}</span>
        </div>
        <textarea value={csv} onChange={e => { setCsv(e.target.value); setResult(null); }} rows={5} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono" placeholder={'Date,Libellé,Crédit\n2026-10-12,VIR EDU-2610-AB3CD4F Ann,150000'} />
        <div className="flex gap-2">
          <button className={btnGhost} disabled={!csv.trim() || !!busy} onClick={() => run(false)}>{busy === 'preview' && <Loader2 size={14} className="animate-spin" />}{fr ? 'Aperçu des correspondances' : 'Preview matches'}</button>
          {result && !result.applied && result.counts.matched > 0 && (
            <button className={btnPrimary} disabled={!!busy} onClick={() => run(true)}>{busy === 'apply' && <Loader2 size={14} className="animate-spin" />}{fr ? `Valider ${result.counts.matched} paiement(s)` : `Approve ${result.counts.matched} matched payment(s)`}</button>
          )}
        </div>
        {result && (
          <div className="space-y-2">
            <p className="text-sm text-slate-600">{Object.entries(result.counts).filter(([, v]) => v).map(([k, v]) => `${k.replace('_', ' ')}: ${v}`).join(' · ') || '—'}</p>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-sm min-w-[560px]"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-3 py-2 text-left">#</th><th className="px-3 py-2 text-left">{fr ? 'Résultat' : 'Result'}</th><th className="px-3 py-2 text-left">{fr ? 'Référence' : 'Reference'}</th><th className="px-3 py-2 text-right">{fr ? 'Montant' : 'Amount'}</th><th className="px-3 py-2 text-left">{fr ? 'Détail' : 'Detail'}</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{result.rows.map(r => (
                  <tr key={r.line}><td className="px-3 py-2 text-slate-400">{r.line}</td><td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_TONE[r.status] ?? ''}`}>{r.status.replace('_', ' ')}</span></td>
                    <td className="px-3 py-2 font-mono text-xs">{r.reference ?? '—'}</td><td className="px-3 py-2 text-right">{r.amount != null ? r.amount.toLocaleString('fr-FR') : '—'}</td>
                    <td className="px-3 py-2 text-slate-500">{r.status === 'amount_mismatch' ? `${fr ? 'attendu' : 'expected'} ${r.expected?.toLocaleString('fr-FR')}` : r.student_name ?? r.text ?? r.error ?? ''}</td></tr>))}</tbody></table>
            </div>
          </div>
        )}
      </section>
      {open && <TxDetail id={open} onClose={() => setOpen(null)} onChanged={() => void load()} />}
    </div>
  );
}
