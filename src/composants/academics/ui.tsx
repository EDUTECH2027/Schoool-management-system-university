import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { ErrorBox, Spinner, btnGhost, input } from '../payments/FinanceUi';

export { ErrorBox, Spinner, btnGhost, btnPrimary, btnDanger, input, Modal, Stat, Pager, useDebounced } from '../payments/FinanceUi';

export const msg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong');
export const useFr = () => useLanguage().lang === 'fr';

/** Load data on mount / when deps change, with a reload handle and an error message. Late responses of superseded requests are ignored. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const key = JSON.stringify(deps);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    fn().then(d => { if (alive) { setData(d); setError(''); } }).catch(e => { if (alive) setError(msg(e)); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick]);
  const reload = useCallback(() => setTick(t => t + 1), []);
  return { data, error, loading, reload, setData };
}

export function PageHeader({ title, subtitle, onRefresh, children }: { title: string; subtitle?: string; onRefresh?: () => void; children?: ReactNode }) {
  const fr = useFr();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="mr-auto min-w-0"><h1 className="text-2xl font-bold text-slate-800">{title}</h1>{subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}</div>
      {children}
      {onRefresh && <button className={btnGhost} onClick={onRefresh}><RefreshCw size={14} /> {fr ? 'Actualiser' : 'Refresh'}</button>}
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; badge?: number }[]; value: T; onChange: (t: T) => void }) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-slate-200">
      {tabs.map(t => (
        <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
          className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px ${value === t.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
          {t.label}{!!t.badge && <span className="ml-1.5 text-[10px] bg-amber-100 text-amber-700 rounded-full px-1.5 py-0.5">{t.badge}</span>}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block text-sm">
      <span className="block text-slate-600 mb-1 font-medium">{label}</span>
      {children}
      {hint && <span className="block text-xs text-slate-400 mt-1">{hint}</span>}
    </label>
  );
}

const TONES: Record<string, string> = {
  green: 'bg-emerald-100 text-emerald-700', amber: 'bg-amber-100 text-amber-700', red: 'bg-red-100 text-red-700', blue: 'bg-blue-100 text-blue-700', slate: 'bg-slate-100 text-slate-600', indigo: 'bg-indigo-100 text-indigo-700',
};
const STATUS_TONE: Record<string, string> = {
  registered: 'green', pending_approval: 'amber', rejected: 'red', dropped: 'slate', draft: 'slate', submitted: 'amber', approved: 'blue', published: 'green',
  proposed: 'amber', applied: 'green', issued: 'green', revoked: 'red', scheduled: 'blue', held: 'green', cancelled: 'slate', upheld: 'green', under_review: 'blue',
  promoted: 'green', carryover: 'amber', repeat: 'red', probation: 'red', eligible_graduation: 'indigo', active: 'green', graduated: 'indigo',
};
export function Badge({ children, tone }: { children: ReactNode; tone?: keyof typeof TONES }) {
  return <span className={`inline-block text-xs font-medium rounded-full px-2 py-0.5 whitespace-nowrap ${TONES[tone ?? 'slate']}`}>{children}</span>;
}
export function StatusBadge({ status }: { status: string }) {
  const fr = useFr();
  const FR: Record<string, string> = { registered: 'Inscrit', pending_approval: 'En attente', rejected: 'Refusé', dropped: 'Abandonné', draft: 'Brouillon', submitted: 'Soumis', approved: 'Approuvé', published: 'Publié', proposed: 'Proposé', applied: 'Appliqué', issued: 'Émis', revoked: 'Révoqué', scheduled: 'Planifié', held: 'Tenu', cancelled: 'Annulé', upheld: 'Accepté', under_review: 'En examen', submitted_appeal: 'Soumis',
    promoted: 'Admis', carryover: 'Admis avec dettes', repeat: 'Redouble', probation: 'Probation', eligible_graduation: 'Diplômable', active: 'Actif', graduated: 'Diplômé' };
  return <Badge tone={STATUS_TONE[status] ?? 'slate'}>{fr ? FR[status] ?? status : status.replace(/_/g, ' ')}</Badge>;
}

export function Table({ head, children, empty, min = 640 }: { head: string[]; children: ReactNode; empty?: string; min?: number }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
      <table className="w-full text-sm" style={{ minWidth: min }}>
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{head.map((h, i) => <th key={i} className="text-left px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
      {empty && <p className="px-4 py-10 text-center text-slate-400 text-sm">{empty}</p>}
    </div>
  );
}

export const fmtDate = (s?: string | null, lang = 'en') => (s ? new Date(s).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
export const fmtDateTime = (s?: string | null, lang = 'en') => (s ? new Date(s).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
export const toLocalInput = (s?: string | null) => { if (!s) return ''; const d = new Date(s); const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
export const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;
export const DAY_FR: Record<string, string> = { monday: 'Lundi', tuesday: 'Mardi', wednesday: 'Mercredi', thursday: 'Jeudi', friday: 'Vendredi' };
export const dayLabel = (d: string, fr: boolean) => (fr ? DAY_FR[d] ?? d : d.charAt(0).toUpperCase() + d.slice(1));

export { Spinner as Loading, ErrorBox as Err, input as inputCls };
