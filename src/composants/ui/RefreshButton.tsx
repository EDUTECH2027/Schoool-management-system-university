import { useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface Props {
  onRefresh: () => Promise<unknown> | unknown;
  className?: string;
}

/**
 * Consistent refresh control for galleries. Ignores clicks while a refresh is running (no duplicate
 * requests), shows progress, and reports failures next to the button.
 */
export default function RefreshButton({ onRefresh, className = '' }: Props) {
  const { lang } = useLanguage();
  const fr = lang === 'fr';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const label = fr ? 'Actualiser' : 'Refresh';

  const click = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await onRefresh(); }
    catch (e) { setError(e instanceof Error ? e.message : (fr ? 'Échec de l’actualisation' : 'Refresh failed')); }
    finally { lock.current = false; setBusy(false); }
  };

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <button type="button" onClick={click} disabled={busy} aria-busy={busy} aria-label={label} title={label}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-60 disabled:cursor-wait">
        <RefreshCw size={15} className={busy ? 'animate-spin' : ''} />
        <span className="hidden sm:inline">{label}</span>
      </button>
      {error && <span role="alert" className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
