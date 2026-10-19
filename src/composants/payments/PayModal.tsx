import { useEffect, useRef, useState } from 'react';
import { X, Loader2, CheckCircle2, AlertTriangle, Smartphone, Landmark, CreditCard, ExternalLink, Copy, Upload, Wallet } from 'lucide-react';
import { clsx } from 'clsx';
import { payApi } from '../../api/payments';
import type { PayInvoice, PayMethod, PayTx, ProviderId, PaySummary } from '../../api/payments';
import { useLanguage } from '../../i18n/LanguageContext';
import { fmtMoney, isOpen, statusHint, TxStatusBadge, usePolling, methodLabel } from './shared';

const ICON: Record<ProviderId, typeof Wallet> = { orange_money: Smartphone, mtn_momo: Smartphone, bank_transfer: Landmark, stripe: CreditCard };
const TINT: Record<ProviderId, string> = { orange_money: 'text-orange-500', mtn_momo: 'text-yellow-500', bank_transfer: 'text-indigo-500', stripe: 'text-violet-500' };
const field = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

interface Props {
  invoice: PayInvoice;
  methods: PayMethod[];
  rules: PaySummary['rules'];
  /** Resume tracking an existing transaction (e.g. returning from the provider's page). */
  resume?: PayTx | null;
  onClose: () => void;
  onChanged: () => void;
}

export default function PayModal({ invoice, methods, rules, resume, onClose, onChanged }: Props) {
  const { lang } = useLanguage();
  const fr = lang === 'fr';
  const [step, setStep] = useState<'form' | 'track'>(resume ? 'track' : 'form');
  const [method, setMethod] = useState<ProviderId | ''>('');
  const [amount, setAmount] = useState(String(invoice.balance));
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [tx, setTx] = useState<PayTx | null>(resume ?? null);
  const idem = useRef(crypto.randomUUID());          // one key per modal session ⇒ double-clicks create ONE payment
  const chosen = methods.find(m => m.id === method);
  const minPay = Math.min(rules.min_amount, invoice.balance);

  const refresh = async () => {
    if (!tx) return;
    try { const t = await payApi.transaction(tx.id); setTx(t); if (!isOpen(t.status)) onChanged(); } catch { /* transient: keep polling */ }
  };
  usePolling(refresh, 4000, step === 'track' && !!tx && ['initiated', 'pending', 'processing'].includes(tx.status));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (resume) void refresh(); }, []);

  const start = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    const amt = Number(amount);
    if (!method) return setError(fr ? 'Choisissez un mode de paiement' : 'Choose a payment method');
    if (!Number.isFinite(amt) || amt <= 0) return setError(fr ? 'Montant invalide' : 'Enter a valid amount');
    if (amt > invoice.balance) return setError(fr ? 'Le montant dépasse le solde' : 'The amount is more than your balance');
    if (!rules.allow_partial && amt !== invoice.balance) return setError(fr ? 'Les paiements partiels ne sont pas acceptés' : 'Partial payments are not accepted — pay the full balance');
    if (amt < minPay) return setError(fr ? `Minimum ${fmtMoney(minPay, invoice.currency)}` : `Minimum payment is ${fmtMoney(minPay, invoice.currency)}`);
    if (chosen?.requires_phone && !phone.trim()) return setError(fr ? 'Saisissez votre numéro Mobile Money' : 'Enter your Mobile Money number');
    setBusy(true);
    try {
      const t = await payApi.startPayment({ invoice_id: invoice.id, amount: amt, provider: method, phone: phone || undefined, idempotency_key: idem.current, lang });
      setTx(t); setStep('track'); onChanged();
      if (t.checkout_url && chosen?.flow === 'redirect') window.location.href = t.checkout_url;   // hosted page of the provider
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); }
    finally { setBusy(false); }
  };

  const cancel = async () => {
    if (!tx) return;
    setBusy(true); setError('');
    try { setTx(await payApi.cancel(tx.id)); onChanged(); } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); } finally { setBusy(false); }
  };

  const upload = async (file: File | undefined, bankRef: string) => {
    if (!tx || !file) return;
    setBusy(true); setError('');
    try { setTx(await payApi.uploadSlip(tx.id, file, bankRef)); onChanged(); } catch (e) { setError(e instanceof Error ? e.message : 'Upload failed'); } finally { setBusy(false); }
  };

  const copy = (s: string) => navigator.clipboard?.writeText(s).catch(() => {});

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div className="min-w-0">
            <h2 className="font-semibold text-slate-800 truncate">{fr ? 'Payer' : 'Pay'} — {invoice.fee_name}</h2>
            <p className="text-xs text-slate-500">{invoice.number} · {fr ? 'Solde' : 'Balance'} {fmtMoney(invoice.balance, invoice.currency)}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1 text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        {step === 'form' && (
          <form onSubmit={start} noValidate className="p-5 space-y-4">
            <fieldset>
              <legend className="text-sm font-medium text-slate-700 mb-2">{fr ? 'Mode de paiement' : 'Payment method'}</legend>
              <div className="grid gap-2">
                {methods.map(m => {
                  const Icon = ICON[m.id];
                  return (
                    <label key={m.id} className={clsx('flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition', method === m.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50', !m.configured && 'opacity-50 cursor-not-allowed')}>
                      <input type="radio" name="method" className="sr-only" disabled={!m.configured} checked={method === m.id} onChange={() => setMethod(m.id)} />
                      <Icon size={20} className={TINT[m.id]} />
                      <span className="flex-1 text-sm font-medium text-slate-800">{methodLabel(m.id, lang)}</span>
                      {!m.configured && <span className="text-xs text-slate-500">{fr ? 'Bientôt disponible' : 'Not available yet'}</span>}
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{fr ? 'Montant' : 'Amount'} ({invoice.currency === 'XAF' ? 'FCFA' : invoice.currency})</label>
              <input type="number" inputMode="numeric" min={minPay} max={invoice.balance} value={amount} onChange={e => setAmount(e.target.value)} disabled={!rules.allow_partial} className={field} />
              <p className="text-xs text-slate-500 mt-1">{rules.allow_partial ? (fr ? `Entre ${fmtMoney(minPay, invoice.currency)} et ${fmtMoney(invoice.balance, invoice.currency)}` : `Between ${fmtMoney(minPay, invoice.currency)} and ${fmtMoney(invoice.balance, invoice.currency)}`) : (fr ? 'Paiement intégral du solde' : 'The full balance must be paid')}</p>
            </div>
            {chosen?.requires_phone && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{fr ? 'Numéro Mobile Money' : 'Mobile Money number'}</label>
                <input type="tel" inputMode="tel" placeholder="6 7X XX XX XX" value={phone} onChange={e => setPhone(e.target.value)} className={field} autoComplete="tel" />
                <p className="text-xs text-slate-500 mt-1">{fr ? 'Vous recevrez une demande de confirmation sur ce numéro.' : 'You will get a confirmation prompt on this number.'}</p>
              </div>
            )}
            {error && <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={busy} className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2">
              {busy && <Loader2 size={16} className="animate-spin" />}{fr ? 'Continuer' : 'Continue'}
            </button>
          </form>
        )}

        {step === 'track' && tx && (
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-xs text-slate-500">{fr ? 'Référence' : 'Reference'}</p>
                <button onClick={() => copy(tx.reference)} className="font-mono text-sm font-semibold text-slate-800 flex items-center gap-1.5" title="Copy">{tx.reference} <Copy size={13} className="text-slate-400" /></button></div>
              <TxStatusBadge status={tx.status} />
            </div>
            <p className="text-2xl font-bold text-slate-800">{fmtMoney(tx.amount, tx.currency)} <span className="text-sm font-normal text-slate-500">· {methodLabel(tx.provider, lang)}</span></p>

            <div className={clsx('rounded-xl p-4 text-sm flex gap-3', tx.status === 'successful' ? 'bg-emerald-50 text-emerald-800' : ['failed', 'expired'].includes(tx.status) ? 'bg-red-50 text-red-800' : 'bg-slate-50 text-slate-700')}>
              {tx.status === 'successful' ? <CheckCircle2 className="shrink-0" size={20} /> : ['failed', 'expired'].includes(tx.status) ? <AlertTriangle className="shrink-0" size={20} /> : ['initiated', 'pending', 'processing'].includes(tx.status) ? <Loader2 className="shrink-0 animate-spin" size={20} /> : null}
              <div className="space-y-1">
                <p>{statusHint(tx.status, lang)}</p>
                {tx.failure_reason && ['failed', 'expired'].includes(tx.status) && <p className="text-xs opacity-80">{tx.failure_reason}</p>}
                {tx.status === 'successful' && tx.receipt_number && <p className="font-medium">{fr ? 'Reçu' : 'Receipt'} {tx.receipt_number}</p>}
              </div>
            </div>

            {tx.provider === 'mtn_momo' && ['pending', 'initiated', 'processing'].includes(tx.status) && (
              <ol className="text-sm text-slate-600 list-decimal pl-5 space-y-1">
                <li>{fr ? 'Regardez votre téléphone : une demande MTN MoMo vient d’arriver.' : 'Check your phone: an MTN MoMo prompt has just arrived.'}</li>
                <li>{fr ? 'Entrez votre code PIN pour confirmer.' : 'Enter your PIN to approve.'}</li>
                <li>{fr ? 'Cette page se met à jour automatiquement.' : 'This page updates automatically.'}</li>
              </ol>
            )}
            {tx.checkout_url && ['pending', 'initiated'].includes(tx.status) && (
              <a href={tx.checkout_url} className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700">
                <ExternalLink size={16} /> {fr ? 'Continuer vers la page de paiement' : 'Continue to the payment page'}
              </a>
            )}

            {tx.provider === 'bank_transfer' && ['pending', 'awaiting_verification'].includes(tx.status) && <BankPanel tx={tx} busy={busy} onUpload={upload} copy={copy} />}

            {error && <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-2">
              {['initiated', 'pending'].includes(tx.status) && (
                <button onClick={cancel} disabled={busy} className="px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60">{fr ? 'Annuler ce paiement' : 'Cancel this payment'}</button>
              )}
              {['failed', 'expired', 'cancelled'].includes(tx.status) && (
                <button onClick={() => { setTx(null); setStep('form'); idem.current = crypto.randomUUID(); setError(''); }} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">{fr ? 'Réessayer' : 'Try again'}</button>
              )}
              <button onClick={onClose} className="ml-auto px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50">{fr ? 'Fermer' : 'Close'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BankPanel({ tx, busy, onUpload, copy }: { tx: PayTx; busy: boolean; onUpload: (f: File | undefined, ref: string) => void; copy: (s: string) => void }) {
  const { lang } = useLanguage();
  const fr = lang === 'fr';
  const [file, setFile] = useState<File | undefined>();
  const [bankRef, setBankRef] = useState('');
  const b = tx.bank;
  return (
    <div className="space-y-3">
      {b && (
        <div className="rounded-xl border border-slate-200 p-4 text-sm space-y-1.5">
          <p className="font-semibold text-slate-800 mb-1">{fr ? 'Coordonnées bancaires officielles' : 'Official bank details'}</p>
          {([[fr ? 'Banque' : 'Bank', b.bank_name], [fr ? 'Titulaire' : 'Account name', b.account_name], [fr ? 'N° de compte' : 'Account number', b.account_number], ['SWIFT', b.swift], [fr ? 'Agence' : 'Branch', b.branch]] as [string, string | null][]).filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3"><span className="text-slate-500">{k}</span><button onClick={() => copy(v!)} className="font-medium text-slate-800 text-right flex items-center gap-1.5 break-all">{v} <Copy size={12} className="text-slate-400 shrink-0" /></button></div>
          ))}
          <div className="flex justify-between gap-3 pt-1 border-t border-slate-100"><span className="text-slate-500">{fr ? 'Motif / référence' : 'Payment reference'}</span><button onClick={() => copy(tx.reference)} className="font-mono font-bold text-indigo-700">{tx.reference}</button></div>
          {b.notes && <p className="text-xs text-slate-500 pt-1">{b.notes}</p>}
        </div>
      )}
      <p className="text-xs text-slate-500">{fr ? 'Indiquez impérativement la référence ci-dessus sur votre virement. Le paiement n’est crédité qu’après vérification par le service financier.' : 'You MUST write the reference above on your transfer. Your payment is only credited after the finance office verifies it.'}</p>
      <div className="rounded-xl border border-dashed border-slate-300 p-3 space-y-2">
        <p className="text-sm font-medium text-slate-700 flex items-center gap-2"><Upload size={15} /> {tx.has_receipt ? (fr ? 'Justificatif envoyé — vous pouvez le remplacer' : 'Slip uploaded — you can replace it') : (fr ? 'Envoyer le justificatif (facultatif)' : 'Upload your bank slip (optional)')}</p>
        <input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={e => setFile(e.target.files?.[0])} className="block w-full text-sm text-slate-600 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700" />
        <input value={bankRef} onChange={e => setBankRef(e.target.value)} placeholder={fr ? 'N° d’opération bancaire (facultatif)' : 'Bank operation number (optional)'} className={field} />
        <button onClick={() => onUpload(file, bankRef)} disabled={busy || !file} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
          {busy && <Loader2 size={14} className="animate-spin" />}{fr ? 'Envoyer' : 'Send'}
        </button>
      </div>
    </div>
  );
}
