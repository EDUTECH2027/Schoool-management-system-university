import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Plus, Receipt as ReceiptIcon, RefreshCw, Download } from 'lucide-react';
import { payApi, downloadAuthed } from '../../api/payments';
import type { PayTx, LedgerRow, Paged } from '../../api/payments';
import { api } from '../../api/client';
import type { FeeRecord } from '../../api/client';
import { useLanguage } from '../../i18n/LanguageContext';
import { Pager, Modal, ErrorBox, Spinner, useDebounced, input, btnGhost, btnPrimary } from '../../composants/payments/FinanceUi';
import { fmtMoney, fmtDateTime, methodLabel, TxStatusBadge, ReceiptModal } from '../../composants/payments/shared';
import TxDetail from '../../composants/payments/TxDetail';

const STATUSES = ['', 'initiated', 'pending', 'processing', 'awaiting_verification', 'successful', 'failed', 'cancelled', 'expired', 'refunded'];
const PROVIDERS = ['', 'orange_money', 'mtn_momo', 'bank_transfer', 'stripe'];

export default function FinanceTransactions() {
  const { lang } = useLanguage();
  const fr = lang === 'fr';
  const [sp] = useSearchParams();
  const [tab, setTab] = useState<'tx' | 'ledger'>('tx');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState(sp.get('status') ?? '');
  const [provider, setProvider] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [review, setReview] = useState(sp.get('needs_review') === 'true');
  const [page, setPage] = useState(1);
  const dq = useDebounced(q);
  const [tx, setTx] = useState<Paged<PayTx> | null>(null);
  const [led, setLed] = useState<Paged<LedgerRow> | null>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const [manual, setManual] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'tx') setTx(await payApi.fin.transactions({ q: dq, status, provider, from, to, needs_review: review ? 'true' : '', page, limit: 25 }));
      else setLed(await payApi.fin.payments({ q: dq, from, to, page, limit: 25 }));
      setErr('');
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed to load'); } finally { setLoading(false); }
  }, [tab, dq, status, provider, from, to, review, page]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setPage(1); }, [tab, dq, status, provider, from, to, review]);

  const exportCsv = () => { const p = new URLSearchParams(Object.entries({ q: dq, status, provider, from, to }).filter(([, v]) => v) as [string, string][]).toString(); return downloadAuthed(`/finance/export/${tab === 'tx' ? 'transactions' : 'payments'}.csv${p ? `?${p}` : ''}`, `${tab === 'tx' ? 'transactions' : 'payments'}.csv`).catch(e => setErr(e.message)); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-slate-800 mr-auto">{fr ? 'Transactions' : 'Transactions'}</h1>
        <button className={btnGhost} onClick={exportCsv}><Download size={14} /> CSV</button>
        <button className={btnGhost} onClick={() => void load()}><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {fr ? 'Actualiser' : 'Refresh'}</button>
        <button className={btnPrimary} onClick={() => setManual(true)}><Plus size={14} /> {fr ? 'Enregistrer un paiement' : 'Record payment'}</button>
      </div>
      <div role="tablist" className="flex gap-1 border-b border-slate-200">
        {([['tx', fr ? 'Transactions en ligne' : 'Online transactions'], ['ledger', fr ? 'Registre des paiements & reçus' : 'Payments ledger & receipts']] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 ${tab === k ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>{l}</button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[220px]"><Search size={15} className="absolute left-3 top-2.5 text-slate-400" /><input className={`${input} w-full pl-9`} placeholder={fr ? 'Référence, matricule, nom, téléphone…' : 'Reference, matricule, name, phone…'} value={q} onChange={e => setQ(e.target.value)} /></div>
        {tab === 'tx' && <>
          <select className={input} value={status} onChange={e => setStatus(e.target.value)} aria-label="Status">{STATUSES.map(s => <option key={s} value={s}>{s || (fr ? 'Tous statuts' : 'All statuses')}</option>)}</select>
          <select className={input} value={provider} onChange={e => setProvider(e.target.value)} aria-label="Provider">{PROVIDERS.map(s => <option key={s} value={s}>{s ? methodLabel(s, lang) : (fr ? 'Tous modes' : 'All methods')}</option>)}</select>
          <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={review} onChange={e => setReview(e.target.checked)} /> {fr ? 'À examiner' : 'Needs review'}</label>
        </>}
        <input type="date" className={input} value={from} onChange={e => setFrom(e.target.value)} aria-label="From" />
        <input type="date" className={input} value={to} onChange={e => setTo(e.target.value)} aria-label="To" />
      </div>
      <ErrorBox message={err} />

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        {loading && !(tab === 'tx' ? tx : led) ? <Spinner /> : tab === 'tx' ? (
          <table className="w-full text-sm min-w-[820px]">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="text-left px-4 py-3">Date</th><th className="text-left px-4 py-3">{fr ? 'Référence' : 'Reference'}</th><th className="text-left px-4 py-3">{fr ? 'Étudiant' : 'Student'}</th><th className="text-left px-4 py-3">{fr ? 'Mode' : 'Method'}</th><th className="text-right px-4 py-3">{fr ? 'Montant' : 'Amount'}</th><th className="text-left px-4 py-3">{fr ? 'Statut' : 'Status'}</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {tx?.items.map(t => (
                <tr key={t.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setOpen(t.id)}>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{fmtDateTime(t.created_at, lang)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{t.reference}{t.needs_review && <span title="Needs review" className="ml-2 text-amber-500">⚑</span>}</td>
                  <td className="px-4 py-3"><p className="font-medium text-slate-800">{t.student_name}</p><p className="text-xs text-slate-400">{t.matricule}</p></td>
                  <td className="px-4 py-3 text-slate-600">{methodLabel(t.provider, lang)}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-800">{fmtMoney(t.amount, t.currency)}</td>
                  <td className="px-4 py-3"><TxStatusBadge status={t.status} /></td>
                </tr>
              ))}
              {tx && !tx.items.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">{fr ? 'Aucune transaction' : 'No transactions match'}</td></tr>}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm min-w-[820px]">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="text-left px-4 py-3">{fr ? 'Reçu' : 'Receipt'}</th><th className="text-left px-4 py-3">Date</th><th className="text-left px-4 py-3">{fr ? 'Étudiant' : 'Student'}</th><th className="text-left px-4 py-3">{fr ? 'Facture' : 'Invoice'}</th><th className="text-left px-4 py-3">{fr ? 'Mode' : 'Method'}</th><th className="text-right px-4 py-3">{fr ? 'Montant' : 'Amount'}</th><th /></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {led?.items.map(p => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs">{p.receipt_number ?? '—'}{p.kind === 'refund' && <span className="ml-2 text-orange-600">{fr ? 'remboursement' : 'refund'}</span>}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{p.payment_date ?? fmtDateTime(p.created_at, lang)}</td>
                  <td className="px-4 py-3"><p className="font-medium text-slate-800">{p.student_name}</p><p className="text-xs text-slate-400">{p.matricule}</p></td>
                  <td className="px-4 py-3 text-slate-600">{p.fee_name}</td>
                  <td className="px-4 py-3 text-slate-600">{methodLabel(p.method, lang)}</td>
                  <td className={`px-4 py-3 text-right font-medium ${p.amount < 0 ? 'text-orange-600' : 'text-slate-800'}`}>{fmtMoney(p.amount, p.currency)}</td>
                  <td className="px-4 py-3 text-right">{p.kind === 'payment' && <button onClick={() => setReceipt(p.id)} className="text-xs text-indigo-600 hover:underline inline-flex items-center gap-1"><ReceiptIcon size={13} /> {fr ? 'Reçu' : 'Receipt'}</button>}{p.transaction_id && <button onClick={() => setOpen(p.transaction_id!)} className="text-xs text-slate-500 hover:underline ml-3">{fr ? 'Détail' : 'Details'}</button>}</td>
                </tr>
              ))}
              {led && !led.items.length && <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">{fr ? 'Aucun paiement' : 'No payments'}</td></tr>}
            </tbody>
          </table>
        )}
        {(tab === 'tx' ? tx : led) && <Pager page={page} limit={25} total={(tab === 'tx' ? tx : led)!.total} onPage={setPage} />}
      </div>

      {open && <TxDetail id={open} onClose={() => setOpen(null)} onChanged={() => void load()} />}
      {manual && <ManualPayment onClose={() => setManual(false)} onSaved={() => { setManual(false); void load(); }} />}
      {receipt && <ReceiptModal paymentId={receipt} load={payApi.fin.receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
}

function ManualPayment({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { lang } = useLanguage();
  const fr = lang === 'fr';
  const [search, setSearch] = useState('');
  const ds = useDebounced(search);
  const [students, setStudents] = useState<{ id: string; name: string; matricule: string }[]>([]);
  const [student, setStudent] = useState<{ id: string; name: string } | null>(null);
  const [invoices, setInvoices] = useState<FeeRecord[]>([]);
  const [invoiceId, setInvoiceId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [reference, setReference] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (ds.trim().length < 2 || student) { setStudents([]); return; }
    api.getStudents({ search: ds, isActive: 'true', limit: '8' }).then(r => setStudents(r.map(s => ({ id: s.id, name: `${s.first_name} ${s.last_name}`, matricule: s.student_number })))).catch(() => {});
  }, [ds, student]);
  useEffect(() => { if (student) api.getFees({ studentId: student.id }).then(f => setInvoices(f.filter(i => i.balance > 0 && i.status !== 'waived'))).catch(() => {}); }, [student]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    if (!invoiceId || !Number(amount) || !reason.trim()) return setErr(fr ? 'Facture, montant et motif obligatoires' : 'Invoice, amount and reason are required');
    setBusy(true);
    try { await payApi.fin.manual({ fee_record_id: invoiceId, amount: Number(amount), method, reference: reference || undefined, reason }); onSaved(); }
    catch (e2) { setErr(e2 instanceof Error ? e2.message : 'Failed'); } finally { setBusy(false); }
  };

  return (
    <Modal title={fr ? 'Enregistrer un paiement (guichet)' : 'Record a manual payment'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        {!student ? (
          <div className="space-y-2"><input className={`${input} w-full`} placeholder={fr ? 'Rechercher un étudiant (nom ou matricule)' : 'Find a student (name or matricule)'} value={search} onChange={e => setSearch(e.target.value)} autoFocus />
            {students.map(s => <button type="button" key={s.id} onClick={() => setStudent(s)} className="w-full text-left px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm">{s.name} <span className="text-slate-400">· {s.matricule}</span></button>)}</div>
        ) : (
          <>
            <p className="text-sm"><b>{student.name}</b> <button type="button" className="text-indigo-600 ml-2" onClick={() => { setStudent(null); setInvoices([]); setInvoiceId(''); }}>{fr ? 'changer' : 'change'}</button></p>
            <select className={`${input} w-full`} value={invoiceId} onChange={e => { setInvoiceId(e.target.value); const i = invoices.find(x => x.id === e.target.value); if (i) setAmount(String(i.balance)); }} required>
              <option value="">{fr ? '— Facture —' : '— Invoice —'}</option>{invoices.map(i => <option key={i.id} value={i.id}>{i.fee_name} · {fr ? 'solde' : 'balance'} {fmtMoney(i.balance)}</option>)}
            </select>
            {!invoices.length && <p className="text-xs text-slate-500">{fr ? 'Aucune facture impayée.' : 'No unpaid invoices for this student.'}</p>}
            <div className="grid grid-cols-2 gap-3"><input className={input} type="number" placeholder={fr ? 'Montant' : 'Amount'} value={amount} onChange={e => setAmount(e.target.value)} required />
              <select className={input} value={method} onChange={e => setMethod(e.target.value)}><option value="cash">{fr ? 'Espèces' : 'Cash'}</option><option value="bank_transfer">{fr ? 'Dépôt bancaire' : 'Bank deposit'}</option><option value="cheque">{fr ? 'Chèque' : 'Cheque'}</option><option value="other">{fr ? 'Autre' : 'Other'}</option></select></div>
            <input className={`${input} w-full`} placeholder={fr ? 'N° de pièce / référence (facultatif)' : 'Slip / reference no. (optional)'} value={reference} onChange={e => setReference(e.target.value)} />
            <textarea className={`${input} w-full`} rows={2} placeholder={fr ? 'Motif (obligatoire — enregistré dans l’audit)' : 'Reason (required — written to the audit log)'} value={reason} onChange={e => setReason(e.target.value)} required />
          </>
        )}
        <ErrorBox message={err} />
        <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className={btnGhost}>{fr ? 'Annuler' : 'Cancel'}</button><button className={btnPrimary} disabled={busy || !student}>{fr ? 'Enregistrer' : 'Record payment'}</button></div>
      </form>
    </Modal>
  );
}
