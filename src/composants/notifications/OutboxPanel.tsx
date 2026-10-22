import { useState } from 'react';
import { RotateCcw, Play } from 'lucide-react';
import { notif } from '../../api/notifications';
import { Badge, ErrorBox, Pager, Spinner, Table, btnGhost, fmtDateTime, msg, useFr, useLoad } from '../academics/ui';
import { EmailNotConfigured } from './PreferencesPanel';

const TONE = { queued: 'amber', sent: 'green', failed: 'red', skipped: 'slate' } as const;
const FR = { queued: 'En file', sent: 'Envoyé', failed: 'Échec', skipped: 'Ignoré' } as const;

export default function OutboxPanel() {
  const fr = useFr();
  const [status, setStatus] = useState(''); const [page, setPage] = useState(1);
  const o = useLoad(() => notif.outbox({ status, page }), [status, page]);
  const [err, setErr] = useState(''); const [info, setInfo] = useState(''); const [busy, setBusy] = useState(false);
  const d = o.data;
  const act = async (fn: () => Promise<string>) => { setBusy(true); setErr(''); setInfo(''); try { setInfo(await fn()); o.reload(); } catch (e) { setErr(msg(e)); } finally { setBusy(false); } };
  if (!d) return o.error ? <ErrorBox message={o.error} /> : <Spinner />;
  return (
    <div className="space-y-3" data-testid="outbox">
      {!d.smtp.configured && <EmailNotConfigured />}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {(['queued', 'sent', 'failed', 'skipped'] as const).map(s => (
          <button key={s} onClick={() => { setStatus(status === s ? '' : s); setPage(1); }} className={`rounded-lg border px-3 py-1.5 ${status === s ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : 'border-slate-200 bg-white'}`}>
            <Badge tone={TONE[s]}>{fr ? FR[s] : s}</Badge> <span className="font-semibold ml-1" data-testid={`outbox-${s}`}>{d.counts[s]}</span>
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-500">{d.smtp.configured ? `SMTP ${d.smtp.host}:${d.smtp.port}` : (fr ? 'SMTP non configuré' : 'SMTP not configured')} · {d.smtp.worker ? (fr ? 'envoi automatique actif' : 'auto-send on') : (fr ? 'envoi automatique désactivé' : 'auto-send off')}</span>
        <button className={btnGhost} disabled={busy} onClick={() => act(async () => { const r = await notif.processOutbox(); return r.configured ? `${fr ? 'Envoyés' : 'Sent'}: ${r.sent} · ${fr ? 'À réessayer' : 'Retry'}: ${r.retry} · ${fr ? 'Échecs' : 'Failed'}: ${r.failed}` : `${fr ? 'SMTP non configuré : ignorés' : 'SMTP not configured: skipped'} ${r.skipped}`; })}><Play size={14} /> {fr ? 'Traiter maintenant' : 'Process now'}</button>
        <button className={btnGhost} disabled={busy || (d.counts.failed + d.counts.skipped === 0)} onClick={() => act(async () => `${(await notif.retryOutbox()).requeued} ${fr ? 'remis en file' : 're-queued'}`)}><RotateCcw size={14} /> {fr ? 'Réessayer échecs/ignorés' : 'Retry failed/skipped'}</button>
      </div>
      {info && <p role="status" className="text-sm text-emerald-700">{info}</p>}
      <ErrorBox message={err} />
      <Table min={700} head={[fr ? 'Destinataire' : 'To', fr ? 'Objet' : 'Subject', fr ? 'Statut' : 'Status', fr ? 'Essais' : 'Tries', fr ? 'Détail' : 'Detail', fr ? 'Date' : 'Date']} empty={d.items.length ? undefined : (fr ? 'File vide.' : 'Outbox is empty.')}>
        {d.items.map(m => (
          <tr key={m.id}>
            <td className="px-4 py-2.5 text-xs">{m.to_email}</td><td className="px-4 py-2.5 max-w-[14rem] truncate">{m.subject}</td>
            <td className="px-4 py-2.5"><Badge tone={TONE[m.status]}>{fr ? FR[m.status] : m.status}</Badge></td><td className="px-4 py-2.5">{m.attempts}/{d.max_attempts}</td>
            <td className="px-4 py-2.5 text-xs text-red-700 max-w-[16rem] truncate" title={m.error ?? ''}>{m.error ?? ''}</td><td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{fmtDateTime(m.sent_at ?? m.created_at, fr ? 'fr' : 'en')}</td>
          </tr>
        ))}
      </Table>
      <Pager page={d.page} limit={d.limit} total={d.total} onPage={setPage} />
    </div>
  );
}
