import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, AlertTriangle, Landmark, Clock, XCircle, Flag } from 'lucide-react';
import { payApi } from '../../api/payments';
import type { FinSummary } from '../../api/payments';
import { useLanguage } from '../../i18n/LanguageContext';
import { Stat, ErrorBox, Spinner, btnGhost, input } from '../../composants/payments/FinanceUi';
import { fmtMoney, methodLabel } from '../../composants/payments/shared';

function Bars({ data, cur }: { data: { label: string; value: number }[]; cur: string }) {
  const max = Math.max(1, ...data.map(d => d.value));
  return (
    <ul className="space-y-2">
      {data.map(d => (
        <li key={d.label} className="text-sm">
          <div className="flex justify-between mb-1"><span className="text-slate-600 truncate">{d.label}</span><span className="font-medium text-slate-800 shrink-0 ml-3">{fmtMoney(d.value, cur)}</span></div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(d.value / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

export default function FinanceDashboard() {
  const { lang } = useLanguage();
  const fr = lang === 'fr';
  const [year, setYear] = useState('');
  const [s, setS] = useState<FinSummary | null>(null);
  const [years, setYears] = useState<string[]>([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (y: string) => {
    setBusy(true);
    try {
      const r = await payApi.fin.summary(y || undefined);
      setS(r); setErr('');
      if (!y) setYears(r.by_academic_year.map(a => a.academic_year).filter(a => a !== '—'));
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed to load'); } finally { setBusy(false); }
  }, []);
  useEffect(() => { void load(year); }, [load, year]);

  if (!s) return err ? <ErrorBox message={err} /> : <Spinner />;
  const cur = s.currency;
  const rate = s.expected > 0 ? Math.round((s.collected / s.expected) * 100) : 0;
  const n = s.needs_attention;
  const max30 = Math.max(1, ...s.daily.map(d => d.amount));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto"><h1 className="text-2xl font-bold text-slate-800">{fr ? 'Finances' : 'Finance'}</h1><p className="text-sm text-slate-500">{fr ? 'Frais universitaires, encaissements et rapprochement' : 'University fees, collections and reconciliation'}</p></div>
        <select value={year} onChange={e => setYear(e.target.value)} className={input} aria-label="Academic year">
          <option value="">{fr ? 'Toutes les années' : 'All academic years'}</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <button onClick={() => load(year)} disabled={busy} className={btnGhost}><RefreshCw size={14} className={busy ? 'animate-spin' : ''} /> {fr ? 'Actualiser' : 'Refresh'}</button>
      </div>
      <ErrorBox message={err} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label={fr ? 'Frais attendus' : 'Fees expected'} value={fmtMoney(s.expected, cur)} sub={`${s.invoices} ${fr ? 'factures' : 'invoices'}`} />
        <Stat label={fr ? 'Encaissé (confirmé)' : 'Confirmed collections'} value={fmtMoney(s.collected, cur)} sub={`${rate}% ${fr ? 'du total' : 'of expected'}`} tone="good" />
        <Stat label={fr ? 'Solde impayé' : 'Outstanding'} value={fmtMoney(s.outstanding, cur)} tone={s.outstanding > 0 ? 'bad' : 'good'} />
        <Stat label={fr ? 'En retard' : 'Overdue'} value={fmtMoney(s.overdue.amount, cur)} sub={`${s.overdue.count} ${fr ? 'factures' : 'invoices'}`} tone={s.overdue.count ? 'bad' : undefined} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label={fr ? 'Aujourd’hui' : 'Today'} value={fmtMoney(s.collections.today, cur)} />
        <Stat label={fr ? 'Cette semaine' : 'This week'} value={fmtMoney(s.collections.week, cur)} />
        <Stat label={fr ? 'Ce mois' : 'This month'} value={fmtMoney(s.collections.month, cur)} />
        <Stat label={fr ? 'Cette année' : 'This year'} value={fmtMoney(s.collections.year, cur)} />
      </div>

      {/* needs attention */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">{fr ? 'À traiter' : 'Needs attention'}</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { to: '/finance/reconciliation', icon: Landmark, n: n.awaiting_verification, l: fr ? 'Virements à vérifier' : 'Bank transfers to verify', hot: n.awaiting_verification > 0 },
            { to: '/finance/transactions?status=pending', icon: Clock, n: n.pending + n.processing, l: fr ? 'Paiements en attente' : 'Pending payments', hot: false },
            { to: '/finance/transactions?status=failed', icon: XCircle, n: n.failed_7d, l: fr ? 'Échecs (7 j)' : 'Failed (7 days)', hot: false },
            { to: '/finance/transactions?needs_review=true', icon: Flag, n: n.needs_review, l: fr ? 'À examiner' : 'Flagged for review', hot: n.needs_review > 0 },
          ].map(c => (
            <Link key={c.l} to={c.to} className={`rounded-xl border p-4 flex items-center gap-3 hover:shadow-sm transition ${c.hot ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'}`}>
              <c.icon size={20} className={c.hot ? 'text-amber-600' : 'text-slate-400'} />
              <div><p className="text-2xl font-bold text-slate-800">{c.n}</p><p className="text-xs text-slate-500">{c.l}</p></div>
              {c.hot && <AlertTriangle size={16} className="text-amber-500 ml-auto" />}
            </Link>
          ))}
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-800 mb-3">{fr ? 'Par mode de paiement' : 'Collections by payment method'}</h2>
          {s.by_method.length ? <Bars cur={cur} data={s.by_method.map(m => ({ label: `${methodLabel(m.method, lang)} (${m.count})`, value: m.amount }))} /> : <p className="text-sm text-slate-400">{fr ? 'Aucun paiement' : 'No payments yet'}</p>}
        </section>
        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-800 mb-3">{fr ? 'Encaissements — 30 derniers jours' : 'Collections — last 30 days'}</h2>
          {s.daily.length ? (
            <div className="flex items-end gap-1 h-36" role="img" aria-label="Daily collections">
              {s.daily.map(d => <div key={d.date} title={`${d.date}: ${fmtMoney(d.amount, cur)}`} className="flex-1 bg-indigo-500/80 hover:bg-indigo-600 rounded-t" style={{ height: `${Math.max(3, (d.amount / max30) * 100)}%` }} />)}
            </div>
          ) : <p className="text-sm text-slate-400">{fr ? 'Aucun paiement' : 'No payments in the last 30 days'}</p>}
        </section>
      </div>

      <section className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <h2 className="font-semibold text-slate-800 p-5 pb-2">{fr ? 'Par classe / programme' : 'By class / programme'}</h2>
        <table className="w-full text-sm min-w-[560px]">
          <thead className="text-xs uppercase text-slate-500 bg-slate-50"><tr><th className="text-left px-5 py-2">{fr ? 'Classe' : 'Class'}</th><th className="text-right px-5 py-2">{fr ? 'Attendu' : 'Expected'}</th><th className="text-right px-5 py-2">{fr ? 'Encaissé' : 'Collected'}</th><th className="text-right px-5 py-2">{fr ? 'Impayé' : 'Outstanding'}</th><th className="px-5 py-2 w-40">%</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {s.by_class.map(c => { const p = c.expected ? Math.round((c.collected / c.expected) * 100) : 0; return (
              <tr key={c.class_name}><td className="px-5 py-2 font-medium text-slate-800">{c.class_name}</td><td className="px-5 py-2 text-right text-slate-600">{fmtMoney(c.expected, cur)}</td><td className="px-5 py-2 text-right text-emerald-600">{fmtMoney(c.collected, cur)}</td><td className="px-5 py-2 text-right text-red-600">{fmtMoney(c.outstanding, cur)}</td>
                <td className="px-5 py-2"><div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${p}%` }} /></div></td></tr>); })}
            {!s.by_class.length && <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">{fr ? 'Aucune facture' : 'No invoices'}</td></tr>}
          </tbody>
        </table>
        <p className="text-xs text-slate-400 px-5 py-3">{fr ? 'Les facultés et départements ne sont pas modélisés dans la plateforme : la ventilation se fait par classe et par année académique.' : 'Faculties/departments are not part of the platform’s data model: breakdowns are by class and academic year.'}</p>
      </section>
    </div>
  );
}
