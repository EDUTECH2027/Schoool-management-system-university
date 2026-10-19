import { useCallback, useEffect, useState } from 'react';
import { Download, CheckCircle2, XCircle, Printer } from 'lucide-react';
import { payApi, downloadAuthed } from '../../api/payments';
import type { AuditRow, Paged, Statement } from '../../api/payments';
import { api } from '../../api/client';
import { useLanguage } from '../../i18n/LanguageContext';
import { Pager, ErrorBox, useDebounced, input, btnGhost } from '../../composants/payments/FinanceUi';
import { fmtMoney, fmtDateTime, fmtDate, methodLabel, InvoiceBadge, TxStatusBadge } from '../../composants/payments/shared';

type Prov = Awaited<ReturnType<typeof payApi.fin.providers>>;

export default function FinanceReports() {
  const { lang } = useLanguage();
  const fr = lang === 'fr';
  const [err, setErr] = useState('');
  const [year, setYear] = useState('');
  const [providers, setProviders] = useState<Prov | null>(null);
  const [audit, setAudit] = useState<Paged<AuditRow> | null>(null);
  const [apage, setApage] = useState(1);

  // statement lookup
  const [sq, setSq] = useState('');
  const dsq = useDebounced(sq);
  const [found, setFound] = useState<{ id: string; name: string; matricule: string }[]>([]);
  const [stmt, setStmt] = useState<Statement | null>(null);

  useEffect(() => { payApi.fin.providers().then(setProviders).catch(e => setErr(e.message)); }, []);
  const loadAudit = useCallback(() => payApi.fin.audit({ page: apage, limit: 15 }).then(setAudit).catch(e => setErr(e.message)), [apage]);
  useEffect(() => { void loadAudit(); }, [loadAudit]);
  useEffect(() => {
    if (dsq.trim().length < 2) { setFound([]); return; }
    api.getStudents({ search: dsq, limit: '8' }).then(r => setFound(r.map(s => ({ id: s.id, name: `${s.first_name} ${s.last_name}`, matricule: s.student_number })))).catch(() => {});
  }, [dsq]);

  const dl = (kind: string) => downloadAuthed(`/finance/export/${kind}.csv${kind === 'invoices' && year ? `?academicYear=${encodeURIComponent(year)}` : ''}`, `${kind}.csv`).catch(e => setErr(e.message));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">{fr ? 'Rapports & contrôle' : 'Reports & controls'}</h1>
      <ErrorBox message={err} />

      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-800 mb-1">{fr ? 'Exports (CSV, ouvrable dans Excel)' : 'Exports (CSV — opens in Excel)'}</h2>
        <p className="text-sm text-slate-500 mb-3">{fr ? 'Chaque export est consigné dans le journal d’audit.' : 'Every export is recorded in the audit log.'}</p>
        <div className="flex flex-wrap gap-2 items-center">
          <button className={btnGhost} onClick={() => dl('transactions')}><Download size={14} /> {fr ? 'Transactions' : 'Transactions'}</button>
          <button className={btnGhost} onClick={() => dl('payments')}><Download size={14} /> {fr ? 'Paiements & reçus' : 'Payments & receipts'}</button>
          <button className={btnGhost} onClick={() => dl('invoices')}><Download size={14} /> {fr ? 'Factures / soldes' : 'Invoices & balances'}</button>
          <input className={input} placeholder={fr ? 'Année (ex. 2026-2027)' : 'Academic year (e.g. 2026-2027)'} value={year} onChange={e => setYear(e.target.value)} />
        </div>
      </section>

      <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <h2 className="font-semibold text-slate-800">{fr ? 'Relevé d’un étudiant' : 'Student statement'}</h2>
        <input className={`${input} w-full sm:w-96`} placeholder={fr ? 'Nom ou matricule' : 'Name or matricule'} value={sq} onChange={e => setSq(e.target.value)} />
        <div className="flex flex-wrap gap-2">{found.map(s => <button key={s.id} className={btnGhost} onClick={() => { payApi.fin.statement(s.id).then(setStmt).catch(e => setErr(e.message)); setSq(''); setFound([]); }}>{s.name} · {s.matricule}</button>)}</div>
        {stmt && (
          <div className="space-y-3 text-sm" id="statement">
            <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-slate-800">{stmt.student.name} · {stmt.student.matricule} · {stmt.student.class_name ?? '—'}</p><button className={btnGhost} onClick={() => window.print()}><Printer size={14} /> {fr ? 'Imprimer' : 'Print'}</button></div>
            <p className="text-slate-600">{fr ? 'Dû' : 'Due'} <b>{fmtMoney(stmt.totals.due)}</b> · {fr ? 'Payé' : 'Paid'} <b className="text-emerald-600">{fmtMoney(stmt.totals.paid)}</b> · {fr ? 'Solde' : 'Balance'} <b className="text-red-600">{fmtMoney(stmt.totals.balance)}</b></p>
            <div className="overflow-x-auto"><table className="w-full min-w-[520px]"><thead className="text-xs uppercase text-slate-500 bg-slate-50"><tr><th className="text-left px-3 py-2">{fr ? 'Facture' : 'Invoice'}</th><th className="text-right px-3 py-2">{fr ? 'Montant' : 'Amount'}</th><th className="text-right px-3 py-2">{fr ? 'Payé' : 'Paid'}</th><th className="text-right px-3 py-2">{fr ? 'Solde' : 'Balance'}</th><th className="text-left px-3 py-2">{fr ? 'Échéance' : 'Due'}</th><th className="text-left px-3 py-2">{fr ? 'Statut' : 'Status'}</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{stmt.invoices.map(i => <tr key={i.id}><td className="px-3 py-2">{i.fee_name} <span className="text-xs text-slate-400">{i.number}</span></td><td className="px-3 py-2 text-right">{fmtMoney(i.amount_due, i.currency)}</td><td className="px-3 py-2 text-right text-emerald-600">{fmtMoney(i.amount_paid, i.currency)}</td><td className="px-3 py-2 text-right font-medium">{fmtMoney(i.balance, i.currency)}</td><td className="px-3 py-2">{fmtDate(i.due_date, lang)}</td><td className="px-3 py-2"><InvoiceBadge status={i.status} /></td></tr>)}</tbody></table></div>
            <p className="font-medium text-slate-700">{fr ? 'Paiements' : 'Payments'}</p>
            <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg">{stmt.payments.map(p => <li key={p.id} className="px-3 py-2 flex flex-wrap justify-between gap-2"><span>{p.receipt_number} · {p.payment_date} · {methodLabel(p.method, lang)} · {p.fee_name}</span><b className={p.amount < 0 ? 'text-orange-600' : ''}>{fmtMoney(p.amount)}</b></li>)}{!stmt.payments.length && <li className="px-3 py-3 text-slate-400">—</li>}</ul>
            <p className="font-medium text-slate-700">{fr ? 'Tentatives en ligne' : 'Online attempts'}</p>
            <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg">{stmt.transactions.map(t => <li key={t.id} className="px-3 py-2 flex flex-wrap items-center justify-between gap-2"><span className="font-mono text-xs">{t.reference} · {methodLabel(t.provider, lang)} · {fmtDateTime(t.created_at, lang)}</span><span className="flex items-center gap-3"><b>{fmtMoney(t.amount, t.currency)}</b><TxStatusBadge status={t.status} /></span></li>)}{!stmt.transactions.length && <li className="px-3 py-3 text-slate-400">—</li>}</ul>
          </div>
        )}
      </section>

      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-800 mb-3">{fr ? 'État des prestataires de paiement' : 'Payment provider status'}</h2>
        <ul className="divide-y divide-slate-100 text-sm">
          {providers?.map(p => (
            <li key={p.id} className="py-3 flex flex-wrap items-start gap-3">
              {p.configured ? <CheckCircle2 className="text-emerald-500 shrink-0" size={18} /> : <XCircle className="text-slate-400 shrink-0" size={18} />}
              <div className="flex-1 min-w-0"><p className="font-medium text-slate-800">{methodLabel(p.id, lang)} <span className="text-xs text-slate-400">({p.currency})</span></p>
                {p.configured ? <p className="text-emerald-600 text-xs">{fr ? 'Configuré' : 'Configured'}{p.callbacks_need_public_url ? (fr ? ' — API_PUBLIC_URL manquant : les notifications automatiques ne fonctionneront pas (la vérification périodique reste active)' : ' — API_PUBLIC_URL not set: instant notifications disabled (periodic checking still runs)') : ''}</p>
                  : <p className="text-slate-500 text-xs">{fr ? 'Non configuré — variables manquantes : ' : 'Not configured — missing: '}<code className="text-slate-700">{p.missing.join(', ')}</code></p>}</div>
            </li>
          ))}
        </ul>
        <p className="text-xs text-slate-400 mt-3">{fr ? 'Aucun paiement n’est simulé : un mode non configuré est indisponible pour les étudiants.' : 'No payment is ever simulated: a provider that is not configured is simply unavailable to students.'}</p>
      </section>

      <section className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <h2 className="font-semibold text-slate-800 p-5 pb-2">{fr ? 'Journal d’audit' : 'Audit log'}</h2>
        <table className="w-full text-sm min-w-[720px]"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="text-left px-5 py-2">Date</th><th className="text-left px-5 py-2">{fr ? 'Auteur' : 'Actor'}</th><th className="text-left px-5 py-2">{fr ? 'Action' : 'Action'}</th><th className="text-left px-5 py-2">{fr ? 'Cible' : 'Target'}</th><th className="text-left px-5 py-2">{fr ? 'Motif' : 'Reason'}</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{audit?.items.map(a => <tr key={a.id}><td className="px-5 py-2 text-slate-500 whitespace-nowrap">{fmtDateTime(a.created_at, lang)}</td><td className="px-5 py-2">{a.actor_name} <span className="text-xs text-slate-400">{a.actor_role}</span></td><td className="px-5 py-2 font-mono text-xs">{a.action}</td><td className="px-5 py-2 font-mono text-xs text-slate-500">{a.target_type}:{a.target_id.slice(0, 8)}</td><td className="px-5 py-2 text-slate-600">{a.reason ?? ''}</td></tr>)}
            {audit && !audit.items.length && <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">—</td></tr>}</tbody></table>
        {audit && <Pager page={apage} limit={15} total={audit.total} onPage={setApage} />}
      </section>
    </div>
  );
}
