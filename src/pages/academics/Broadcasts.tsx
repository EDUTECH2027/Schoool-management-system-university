import { useEffect, useState } from 'react';
import { Megaphone, Send, Users } from 'lucide-react';
import { notif, type Audience, type Preview } from '../../api/notifications';
import { Badge, ErrorBox, Field, PageHeader, Pager, Spinner, Table, Tabs, btnPrimary, fmtDateTime, input, msg, useFr, useLoad } from '../../composants/academics/ui';
import { EmailNotConfigured } from '../../composants/notifications/PreferencesPanel';
import OutboxPanel from '../../composants/notifications/OutboxPanel';

const ROLE_LABEL: Record<string, [string, string]> = {
  student: ['Students', 'Étudiants'], teacher: ['Lecturers', 'Enseignants'], parent: ['Parents', 'Parents'], academic_officer: ['Academic officers', 'Responsables académiques'],
  finance_officer: ['Finance', 'Finances'], librarian: ['Librarians', 'Bibliothécaires'], super_admin: ['Administrators', 'Administrateurs'],
};
const EMPTY: Audience = { roles: [], programme_ids: [], class_ids: [], offering_ids: [] };

function Chips({ title, items, value, onChange }: { title: string; items: { id: string; name: string }[]; value: string[]; onChange: (v: string[]) => void }) {
  const fr = useFr();
  const [q, setQ] = useState('');
  const shown = items.filter(i => !q || i.name.toLowerCase().includes(q.toLowerCase()));
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter(x => x !== id) : [...value, id]);
  return (
    <fieldset className="space-y-1.5 min-w-0">
      <legend className="text-sm font-medium text-slate-600 mb-1">{title} {value.length > 0 && <Badge tone="indigo">{value.length}</Badge>}</legend>
      {items.length > 6 && <input className={`${input} w-full`} placeholder={fr ? 'Filtrer…' : 'Filter…'} value={q} onChange={e => setQ(e.target.value)} aria-label={`${title} filter`} />}
      <div className="max-h-36 overflow-y-auto space-y-1 border border-slate-200 rounded-lg p-2 bg-white">
        {items.length === 0 && <p className="text-xs text-slate-400">{fr ? 'Aucun élément' : 'Nothing available'}</p>}
        {shown.map(i => <label key={i.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={value.includes(i.id)} onChange={() => toggle(i.id)} /> <span className="truncate">{i.name}</span></label>)}
      </div>
    </fieldset>
  );
}

function Compose({ onSent }: { onSent: () => void }) {
  const fr = useFr();
  const opts = useLoad(() => notif.options(), []);
  const [title, setTitle] = useState(''); const [body, setBody] = useState('');
  const [aud, setAud] = useState<Audience>(EMPTY);
  const [channels, setChannels] = useState<string[]>(['in_app']); const [mustRead, setMustRead] = useState(false);
  const [prev, setPrev] = useState<Preview | null>(null); const [prevErr, setPrevErr] = useState('');
  const [err, setErr] = useState(''); const [ok, setOk] = useState(''); const [busy, setBusy] = useState(false);
  const key = JSON.stringify(aud);
  const hasAud = aud.roles.length + aud.programme_ids.length + aud.class_ids.length + aud.offering_ids.length > 0;
  useEffect(() => {
    if (!hasAud) { setPrev(null); setPrevErr(''); return; }
    let alive = true;
    notif.preview(aud).then(p => { if (alive) { setPrev(p); setPrevErr(''); } }).catch(e => { if (alive) { setPrev(null); setPrevErr(msg(e)); } });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const o = opts.data;
  const set = <K extends keyof Audience>(k: K, v: Audience[K]) => setAud(a => ({ ...a, [k]: v }));
  const toggleCh = (c: string) => setChannels(x => (x.includes(c) ? x.filter(y => y !== c) : [...x, c]));
  const send = async () => {
    setBusy(true); setErr(''); setOk('');
    try {
      const r = await notif.send({ title, body, channels, must_read: mustRead, audience: aud });
      setOk(`${fr ? 'Envoyé à' : 'Sent to'} ${r.recipients} ${fr ? 'destinataires' : 'recipients'}.${r.warning ? ` ${r.warning}` : ''}`);
      setTitle(''); setBody(''); onSent();
    } catch (e) { setErr(msg(e)); } finally { setBusy(false); }
  };
  if (!o) return opts.error ? <ErrorBox message={opts.error} /> : <Spinner />;
  const ready = title.trim().length >= 3 && body.trim() && channels.length > 0 && !!prev && prev.recipients > 0;
  return (
    <div className="grid lg:grid-cols-2 gap-5" data-testid="compose">
      <div className="space-y-3 bg-white rounded-xl border border-slate-200 p-4">
        <Field label={fr ? 'Titre' : 'Title'}><input className={`${input} w-full`} value={title} maxLength={150} onChange={e => setTitle(e.target.value)} /></Field>
        <Field label="Message"><textarea className={`${input} w-full`} rows={6} maxLength={5000} value={body} onChange={e => setBody(e.target.value)} /></Field>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={channels.includes('in_app')} onChange={() => toggleCh('in_app')} /> {fr ? 'Dans l’application' : 'In-app'}</label>
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={channels.includes('email')} onChange={() => toggleCh('email')} /> E-mail</label>
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={mustRead} onChange={e => setMustRead(e.target.checked)} /> {fr ? 'Lecture obligatoire (ignore les préférences)' : 'Must read (ignores preferences)'}</label>
        </div>
        {channels.includes('email') && !o.email_configured && <EmailNotConfigured />}
      </div>
      <div className="space-y-3 bg-white rounded-xl border border-slate-200 p-4">
        <p className="font-semibold text-slate-700 flex items-center gap-2"><Users size={16} /> {fr ? 'Destinataires' : 'Audience'}</p>
        <fieldset><legend className="text-sm font-medium text-slate-600 mb-1">{fr ? 'Rôles' : 'Roles'}</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-1">{o.roles.filter(r => ROLE_LABEL[r]).map(r => <label key={r} className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={aud.roles.includes(r)} onChange={() => set('roles', aud.roles.includes(r) ? aud.roles.filter(x => x !== r) : [...aud.roles, r])} /> {ROLE_LABEL[r][fr ? 1 : 0]}</label>)}</div>
        </fieldset>
        <div className="grid sm:grid-cols-3 gap-3">
          <Chips title={fr ? 'Filières' : 'Programmes'} items={o.programmes.map(p => ({ id: p.id, name: p.name }))} value={aud.programme_ids} onChange={v => set('programme_ids', v)} />
          <Chips title={fr ? 'Classes' : 'Classes'} items={o.classes} value={aud.class_ids} onChange={v => set('class_ids', v)} />
          <Chips title={fr ? 'Cours (semestre en cours)' : 'Courses (current term)'} items={o.offerings} value={aud.offering_ids} onChange={v => set('offering_ids', v)} />
        </div>
        <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm" aria-live="polite" data-testid="preview">
          {!hasAud ? <span className="text-slate-400">{fr ? 'Choisissez au moins un rôle, une filière, une classe ou un cours.' : 'Pick at least one role, programme, class or course.'}</span>
            : prevErr ? <span className="text-red-600">{prevErr}</span>
              : prev ? <span><b data-testid="preview-count">{prev.recipients}</b> {fr ? 'destinataires' : 'recipients'} · {prev.with_email} {fr ? 'avec e-mail' : 'with e-mail'} <span className="text-slate-400">(max {prev.max_recipients})</span></span> : <Spinner />}
        </div>
        <ErrorBox message={err} />
        {ok && <p role="status" className="text-sm text-emerald-700">{ok}</p>}
        <div className="flex justify-end"><button className={btnPrimary} disabled={busy || !ready} onClick={send}><Send size={14} /> {fr ? 'Envoyer' : 'Send'}</button></div>
      </div>
    </div>
  );
}

function History({ tick }: { tick: number }) {
  const fr = useFr();
  const [page, setPage] = useState(1);
  const h = useLoad(() => notif.broadcasts(page), [page, tick]);
  const d = h.data;
  if (!d) return h.error ? <ErrorBox message={h.error} /> : <Spinner />;
  return (
    <div className="space-y-3">
      <Table min={700} head={[fr ? 'Date' : 'Date', fr ? 'Titre' : 'Title', fr ? 'Canaux' : 'Channels', fr ? 'Destinataires' : 'Recipients', fr ? 'Livraison' : 'Delivered', fr ? 'Auteur' : 'By']} empty={d.items.length ? undefined : (fr ? 'Aucun message envoyé.' : 'Nothing sent yet.')}>
        {d.items.map(b => (
          <tr key={b.id} data-testid="history-row">
            <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">{fmtDateTime(b.created_at, fr ? 'fr' : 'en')}</td>
            <td className="px-4 py-3"><span className="font-medium">{b.title}</span>{b.must_read && <span className="ml-1"><Badge tone="red">{fr ? 'Obligatoire' : 'Must read'}</Badge></span>}<span className="block text-xs text-slate-400 truncate max-w-[18rem]">{b.body}</span></td>
            <td className="px-4 py-3">{b.channels.map(c => <span key={c} className="mr-1"><Badge tone="blue">{c === 'in_app' ? 'in-app' : 'e-mail'}</Badge></span>)}</td>
            <td className="px-4 py-3">{b.recipients}</td>
            <td className="px-4 py-3 text-xs text-slate-500">{b.delivered ? `${b.delivered.in_app} in-app · ${b.delivered.email} e-mail` : '—'}</td>
            <td className="px-4 py-3 text-slate-600">{b.created_by_name ?? '—'}</td>
          </tr>
        ))}
      </Table>
      <Pager page={d.page} limit={d.limit} total={d.total} onPage={setPage} />
    </div>
  );
}

export default function Broadcasts() {
  const fr = useFr();
  const [tab, setTab] = useState<'compose' | 'history' | 'outbox'>('compose');
  const [tick, setTick] = useState(0);
  return (
    <div className="space-y-5">
      <PageHeader title={fr ? 'Messages & annonces' : 'Broadcast messages'} subtitle={fr ? 'Écrire aux étudiants, enseignants ou groupes ciblés' : 'Write to students, lecturers or targeted groups'}><Megaphone className="text-indigo-500" size={20} /></PageHeader>
      <Tabs tabs={[{ id: 'compose', label: fr ? 'Rédiger' : 'Compose' }, { id: 'history', label: fr ? 'Historique' : 'History' }, { id: 'outbox', label: fr ? 'File d’e-mails' : 'E-mail outbox' }]} value={tab} onChange={setTab} />
      {tab === 'compose' && <Compose onSent={() => setTick(t => t + 1)} />}
      {tab === 'history' && <History tick={tick} />}
      {tab === 'outbox' && <OutboxPanel />}
    </div>
  );
}
