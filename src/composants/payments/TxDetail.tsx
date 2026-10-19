import { useCallback, useEffect, useState } from 'react';
import { Eye, RefreshCw, Receipt as ReceiptIcon, Undo2, Check, X as XIcon, Loader2 } from 'lucide-react';
import { payApi, openAuthed } from '../../api/payments';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { Modal, ErrorBox, Spinner, btnPrimary, btnGhost, btnDanger, input } from './FinanceUi';
import { fmtMoney, fmtDateTime, methodLabel, TxStatusBadge, ReceiptModal } from './shared';

type Detail = Awaited<ReturnType<typeof payApi.fin.transaction>>;

/** Transaction detail + every staff action available on it (verify bank transfer, recheck, review, refund). */
export default function TxDetail({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const { lang } = useLanguage();
  const fr = lang === 'fr';
  const { user } = useAuth();
  const canRefund = user?.role === 'super_admin' || user?.role === 'head_teacher';
  const [d, setD] = useState<Detail | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');
  const [reason, setReason] = useState('');
  const [bankRef, setBankRef] = useState('');
  const [refundAmt, setRefundAmt] = useState('');
  const [showRefund, setShowRefund] = useState(false);
  const [providerRefund, setProviderRefund] = useState(false);
  const [receipt, setReceipt] = useState(false);

  const load = useCallback(async () => { try { setD(await payApi.fin.transaction(id)); } catch (e) { setErr(e instanceof Error ? e.message : 'Failed'); } }, [id]);
  useEffect(() => { void load(); }, [load]);

  const act = async (name: string, fn: () => Promise<unknown>) => {
    setBusy(name); setErr('');
    try { await fn(); await load(); onChanged(); } catch (e) { setErr(e instanceof Error ? e.message : 'Failed'); } finally { setBusy(''); }
  };

  return (
    <Modal title={d ? `${d.reference}` : (fr ? 'Transaction' : 'Transaction')} onClose={onClose} wide>
      {!d ? (err ? <ErrorBox message={err} /> : <Spinner />) : (
        <div className="space-y-5 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-2xl font-bold text-slate-800">{fmtMoney(d.amount, d.currency)}</p><p className="text-slate-500">{methodLabel(d.provider, lang)}{d.payer_phone ? ` · ${d.payer_phone}` : ''}</p></div>
            <TxStatusBadge status={d.status} />
          </div>
          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
            {([[fr ? 'Étudiant' : 'Student', `${d.student_name} (${d.matricule})`], [fr ? 'Classe' : 'Class', d.class_name ?? '—'], [fr ? 'Facture' : 'Invoice', `${d.invoice.number} — ${d.fee_name}`], [fr ? 'Solde facture' : 'Invoice balance', fmtMoney(d.invoice.balance, d.invoice.currency)], ['Date', fmtDateTime(d.created_at, lang)], [fr ? 'Réf. prestataire' : 'Provider ref', d.provider_txn_id ?? d.provider_ref ?? '—'], [fr ? 'Réf. bancaire' : 'Bank reference', d.bank_reference ?? '—'], [fr ? 'Reçu' : 'Receipt', d.receipt_number ?? '—']] as [string, string][]).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 border-b border-slate-100 py-1"><dt className="text-slate-500">{k}</dt><dd className="font-medium text-slate-800 text-right break-all">{v}</dd></div>
            ))}
          </dl>
          {d.failure_reason && <p className="text-red-600">{d.failure_reason}</p>}
          {d.needs_review && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-amber-800">
              <p className="font-medium">{fr ? 'À examiner' : 'Needs review'}: {d.review_note}</p>
              <button className={`${btnGhost} mt-2`} disabled={!!busy || !reason.trim()} onClick={() => act('resolve', () => payApi.fin.resolveReview(d.id, reason))}>{fr ? 'Marquer comme traité (saisir une note ci-dessous)' : 'Mark resolved (note below)'}</button>
            </div>
          )}

          {/* actions */}
          <div className="space-y-3">
            {(d.status === 'pending' || d.status === 'awaiting_verification') && d.provider === 'bank_transfer' && (
              <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                <p className="font-semibold text-slate-800">{fr ? 'Vérification du virement' : 'Verify bank transfer'}</p>
                {d.has_receipt
                  ? <button className={btnGhost} onClick={() => act('slip', () => openAuthed(`/finance/transactions/${d.id}/receipt-file`))}><Eye size={14} /> {fr ? 'Voir le justificatif' : 'View uploaded slip'} ({d.receipt_name})</button>
                  : <p className="text-slate-500">{fr ? 'Aucun justificatif envoyé par l’étudiant.' : 'The student has not uploaded a slip.'}</p>}
                <p className="text-slate-500">{fr ? 'Vérifiez sur le relevé bancaire que' : 'Confirm on the bank statement that'} <b>{fmtMoney(d.amount, d.currency)}</b> {fr ? 'a été reçu avec la référence' : 'was received with reference'} <b className="font-mono">{d.reference}</b>.</p>
                <input className={`${input} w-full`} placeholder={fr ? 'N° d’opération bancaire (facultatif)' : 'Bank operation number (optional)'} value={bankRef} onChange={e => setBankRef(e.target.value)} />
              </div>
            )}
            {(d.provider === 'bank_transfer' && ['pending', 'awaiting_verification'].includes(d.status)) || d.needs_review ? (
              <textarea className={`${input} w-full`} rows={2} placeholder={fr ? 'Motif / note (obligatoire pour refuser)' : 'Reason / note (required to reject)'} value={reason} onChange={e => setReason(e.target.value)} />
            ) : null}
            <div className="flex flex-wrap gap-2">
              {d.provider === 'bank_transfer' && ['pending', 'awaiting_verification'].includes(d.status) && (
                <>
                  <button className={btnPrimary} disabled={!!busy} onClick={() => act('approve', () => payApi.fin.review(d.id, { decision: 'approve', reason: reason || undefined, bank_reference: bankRef || undefined }))}>{busy === 'approve' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} {fr ? 'Valider et créditer' : 'Approve & credit'}</button>
                  <button className={btnDanger} disabled={!!busy || !reason.trim()} onClick={() => act('reject', () => payApi.fin.review(d.id, { decision: 'reject', reason }))}><XIcon size={14} /> {fr ? 'Refuser' : 'Reject'}</button>
                </>
              )}
              {d.provider !== 'bank_transfer' && ['initiated', 'pending', 'processing', 'expired', 'failed'].includes(d.status) && (
                <button className={btnGhost} disabled={!!busy} onClick={() => act('recheck', async () => { const r = await payApi.fin.recheck(d.id); if (r.error) throw new Error(r.error); })}>{busy === 'recheck' ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} {fr ? 'Revérifier auprès du prestataire' : 'Re-check with provider'}</button>
              )}
              {d.payment_id && <button className={btnGhost} onClick={() => setReceipt(true)}><ReceiptIcon size={14} /> {fr ? 'Reçu' : 'Receipt'}</button>}
              {d.payment_id && canRefund && d.status === 'successful' && <button className={btnGhost} onClick={() => setShowRefund(v => !v)}><Undo2 size={14} /> {fr ? 'Rembourser' : 'Refund'}</button>}
            </div>
            {showRefund && d.payment_id && (
              <div className="rounded-xl border border-red-200 p-4 space-y-2">
                <p className="font-semibold text-red-700">{fr ? 'Remboursement' : 'Refund'}</p>
                <input className={`${input} w-full`} type="number" placeholder={`${fr ? 'Montant (vide = tout)' : 'Amount (empty = full)'} — max ${d.amount - d.refunded_amount}`} value={refundAmt} onChange={e => setRefundAmt(e.target.value)} />
                <textarea className={`${input} w-full`} rows={2} placeholder={fr ? 'Motif (obligatoire)' : 'Reason (required)'} value={reason} onChange={e => setReason(e.target.value)} />
                {d.provider === 'stripe' && <label className="flex items-center gap-2 text-slate-600"><input type="checkbox" checked={providerRefund} onChange={e => setProviderRefund(e.target.checked)} /> {fr ? 'Rembourser aussi via Stripe' : 'Also refund through Stripe'}</label>}
                {d.provider !== 'stripe' && <p className="text-xs text-slate-500">{fr ? 'Le remboursement au payeur doit être effectué hors plateforme ; ici il est enregistré et le solde est corrigé.' : 'The money must be returned to the payer outside the platform; this records it and corrects the balance.'}</p>}
                <button className={btnDanger} disabled={!!busy || !reason.trim()} onClick={() => act('refund', () => payApi.fin.refund(d.payment_id!, { amount: refundAmt ? Number(refundAmt) : undefined, reason, provider_refund: providerRefund }))}>{busy === 'refund' && <Loader2 size={14} className="animate-spin" />}{fr ? 'Confirmer le remboursement' : 'Confirm refund'}</button>
              </div>
            )}
          </div>
          <ErrorBox message={err} />

          <div>
            <p className="font-semibold text-slate-800 mb-2">{fr ? 'Historique' : 'History'}</p>
            <ol className="space-y-2 border-l-2 border-slate-200 pl-4">
              {d.events?.map(e => (
                <li key={e.id} className="relative"><span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <p className="text-slate-800"><b>{e.from_status ? `${e.from_status} → ` : ''}{e.to_status}</b> <span className="text-slate-400">· {e.source}{e.actor_name ? ` · ${e.actor_name}` : ''}</span></p>
                  {e.note && <p className="text-slate-500">{e.note}</p>}<p className="text-xs text-slate-400">{fmtDateTime(e.created_at, lang)}</p></li>
              ))}
            </ol>
          </div>
        </div>
      )}
      {receipt && d?.payment_id && <ReceiptModal paymentId={d.payment_id} load={payApi.fin.receipt} onClose={() => setReceipt(false)} />}
    </Modal>
  );
}
