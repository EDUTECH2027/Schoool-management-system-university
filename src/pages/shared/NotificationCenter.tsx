import { useState } from 'react';
import { Bell, Check, CheckCheck, Settings2, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notif, type CenterNotification } from '../../api/notifications';
import { Badge, ErrorBox, PageHeader, Pager, Spinner, Tabs, btnGhost, fmtDateTime, input, msg, useFr, useLoad } from '../../composants/academics/ui';
import PreferencesPanel, { EmailNotConfigured } from '../../composants/notifications/PreferencesPanel';

const TYPES: [string, string, string][] = [
  ['', 'All types', 'Tous les types'], ['broadcast', 'Announcements', 'Annonces'], ['must_read', 'Must-read', 'Obligatoires'], ['service_update', 'My requests', 'Mes demandes'],
  ['service_request', 'Service desk', 'Guichet'], ['results_published', 'Results', 'Résultats'], ['registration_decision', 'Registration', 'Inscriptions'], ['exam_rescheduled', 'Exams', 'Examens'],
  ['class_reminder', 'Class reminders', 'Rappels de cours'], ['security', 'Security', 'Sécurité'],
];

export default function NotificationCenter() {
  const fr = useFr(); const nav = useNavigate();
  const [tab, setTab] = useState<'inbox' | 'prefs'>('inbox');
  const [unreadOnly, setUnreadOnly] = useState(false); const [type, setType] = useState(''); const [page, setPage] = useState(1);
  const list = useLoad(() => notif.list({ page, limit: 15, unread: unreadOnly, type }), [page, unreadOnly, type]);
  const status = useLoad(() => notif.emailStatus(), []);
  const [err, setErr] = useState('');
  const d = list.data;
  const run = async (fn: () => Promise<unknown>) => { setErr(''); try { await fn(); list.reload(); } catch (e) { setErr(msg(e)); } };
  const open = async (n: CenterNotification) => {
    if (!n.read_at) await notif.read([n.id]).catch(() => undefined);
    if (n.link) nav(n.link); else list.reload();
  };
  return (
    <div className="space-y-5">
      <PageHeader title="Notifications" subtitle={d ? `${d.unread} ${fr ? 'non lues' : 'unread'}` : undefined} onRefresh={list.reload}>
        {tab === 'inbox' && <button className={btnGhost} disabled={!d?.unread} onClick={() => run(() => notif.read())}><CheckCheck size={14} /> {fr ? 'Tout marquer comme lu' : 'Mark all read'}</button>}
      </PageHeader>
      <Tabs tabs={[{ id: 'inbox', label: fr ? 'Boîte de réception' : 'Inbox', badge: d?.unread }, { id: 'prefs', label: fr ? 'Préférences' : 'Preferences' }]} value={tab} onChange={setTab} />
      {status.data && !status.data.configured && tab === 'inbox' && <EmailNotConfigured />}
      {tab === 'prefs' ? (
        <div className="bg-white rounded-xl border border-slate-200 p-4"><div className="flex items-center gap-2 mb-3 text-slate-700 font-semibold"><Settings2 size={16} /> {fr ? 'Préférences de notification' : 'Notification preferences'}</div><PreferencesPanel /></div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 items-center">
            <select className={input} aria-label="Type filter" value={type} onChange={e => { setType(e.target.value); setPage(1); }}>{TYPES.map(([v, en, f]) => <option key={v} value={v}>{fr ? f : en}</option>)}</select>
            <label className="text-sm flex items-center gap-1.5 text-slate-600"><input type="checkbox" checked={unreadOnly} onChange={e => { setUnreadOnly(e.target.checked); setPage(1); }} /> {fr ? 'Non lues seulement' : 'Unread only'}</label>
          </div>
          <ErrorBox message={err || list.error} />
          {list.loading && !d ? <Spinner /> : d && d.items.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 py-14 text-center text-slate-400"><Bell className="mx-auto mb-2" /> {fr ? 'Aucune notification.' : 'No notifications.'}</div>
          ) : (
            <ul className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100" data-testid="notif-list">
              {(d?.items ?? []).map(n => (
                <li key={n.id} data-unread={n.read_at ? '0' : '1'} className={`flex items-start gap-3 px-4 py-3 ${n.read_at ? '' : 'bg-indigo-50/60 dark:bg-indigo-900/20'}`}>
                  <button className="flex-1 min-w-0 text-left" onClick={() => open(n)}>
                    <span className="flex flex-wrap items-center gap-2"><span className={`text-sm text-slate-800 ${n.read_at ? '' : 'font-semibold'}`}>{n.title}</span>{(n.type === 'must_read' || n.type === 'security') && <Badge tone="red">{n.type === 'security' ? (fr ? 'Sécurité' : 'Security') : (fr ? 'Obligatoire' : 'Must read')}</Badge>}</span>
                    {n.body && <span className="block text-sm text-slate-500 whitespace-pre-wrap wrap-break-word">{n.body}</span>}
                    <span className="block text-xs text-slate-400 mt-0.5">{fmtDateTime(n.created_at, fr ? 'fr' : 'en')}</span>
                  </button>
                  {!n.read_at && <button aria-label={fr ? 'Marquer comme lu' : 'Mark as read'} className="p-1.5 rounded hover:bg-slate-100 text-slate-500" onClick={() => run(() => notif.read([n.id]))}><Check size={15} /></button>}
                  <button aria-label={fr ? 'Supprimer' : 'Delete'} className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-red-600" onClick={() => run(() => notif.remove(n.id))}><Trash2 size={15} /></button>
                </li>
              ))}
            </ul>
          )}
          {d && <Pager page={d.page} limit={d.limit} total={d.total} onPage={setPage} />}
        </>
      )}
    </div>
  );
}
