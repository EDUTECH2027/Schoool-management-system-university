import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notif, type CenterNotification } from '../../api/notifications';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';

// Bell backed by the notification centre (/api/notification-center): unread count + latest items + link to the full page for the role.
const centrePath = (role?: string) => (role === 'student' ? '/student/notifications' : role === 'teacher' ? '/teacher/notifications' : (role === 'parent' ? null : '/academics/notifications'));
export default function NotificationBell() {
  const { lang } = useLanguage();
  const fr = lang === 'fr';
  const nav = useNavigate();
  const { user } = useAuth();
  const centre = centrePath(user?.role);
  const [items, setItems] = useState<CenterNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try { const r = await notif.list({ limit: 10 }); setItems(r.items); setUnread(r.unread); } catch { /* keep last state */ }
  }, []);

  useEffect(() => {
    load();
    const i = setInterval(load, 30_000);
    return () => clearInterval(i);
  }, [load]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const markAll = async () => { await notif.read().catch(() => {}); load(); };
  const click = async (n: CenterNotification) => {
    if (!n.read_at) { await notif.read([n.id]).catch(() => {}); load(); }
    if (n.link) { setOpen(false); nav(n.link); }
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => { setOpen(v => !v); if (!open) load(); }} aria-label={fr ? 'Notifications' : 'Notifications'} aria-expanded={open}
        className="relative inline-flex p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
        <Bell size={18} className="text-slate-600 dark:text-slate-300" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{unread > 9 ? '9+' : unread}</span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <p className="font-semibold text-sm text-slate-800 dark:text-slate-100">Notifications</p>
            {unread > 0 && <button onClick={markAll} className="text-xs text-indigo-600 hover:underline">{fr ? 'Tout marquer comme lu' : 'Mark all read'}</button>}
          </div>
          <ul className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
            {items.length === 0 && <li className="px-4 py-8 text-center text-sm text-slate-400">{fr ? 'Aucune notification' : 'No notifications yet'}</li>}
            {items.map(n => (
              <li key={n.id}>
                <button onClick={() => click(n)} className={`w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 ${n.read_at ? '' : 'bg-indigo-50/60 dark:bg-indigo-900/20'}`}>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{n.title}</p>
                  {n.body && <p className="text-xs text-slate-500 truncate">{n.body}</p>}
                  <p className="text-[11px] text-slate-400 mt-0.5">{new Date(n.created_at).toLocaleString(fr ? 'fr-FR' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                </button>
              </li>
            ))}
          </ul>
          {centre && <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-2 text-center"><button onClick={() => { setOpen(false); nav(centre); }} className="text-xs text-indigo-600 hover:underline">{fr ? 'Ouvrir le centre de notifications' : 'Open notification centre'}</button></div>}
        </div>
      )}
    </div>
  );
}
