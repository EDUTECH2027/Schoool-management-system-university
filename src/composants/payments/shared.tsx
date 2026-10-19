import { useEffect, useRef, useState } from 'react';
import { X, Printer, Download, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { payApi } from '../../api/payments';
import type { Receipt, TxStatus, ProviderId } from '../../api/payments';
import { useLanguage } from '../../i18n/LanguageContext';

export const fmtMoney = (n: number, cur = 'XAF') => `${(Number.isInteger(n) ? n : Math.round(n * 100) / 100).toLocaleString('fr-FR')} ${cur === 'XAF' ? 'FCFA' : cur}`;
export const fmtDate = (iso?: string | null, lang = 'en') => (iso ? new Date(iso).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
export const fmtDateTime = (iso?: string | null, lang = 'en') => (iso ? new Date(iso).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

const METHODS: Record<string, { en: string; fr: string }> = {
  orange_money: { en: 'Orange Money', fr: 'Orange Money' },
  mtn_momo: { en: 'MTN Mobile Money', fr: 'MTN Mobile Money' },
  bank_transfer: { en: 'Bank transfer', fr: 'Virement bancaire' },
  stripe: { en: 'Card (Stripe)', fr: 'Carte (Stripe)' },
  cash: { en: 'Cash', fr: 'Espèces' },
  manual: { en: 'Manual', fr: 'Manuel' },
};
export const methodLabel = (m: string | null | undefined, lang = 'en') => (m ? (METHODS[m] ? METHODS[m][lang === 'fr' ? 'fr' : 'en'] : m) : '—');
export const isProvider = (m: string): m is ProviderId => m in METHODS && ['orange_money', 'mtn_momo', 'bank_transfer', 'stripe'].includes(m);

const STATUS: Record<TxStatus, { en: string; fr: string; cls: string; hint: { en: string; fr: string } }> = {
  initiated: { en: 'Starting', fr: 'Démarrage', cls: 'bg-slate-100 text-slate-600', hint: { en: 'Contacting the payment provider…', fr: 'Contact du prestataire de paiement…' } },
  pending: { en: 'Pending', fr: 'En attente', cls: 'bg-amber-100 text-amber-700', hint: { en: 'Waiting for you to confirm the payment.', fr: 'En attente de votre confirmation du paiement.' } },
  processing: { en: 'Processing', fr: 'En traitement', cls: 'bg-blue-100 text-blue-700', hint: { en: 'The provider is processing your payment.', fr: 'Le prestataire traite votre paiement.' } },
  successful: { en: 'Successful', fr: 'Réussi', cls: 'bg-emerald-100 text-emerald-700', hint: { en: 'Payment confirmed and recorded.', fr: 'Paiement confirmé et enregistré.' } },
  failed: { en: 'Failed', fr: 'Échoué', cls: 'bg-red-100 text-red-700', hint: { en: 'The payment did not go through. You were not charged for this attempt.', fr: 'Le paiement n’a pas abouti. Vous n’avez pas été débité pour cette tentative.' } },
  cancelled: { en: 'Cancelled', fr: 'Annulé', cls: 'bg-slate-100 text-slate-600', hint: { en: 'This payment was cancelled.', fr: 'Ce paiement a été annulé.' } },
  awaiting_verification: { en: 'Awaiting bank verification', fr: 'En attente de vérification bancaire', cls: 'bg-violet-100 text-violet-700', hint: { en: 'The finance office is checking your transfer. This can take 1–2 working days.', fr: 'Le service financier vérifie votre virement. Cela peut prendre 1 à 2 jours ouvrés.' } },
  refunded: { en: 'Refunded', fr: 'Remboursé', cls: 'bg-orange-100 text-orange-700', hint: { en: 'This payment was refunded.', fr: 'Ce paiement a été remboursé.' } },
  expired: { en: 'Expired', fr: 'Expiré', cls: 'bg-slate-100 text-slate-600', hint: { en: 'No confirmation was received in time. If you were charged, it will be matched automatically — otherwise try again.', fr: 'Aucune confirmation reçue à temps. Si vous avez été débité, le paiement sera rapproché automatiquement — sinon réessayez.' } },
};
export const statusHint = (s: TxStatus, lang = 'en') => STATUS[s].hint[lang === 'fr' ? 'fr' : 'en'];
export const isOpen = (s: TxStatus) => ['initiated', 'pending', 'processing', 'awaiting_verification'].includes(s);

export function TxStatusBadge({ status }: { status: TxStatus }) {
  const { lang } = useLanguage();
  const s = STATUS[status];
  return <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap', s.cls)}>{s[lang === 'fr' ? 'fr' : 'en']}</span>;
}

export function InvoiceBadge({ status }: { status: string }) {
  const { lang } = useLanguage();
  const m: Record<string, [string, string, string]> = {
    paid: ['Paid', 'Payé', 'bg-emerald-100 text-emerald-700'], partial: ['Partial', 'Partiel', 'bg-amber-100 text-amber-700'],
    pending: ['Unpaid', 'Impayé', 'bg-slate-100 text-slate-600'], overdue: ['Overdue', 'En retard', 'bg-red-100 text-red-700'], waived: ['Waived', 'Exonéré', 'bg-blue-100 text-blue-700'],
  };
  const [en, fr, cls] = m[status] ?? [status, status, 'bg-slate-100 text-slate-600'];
  return <span className={clsx('inline-flex px-2 py-0.5 rounded-full text-xs font-semibold', cls)}>{lang === 'fr' ? fr : en}</span>;
}

// Re-run `fn` every `ms` while `active`; stops on unmount. Used for status polling.
export function usePolling(fn: () => void | Promise<void>, ms: number, active: boolean) {
  const ref = useRef(fn);
  useEffect(() => { ref.current = fn; });
  useEffect(() => {
    if (!active) return;
    const i = setInterval(() => { void ref.current(); }, ms);
    return () => clearInterval(i);
  }, [ms, active]);
}

// ── receipts ──────────────────────────────────────────────────────────────────────
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

function receiptHtml(r: Receipt, lang: string) {
  const fr = lang === 'fr';
  const row = (k: string, v: string) => `<tr><td class="k">${esc(k)}</td><td>${esc(v)}</td></tr>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(r.receipt_number)}</title><style>
    body{font-family:Segoe UI,Arial,sans-serif;color:#111;margin:32px;max-width:640px}
    h1{font-size:20px;margin:0}.sub{color:#555;font-size:12px;margin-bottom:18px}
    .box{border:1px solid #ccc;border-radius:8px;padding:16px;margin-top:14px}
    table{width:100%;border-collapse:collapse;font-size:13px}td{padding:5px 0;border-bottom:1px solid #eee}.k{color:#666;width:45%}
    .amt{font-size:26px;font-weight:700;margin:6px 0}.foot{margin-top:20px;font-size:11px;color:#666}
    @media print{body{margin:12mm}}</style></head><body>
    <h1>${esc(r.school.name)}</h1><div class="sub">${esc([r.school.address, r.school.phone, r.school.email].filter(Boolean).join(' · '))}</div>
    <h1>${fr ? 'REÇU DE PAIEMENT' : 'PAYMENT RECEIPT'} — ${esc(r.receipt_number)}</h1>
    <div class="box"><div class="amt">${esc(fmtMoney(r.payment.amount, r.payment.currency))}</div><table>
      ${row(fr ? 'Date' : 'Date', fmtDate(r.payment_date ?? r.issued_at, lang))}
      ${row(fr ? 'Étudiant' : 'Student', r.student.name)}${row(fr ? 'Matricule' : 'Matricule', r.student.matricule ?? '—')}${row(fr ? 'Classe' : 'Class', r.student.class_name ?? '—')}
      ${row(fr ? 'Facture' : 'Invoice', `${r.invoice.number} — ${r.invoice.fee_name}`)}${row(fr ? 'Année académique' : 'Academic year', r.invoice.academic_year ?? '—')}
      ${row(fr ? 'Mode de paiement' : 'Method', methodLabel(r.payment.method, lang))}${row(fr ? 'Référence' : 'Reference', r.payment.reference ?? '—')}
      ${r.payment.provider_transaction ? row(fr ? 'N° transaction' : 'Provider transaction', r.payment.provider_transaction) : ''}
      ${row(fr ? 'Total facture' : 'Invoice total', fmtMoney(r.invoice.amount_due, r.payment.currency))}${row(fr ? 'Total payé à ce jour' : 'Paid to date', fmtMoney(r.invoice.amount_paid_to_date, r.payment.currency))}
      ${row(fr ? 'Solde restant' : 'Remaining balance', fmtMoney(r.invoice.balance, r.payment.currency))}
    </table></div><div class="foot">${esc(r.footer)}</div></body></html>`;
}

export function ReceiptModal({ paymentId, load, onClose }: { paymentId: string; load?: (id: string) => Promise<Receipt>; onClose: () => void }) {
  const { lang } = useLanguage();
  const fr = lang === 'fr';
  const [r, setR] = useState<Receipt | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { (load ?? payApi.receipt)(paymentId).then(setR).catch(e => setErr(e.message)); }, [paymentId, load]);

  const print = () => {
    if (!r) return;
    const w = window.open('', '_blank'); if (!w) return;
    w.document.write(receiptHtml(r, lang)); w.document.close(); w.focus(); setTimeout(() => w.print(), 250);
  };
  const pdf = async () => {
    if (!r) return;
    const { jsPDF } = await import('jspdf');
    const d = new jsPDF(); let y = 20;
    const line = (k: string, v: string) => { d.setFontSize(10); d.setTextColor(110); d.text(k, 20, y); d.setTextColor(20); d.text(v, 78, y); y += 7; };
    d.setFontSize(16); d.setTextColor(20); d.text(r.school.name, 20, y); y += 7;
    d.setFontSize(9); d.setTextColor(110); d.text([r.school.address, r.school.phone, r.school.email].filter(Boolean).join(' · '), 20, y); y += 12;
    d.setFontSize(14); d.setTextColor(20); d.text(`${fr ? 'REÇU DE PAIEMENT' : 'PAYMENT RECEIPT'} — ${r.receipt_number}`, 20, y); y += 10;
    d.setFontSize(20); d.text(fmtMoney(r.payment.amount, r.payment.currency), 20, y); y += 12;
    line('Date', fmtDate(r.payment_date ?? r.issued_at, lang)); line(fr ? 'Étudiant' : 'Student', r.student.name); line('Matricule', r.student.matricule ?? '—');
    line(fr ? 'Facture' : 'Invoice', `${r.invoice.number} — ${r.invoice.fee_name}`); line(fr ? 'Année' : 'Academic year', r.invoice.academic_year ?? '—');
    line(fr ? 'Mode' : 'Method', methodLabel(r.payment.method, lang)); line(fr ? 'Référence' : 'Reference', r.payment.reference ?? '—');
    line(fr ? 'Payé à ce jour' : 'Paid to date', fmtMoney(r.invoice.amount_paid_to_date, r.payment.currency)); line(fr ? 'Solde' : 'Balance', fmtMoney(r.invoice.balance, r.payment.currency));
    if (r.footer) { y += 6; d.setFontSize(8); d.setTextColor(120); d.text(r.footer, 20, y); }
    d.save(`${r.receipt_number}.pdf`);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800">{fr ? 'Reçu' : 'Receipt'}{r ? ` ${r.receipt_number}` : ''}</h2>
          <button onClick={onClose} aria-label="Close" className="p-1 text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          {!r && !err && <div className="flex justify-center py-8"><Loader2 className="animate-spin text-slate-400" /></div>}
          {err && <p role="alert" className="text-red-600">{err}</p>}
          {r && (
            <>
              <p className="text-3xl font-bold text-slate-800">{fmtMoney(r.payment.amount, r.payment.currency)}</p>
              <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1.5">
                {([[fr ? 'Date' : 'Date', fmtDate(r.payment_date ?? r.issued_at, lang)], [fr ? 'Étudiant' : 'Student', r.student.name], ['Matricule', r.student.matricule ?? '—'], [fr ? 'Facture' : 'Invoice', `${r.invoice.number} — ${r.invoice.fee_name}`], [fr ? 'Mode' : 'Method', methodLabel(r.payment.method, lang)], [fr ? 'Référence' : 'Reference', r.payment.reference ?? '—'], [fr ? 'Solde restant' : 'Remaining balance', fmtMoney(r.invoice.balance, r.payment.currency)]] as [string, string][]).map(([k, v]) => (
                  <div key={k} className="contents"><dt className="text-slate-500">{k}</dt><dd className="text-slate-800 font-medium break-words">{v}</dd></div>
                ))}
              </dl>
              <div className="flex gap-2 pt-2">
                <button onClick={print} className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2"><Printer size={15} /> {fr ? 'Imprimer' : 'Print'}</button>
                <button onClick={pdf} className="flex-1 px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 flex items-center justify-center gap-2"><Download size={15} /> PDF</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
