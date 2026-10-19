import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Wallet, CheckCircle2, AlertCircle, Clock, Receipt as ReceiptIcon, CreditCard, Loader2, RefreshCw } from 'lucide-react';
import { payApi } from '../../api/payments';
import type { PaySummary, PayInvoice, PayTx } from '../../api/payments';
import { useLanguage } from '../../i18n/LanguageContext';
import PayModal from '../../composants/payments/PayModal';
import { fmtMoney, fmtDate, fmtDateTime, InvoiceBadge, TxStatusBadge, ReceiptModal, methodLabel, isOpen } from '../../composants/payments/shared';

export default function StudentFees() {
  const { lang } = useLanguage();
  const fr = lang === 'fr';
  const [params, setParams] = useSearchParams();
  const [sum, setSum] = useState<PaySummary | null>(null);
  const [txs, setTxs] = useState<PayTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState<{ invoice: PayInvoice; resume?: PayTx } | null>(null);
  const [receiptFor, setReceiptFor] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [s, t] = await Promise.all([payApi.summary(), payApi.transactions({ limit: 30 })]);
      setSum(s); setTxs(t.items); setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  // Coming back from Orange Money / Stripe: ?ref=EDU-… → reopen the tracker for that payment. The result shown
  // is whatever the server verified — the redirect itself proves nothing.
  const ref = params.get('ref');
  useEffect(() => {
    if (!ref || !sum) return;
    const t = txs.find(x => x.reference === ref);
    const inv = t && sum.invoices.find(i => i.id === t.fee_record_id);
    if (t && inv) setPaying({ invoice: inv, resume: t });
    setParams({}, { replace: true });
  }, [ref, sum, txs, setParams]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" /></div>;
  if (!sum) return <p role="alert" className="text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm">{error || 'Unable to load your payments'}</p>;

  const { totals, student } = sum;
  const pct = totals.due > 0 ? Math.min(100, Math.round((totals.paid / totals.due) * 100)) : 0;
  const cards = [
    { label: fr ? 'Frais dus' : 'Total fees due', value: totals.due, cls: 'text-slate-800' },
    { label: fr ? 'Déjà payé' : 'Paid', value: totals.paid, cls: 'text-emerald-600' },
    { label: fr ? 'Solde à payer' : 'Outstanding balance', value: totals.balance, cls: totals.balance > 0 ? 'text-red-600' : 'text-emerald-600' },
  ];
  const anyMethod = sum.methods.some(m => m.configured);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{fr ? 'Mes paiements' : 'My payments'}</h1>
          <p className="text-sm text-slate-500">{student.name} · {student.matricule}{student.class_name ? ` · ${student.class_name}` : ''}{student.level ? ` · ${student.level}` : ''}{sum.academic_year ? ` · ${sum.academic_year}` : ''}</p>
        </div>
        <button onClick={() => { setLoading(true); void load(); }} className="px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"><RefreshCw size={14} /> {fr ? 'Actualiser' : 'Refresh'}</button>
      </div>
      {error && <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">{c.label}</p>
            <p className={`text-2xl font-bold mt-1 ${c.cls}`}>{fmtMoney(c.value, sum.currency)}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex justify-between text-sm mb-2"><span className="text-slate-600">{fr ? 'Progression du paiement' : 'Payment progress'}</span><span className="font-semibold text-slate-800">{pct}%</span></div>
        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} /></div>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500 mt-2">
          {totals.overdue > 0 && <span className="text-red-600 flex items-center gap-1"><AlertCircle size={12} /> {fr ? 'En retard' : 'Overdue'}: {fmtMoney(totals.overdue, sum.currency)}</span>}
          {totals.pending > 0 && <span className="flex items-center gap-1"><Clock size={12} /> {fr ? 'Paiements en cours' : 'Payments in progress'}: {fmtMoney(totals.pending, sum.currency)} ({fr ? 'non encore déduits' : 'not yet deducted from your balance'})</span>}
        </div>
      </div>

      {/* Upcoming deadlines */}
      {sum.upcoming.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">{fr ? 'Échéances' : 'Upcoming deadlines'}</h2>
          <ul className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {sum.upcoming.map(u => (
              <li key={u.invoice_id} className="p-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-medium text-slate-800">{u.fee_name}</span>
                <span className={u.overdue ? 'text-red-600 font-medium' : 'text-slate-600'}>{u.overdue ? (fr ? 'Échue le ' : 'Was due ') : (fr ? 'À payer avant le ' : 'Due ')}{fmtDate(u.due_date, lang)} · {fmtMoney(u.balance, sum.currency)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Invoices */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">{fr ? 'Factures' : 'Invoices'}</h2>
        {!anyMethod && sum.invoices.some(i => i.balance > 0) && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2">{fr ? 'Le paiement en ligne n’est pas encore activé. Contactez le service financier.' : 'Online payment is not enabled yet. Please contact the finance office.'}</p>
        )}
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr><th className="text-left px-4 py-3">{fr ? 'Facture' : 'Invoice'}</th><th className="text-right px-4 py-3">{fr ? 'Montant' : 'Amount'}</th><th className="text-right px-4 py-3">{fr ? 'Payé' : 'Paid'}</th><th className="text-right px-4 py-3">{fr ? 'Solde' : 'Balance'}</th><th className="text-left px-4 py-3">{fr ? 'Échéance' : 'Due'}</th><th className="text-left px-4 py-3">{fr ? 'Statut' : 'Status'}</th><th className="px-4 py-3" /></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sum.invoices.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">{fr ? 'Aucune facture pour le moment.' : 'No invoices yet.'}</td></tr>}
              {sum.invoices.map(i => (
                <tr key={i.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3"><p className="font-medium text-slate-800">{i.fee_name}</p><p className="text-xs text-slate-400">{i.number}{i.academic_year ? ` · ${i.academic_year}` : ''}</p></td>
                  <td className="px-4 py-3 text-right text-slate-600">{fmtMoney(i.amount_due, i.currency)}</td>
                  <td className="px-4 py-3 text-right text-emerald-600">{fmtMoney(i.amount_paid, i.currency)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">{fmtMoney(i.balance, i.currency)}</td>
                  <td className="px-4 py-3 text-slate-600">{fmtDate(i.due_date, lang)}</td>
                  <td className="px-4 py-3"><InvoiceBadge status={i.status} />{i.pending_amount > 0 && <p className="text-[11px] text-amber-600 mt-1">{fr ? 'Paiement en cours' : 'Payment in progress'}</p>}</td>
                  <td className="px-4 py-3 text-right">{i.balance > 0 && i.status !== 'waived' && (
                    <button onClick={() => setPaying({ invoice: i })} disabled={!anyMethod} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-40 flex items-center gap-1.5 ml-auto"><CreditCard size={13} /> {fr ? 'Payer' : 'Pay'}</button>
                  )}{i.status === 'paid' && <CheckCircle2 size={18} className="text-emerald-500 ml-auto" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* History */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">{fr ? 'Historique des paiements' : 'Payment history'}</h2>
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr><th className="text-left px-4 py-3">Date</th><th className="text-left px-4 py-3">{fr ? 'Référence' : 'Reference'}</th><th className="text-left px-4 py-3">{fr ? 'Facture' : 'Invoice'}</th><th className="text-left px-4 py-3">{fr ? 'Mode' : 'Method'}</th><th className="text-right px-4 py-3">{fr ? 'Montant' : 'Amount'}</th><th className="text-left px-4 py-3">{fr ? 'Statut' : 'Status'}</th><th className="px-4 py-3" /></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {txs.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400"><Wallet className="mx-auto mb-2 text-slate-300" />{fr ? 'Aucun paiement pour le moment.' : 'No payments yet.'}</td></tr>}
              {txs.map(t => {
                const inv = sum.invoices.find(i => i.id === t.fee_record_id);
                return (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{fmtDateTime(t.created_at, lang)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{t.reference}</td>
                    <td className="px-4 py-3 text-slate-600">{t.fee_name}</td>
                    <td className="px-4 py-3 text-slate-600">{methodLabel(t.provider, lang)}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">{fmtMoney(t.amount, t.currency)}</td>
                    <td className="px-4 py-3"><TxStatusBadge status={t.status} /></td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {t.payment_id || t.receipt_number ? (
                        <button onClick={() => setReceiptFor(t.payment_id ?? null)} disabled={!t.payment_id} className="text-xs text-indigo-600 hover:underline inline-flex items-center gap-1"><ReceiptIcon size={13} /> {t.receipt_number ?? (fr ? 'Reçu' : 'Receipt')}</button>
                      ) : inv && isOpen(t.status) ? (
                        <button onClick={() => setPaying({ invoice: inv, resume: t })} className="text-xs text-indigo-600 hover:underline">{fr ? 'Suivre' : 'Track'}</button>
                      ) : inv && inv.balance > 0 && ['failed', 'expired', 'cancelled'].includes(t.status) ? (
                        <button onClick={() => setPaying({ invoice: inv })} className="text-xs text-indigo-600 hover:underline">{fr ? 'Réessayer' : 'Retry'}</button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {paying && (
        <PayModal key={paying.resume?.id ?? paying.invoice.id} invoice={paying.invoice} methods={sum.methods} rules={sum.rules} resume={paying.resume}
          onClose={() => { setPaying(null); void load(); }} onChanged={() => { void load(); }} />
      )}
      {receiptFor && <ReceiptModal paymentId={receiptFor} onClose={() => setReceiptFor(null)} />}
    </div>
  );
}
