// Floating help assistant. It only answers questions about using the application and about the signed-in user's own
// data (the server builds all context). Conversations live in memory only: closing the tab or pressing "Clear" erases them.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, MessageCircleQuestion, Send, Trash2, X } from 'lucide-react';
import { assistant, AssistantError, type AssistantStatus, type ChatTurn } from '../../api/assistant';
import { useLanguage } from '../../i18n/LanguageContext';
import Markdown from './markdown';

interface Msg extends ChatTurn { error?: boolean }
const MAX = 2000;

export default function AssistantWidget() {
  const fr = useLanguage().lang === 'fr';
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<AssistantStatus | null>(null);
  const [statusError, setStatusError] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState<number | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const loadStatus = useCallback(() => {
    setStatusError('');
    assistant.status().then(s => { setStatus(s); setLeft(Math.max(0, s.daily_limit - s.used_today)); }).catch(e => setStatusError(e instanceof Error ? e.message : 'error'));
  }, []);
  useEffect(() => { if (open && !status) loadStatus(); }, [open, status, loadStatus]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 30); }, [open, status]);
  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight }); }, [msgs, busy]);

  const close = useCallback(() => { setOpen(false); btnRef.current?.focus(); }, []);
  // Escape closes; Tab is kept inside the panel while it is open.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
    if (e.key !== 'Tab' || !panelRef.current) return;
    const f = Array.from(panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'));
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  const T = fr
    ? { open: 'Ouvrir l’assistant', title: 'Assistant', close: 'Fermer', clear: 'Effacer la conversation', ph: 'Posez une question sur l’application…', send: 'Envoyer', thinking: 'L’assistant réfléchit…', intro: 'Bonjour ! Je peux vous expliquer comment utiliser l’application et résumer vos propres informations (inscriptions, résultats, frais…). Je ne peux effectuer aucune action à votre place.', notConf: 'L’assistant n’est pas configuré sur ce serveur. Contactez l’administrateur de votre établissement.', quota: (n: number) => `${n} question${n > 1 ? 's' : ''} restante${n > 1 ? 's' : ''} aujourd’hui`, none: 'Vous avez utilisé toutes vos questions pour aujourd’hui.', retry: 'Réessayer', hint: 'Entrée pour envoyer · Maj+Entrée pour une nouvelle ligne', chars: 'caractères' }
    : { open: 'Open assistant', title: 'Assistant', close: 'Close', clear: 'Clear conversation', ph: 'Ask a question about the application…', send: 'Send', thinking: 'The assistant is thinking…', intro: 'Hi! I can explain how to use the application and summarise your own information (registration, results, fees…). I cannot take any action for you.', notConf: 'The assistant is not configured on this server. Please contact your school administrator.', quota: (n: number) => `${n} question${n === 1 ? '' : 's'} left today`, none: 'You have used all your questions for today.', retry: 'Retry', hint: 'Enter to send · Shift+Enter for a new line', chars: 'characters' };

  const send = async () => {
    const message = text.trim();
    if (!message || busy || message.length > MAX) return;
    const history: ChatTurn[] = msgs.filter(m => !m.error).slice(-12).map(({ role, content }) => ({ role, content }));
    setMsgs(m => [...m, { role: 'user', content: message }]); setText(''); setBusy(true);
    try {
      const r = await assistant.chat(message, history);
      setMsgs(m => [...m, { role: 'assistant', content: r.reply }]); setLeft(r.remaining);
    } catch (e) {
      if (e instanceof AssistantError && e.code === 'not_configured') { setStatus(s => ({ configured: false, daily_limit: s?.daily_limit ?? 0, used_today: s?.used_today ?? 0 })); }
      else {
        if (e instanceof AssistantError && e.code === 'daily_limit') setLeft(0);
        setMsgs(m => [...m, { role: 'assistant', content: e instanceof Error ? e.message : 'Error', error: true }]);
      }
    } finally { setBusy(false); setTimeout(() => inputRef.current?.focus(), 30); }
  };

  const configured = status?.configured !== false;
  return (
    <div className="print:hidden">
      <button ref={btnRef} type="button" onClick={() => (open ? close() : setOpen(true))} aria-label={T.open} aria-expanded={open} aria-controls="assistant-panel" data-testid="assistant-button"
        className="fixed z-40 bottom-4 right-4 w-12 h-12 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 flex items-center justify-center">
        {open ? <X size={22} /> : <MessageCircleQuestion size={24} />}
      </button>
      {open && (
        <div id="assistant-panel" ref={panelRef} role="dialog" aria-label={T.title} aria-modal="false" onKeyDown={onKeyDown} data-testid="assistant-panel"
          className="fixed z-40 right-2 bottom-20 left-2 sm:left-auto sm:right-4 sm:w-96 max-h-[min(36rem,calc(100vh-6.5rem))] h-[32rem] bg-white text-slate-800 border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200">
            <MessageCircleQuestion size={18} className="text-indigo-600" aria-hidden="true" />
            <h2 className="font-semibold text-sm mr-auto">{T.title}</h2>
            {left !== null && configured && <span className="text-xs text-slate-500" data-testid="assistant-quota">{left > 0 ? T.quota(left) : T.none}</span>}
            <button type="button" onClick={() => setMsgs([])} disabled={!msgs.length} aria-label={T.clear} title={T.clear} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40"><Trash2 size={16} /></button>
            <button type="button" onClick={close} aria-label={T.close} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"><X size={16} /></button>
          </div>

          {statusError ? (
            <div className="p-4 text-sm"><p role="alert" className="text-red-600">{statusError}</p><button type="button" onClick={loadStatus} className="mt-2 text-indigo-600 underline">{T.retry}</button></div>
          ) : !status ? (
            <div className="flex-1 flex items-center justify-center text-slate-400"><Loader2 className="animate-spin" size={20} aria-label="Loading" /></div>
          ) : !configured ? (
            <div className="p-4 text-sm text-slate-600" role="status" data-testid="assistant-not-configured">{T.notConf}</div>
          ) : (
            <>
              <div ref={logRef} role="log" aria-live="polite" aria-label={T.title} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-sm">
                <div className="bg-slate-50 rounded-xl px-3 py-2 text-slate-600">{T.intro}</div>
                {msgs.map((m, i) => (
                  <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex'}>
                    <div className={`max-w-[88%] rounded-2xl px-3 py-2 ${m.role === 'user' ? 'bg-indigo-600 text-white whitespace-pre-wrap break-words' : m.error ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-slate-100 text-slate-800'}`} {...(m.error ? { role: 'alert' } : {})}>
                      {m.role === 'user' || m.error ? m.content : <Markdown text={m.content} />}
                    </div>
                  </div>
                ))}
                {busy && <div className="flex items-center gap-2 text-slate-500 text-xs"><Loader2 className="animate-spin" size={14} aria-hidden="true" />{T.thinking}</div>}
              </div>
              <div className="border-t border-slate-200 p-3">
                <div className="flex items-end gap-2">
                  <textarea ref={inputRef} rows={2} value={text} maxLength={MAX + 200} aria-label={T.ph} placeholder={T.ph} disabled={busy || left === 0}
                    onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); } }}
                    className="flex-1 resize-none px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60" />
                  <button type="button" onClick={() => void send()} disabled={busy || !text.trim() || text.length > MAX || left === 0} aria-label={T.send}
                    className="h-10 w-10 shrink-0 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center"><Send size={16} /></button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 flex justify-between"><span>{T.hint}</span><span className={text.length > MAX ? 'text-red-600' : ''}>{text.length}/{MAX} {T.chars}</span></p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
