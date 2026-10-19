import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

export const input = 'px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';
export const btn = 'px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 disabled:opacity-50';
export const btnPrimary = `${btn} bg-indigo-600 text-white hover:bg-indigo-700`;
export const btnGhost = `${btn} border border-slate-300 text-slate-700 bg-white hover:bg-slate-50`;
export const btnDanger = `${btn} bg-red-600 text-white hover:bg-red-700`;

export function useDebounced<T>(value: T, ms = 350): T {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

export function Pager({ page, limit, total, onPage }: { page: number; limit: number; total: number; onPage: (p: number) => void }) {
  const { lang } = useLanguage();
  const pages = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
      <span>{total.toLocaleString()} {lang === 'fr' ? 'résultats' : 'results'}</span>
      <div className="flex items-center gap-2">
        <button disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page" className="p-1.5 rounded-lg border border-slate-300 disabled:opacity-40"><ChevronLeft size={16} /></button>
        <span>{page} / {pages}</span>
        <button disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page" className="p-1.5 rounded-lg border border-slate-300 disabled:opacity-40"><ChevronRight size={16} /></button>
      </div>
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'good' | 'bad' | 'warn' }) {
  const cls = tone === 'good' ? 'text-emerald-600' : tone === 'bad' ? 'text-red-600' : tone === 'warn' ? 'text-amber-600' : 'text-slate-800';
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-xl sm:text-2xl font-bold mt-1 ${cls}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`bg-white rounded-2xl shadow-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[92vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800 truncate">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="p-1 text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return message ? <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{message}</p> : null;
}

export function Spinner() {
  return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-400" /></div>;
}
