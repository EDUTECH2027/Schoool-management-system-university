import { useState } from 'react';
import { Download, KeyRound, ShieldAlert, Unlock } from 'lucide-react';
import { security, type EventFilter, type SecEvent, type SecSummary } from '../../api/security';
import { Card, ColumnChart, Empty, Kpi, LineChart, PALETTE, RankBars, nf } from '../../composants/analytics/charts';
import { useAuth } from '../../context/AuthContext';
import { Badge, ErrorBox, Modal, PageHeader, Pager, Spinner, Table, Tabs, btnDanger, btnGhost, btnPrimary, fmtDateTime, input, msg, useDebounced, useFr, useLoad } from '../../composants/academics/ui';

type Tab = 'overview' | 'events' | 'accounts';

const TYPES: Record<string, [string, string, 'green' | 'red' | 'amber' | 'blue' | 'slate' | 'indigo']> = {
  login_success: ['Sign-in', 'Connexion', 'green'], login_failed: ['Failed sign-in', 'Échec de connexion', 'red'], account_locked: ['Account locked', 'Compte verrouillé', 'red'],
  account_unlocked: ['Account unlocked', 'Compte déverrouillé', 'blue'], password_changed: ['Password changed', 'Mot de passe modifié', 'indigo'], password_reset_forced: ['Reset forced', 'Changement imposé', 'amber'],
  permission_denied: ['Permission denied', 'Accès refusé', 'amber'], rate_limited: ['Rate limited', 'Limite de débit', 'amber'],
};
const ROLE_FR: Record<string, string> = { super_admin: 'Administrateur', head_teacher: 'Administrateur', teacher: 'Enseignant', student: 'Étudiant', parent: 'Parent', finance_officer: 'Finance', academic_officer: 'Affaires académiques', librarian: 'Bibliothécaire' };

export default function SecurityCenter() {
  const { user } = useAuth();
  const fr = useFr();
  if (user?.role !== 'super_admin' && user?.role !== 'head_teacher') {
    return <div className="max-w-xl bg-white rounded-xl border border-slate-200 p-6"><h1 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><ShieldAlert size={18} className="text-amber-600" /> {fr ? 'Accès réservé' : 'Restricted'}</h1><p className="text-sm text-slate-500 mt-2">{fr ? 'Le centre de sécurité est réservé à l’administrateur de l’établissement.' : 'The security centre is reserved for the school administrator.'}</p></div>;
  }
  return <SecurityInner />;
}

function SecurityInner() {
  const fr = useFr();
  const lang = fr ? 'fr' : 'en';
  const [tab, setTab] = useState<Tab>('overview');
  const [days, setDays] = useState(14);
  const [notice, setNotice] = useState('');
  const [err, setErr] = useState('');
  const sum = useLoad(() => security.summary(days), [days]);
  const cfg = useLoad(() => security.config(), []);

  return (
    <div className="space-y-5">
      <PageHeader title={fr ? 'Centre de sécurité' : 'Security centre'} subtitle={fr ? 'Connexions, verrouillages et mots de passe de votre établissement' : 'Sign-ins, lockouts and passwords of your school'} onRefresh={() => sum.reload()} />
      {cfg.data && (
        <p className="text-xs text-slate-500">
          {fr ? `Verrouillage après ${cfg.data.login_max_failures} échecs pendant ${cfg.data.login_lock_minutes} min · mot de passe d’au moins ${cfg.data.password_min_length} caractères · limites de débit actives.` : `Accounts lock after ${cfg.data.login_max_failures} failed sign-ins for ${cfg.data.login_lock_minutes} min · passwords need at least ${cfg.data.password_min_length} characters · rate limits are active.`}
          {' '}{fr ? 'L’authentification multifacteur n’est pas activée.' : 'Multi-factor authentication is not enabled.'}
        </p>
      )}
      <Tabs tabs={[{ id: 'overview', label: fr ? 'Synthèse' : 'Overview' }, { id: 'events', label: fr ? 'Événements' : 'Events' }, { id: 'accounts', label: fr ? 'Comptes' : 'Accounts', badge: sum.data?.locked_accounts.length || undefined }]} value={tab} onChange={setTab} />
      {notice && <p role="status" className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{notice}</p>}
      <ErrorBox message={err} />
      {tab === 'overview' && (sum.error ? <ErrorBox message={sum.error} /> : !sum.data ? <Spinner /> : <Overview d={sum.data} days={days} setDays={setDays} fr={fr} lang={lang} />)}
      {tab === 'events' && <Events fr={fr} lang={lang} setErr={setErr} />}
      {tab === 'accounts' && <Accounts fr={fr} lang={lang} locked={sum.data?.locked_accounts ?? []} mustChange={sum.data?.must_change_password ?? 0} reload={sum.reload} setNotice={setNotice} setErr={setErr} />}
    </div>
  );
}

function Overview({ d, days, setDays, fr, lang }: { d: SecSummary; days: number; setDays: (n: number) => void; fr: boolean; lang: string }) {
  const t = d.totals;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <label htmlFor="sec-days">{fr ? 'Période' : 'Period'}</label>
        <select id="sec-days" className={`${input} w-36`} value={days} onChange={e => setDays(Number(e.target.value))}>
          {[7, 14, 30, 90].map(n => <option key={n} value={n}>{n} {fr ? 'jours' : 'days'}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label={fr ? 'Connexions réussies' : 'Successful sign-ins'} value={nf(t.login_success ?? 0, lang)} tone="good" />
        <Kpi label={fr ? 'Échecs de connexion' : 'Failed sign-ins'} value={nf(t.login_failed ?? 0, lang)} tone={t.login_failed ? 'warn' : 'good'} />
        <Kpi label={fr ? 'Comptes verrouillés' : 'Locked accounts'} value={nf(d.locked_accounts.length, lang)} tone={d.locked_accounts.length ? 'bad' : 'good'} sub={`${nf(t.account_locked ?? 0, lang)} ${fr ? 'verrouillages sur la période' : 'lockouts in the period'}`} />
        <Kpi label={fr ? 'Accès refusés / limitations' : 'Denied / rate-limited'} value={`${nf(t.permission_denied ?? 0, lang)} / ${nf(t.rate_limited ?? 0, lang)}`} />
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title={fr ? 'Échecs de connexion par jour' : 'Failed sign-ins per day'}>
          <ColumnChart lang={lang} ariaLabel={fr ? 'Échecs de connexion par jour' : 'Failed sign-ins per day'} data={d.by_day.map(x => ({ label: x.day.slice(5), value: x.failed }))} colors={d.by_day.map(() => PALETTE[3])} valueLabel={fr ? 'Échecs' : 'Failures'} />
        </Card>
        <Card title={fr ? 'Connexions et verrouillages' : 'Sign-ins and lockouts'}>
          <LineChart lang={lang} digits={0} ariaLabel={fr ? 'Connexions et verrouillages par jour' : 'Sign-ins and lockouts per day'} labels={d.by_day.map(x => x.day.slice(5))} series={[{ name: fr ? 'Connexions' : 'Sign-ins', values: d.by_day.map(x => x.success), color: PALETTE[1] }, { name: fr ? 'Verrouillages' : 'Lockouts', values: d.by_day.map(x => x.locked), color: PALETTE[3] }]} />
        </Card>
        <Card title={fr ? 'Adresses IP avec le plus d’échecs' : 'Top IPs by failed sign-ins'}>
          {d.top_ips.length ? <RankBars lang={lang} digits={0} color={PALETTE[3]} ariaLabel={fr ? 'Adresses IP' : 'Top IPs'} rows={d.top_ips.map(ip => ({ label: ip.ip, value: ip.failures, hint: `${ip.accounts} ${fr ? 'compte(s)' : 'account(s)'}` }))} /> : <Empty text={fr ? 'Aucun échec' : 'No failures'} />}
        </Card>
        <Card title={fr ? 'À surveiller' : 'Watch list'}>
          <ul className="text-sm text-slate-700 space-y-2">
            <li className="flex items-center gap-2"><ShieldAlert size={15} className="text-amber-600" /> {nf(d.accounts_with_failures, lang)} {fr ? 'compte(s) avec des échecs récents non effacés' : 'account(s) with uncleared recent failures'}</li>
            <li className="flex items-center gap-2"><KeyRound size={15} className="text-indigo-600" /> {nf(d.must_change_password, lang)} {fr ? 'compte(s) devant changer de mot de passe' : 'account(s) that must change their password'}</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Events({ fr, lang, setErr }: { fr: boolean; lang: string; setErr: (s: string) => void }) {
  const [type, setType] = useState(''); const [email, setEmail] = useState(''); const [ip, setIp] = useState(''); const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const dEmail = useDebounced(email), dIp = useDebounced(ip);
  const filter: EventFilter = { type: type || undefined, email: dEmail || undefined, ip: dIp || undefined, from: from || undefined, to: to || undefined };
  const list = useLoad(() => security.events(filter, page), [JSON.stringify(filter), page]);
  const reset = (fn: () => void) => { fn(); setPage(1); };
  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-end gap-3">
        <label className="text-xs text-slate-500 flex flex-col gap-1">{fr ? 'Type' : 'Type'}
          <select className={`${input} w-48`} value={type} onChange={e => reset(() => setType(e.target.value))}>
            <option value="">{fr ? 'Tous' : 'All'}</option>{Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v[fr ? 1 : 0]}</option>)}
          </select></label>
        <label className="text-xs text-slate-500 flex flex-col gap-1">E-mail<input className={`${input} w-48`} value={email} onChange={e => reset(() => setEmail(e.target.value))} placeholder="name@…" /></label>
        <label className="text-xs text-slate-500 flex flex-col gap-1">IP<input className={`${input} w-36`} value={ip} onChange={e => reset(() => setIp(e.target.value))} /></label>
        <label className="text-xs text-slate-500 flex flex-col gap-1">{fr ? 'Du' : 'From'}<input type="date" className={input} value={from} onChange={e => reset(() => setFrom(e.target.value))} /></label>
        <label className="text-xs text-slate-500 flex flex-col gap-1">{fr ? 'Au' : 'To'}<input type="date" className={input} value={to} onChange={e => reset(() => setTo(e.target.value))} /></label>
        <button className={`${btnGhost} ml-auto`} onClick={() => security.exportCsv(filter).catch(e => setErr(msg(e)))}><Download size={14} /> CSV</button>
      </div>
      <ErrorBox message={list.error} />
      {!list.data ? <Spinner /> : (
        <div className="bg-white rounded-xl border border-slate-200">
          <Table min={820} head={[fr ? 'Date' : 'Time', 'Type', 'E-mail', 'IP', fr ? 'Détail' : 'Detail']} empty={list.data.items.length ? undefined : (fr ? 'Aucun événement' : 'No events')}>
            {list.data.items.map((e: SecEvent) => (
              <tr key={e.id}>
                <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{fmtDateTime(e.created_at, lang)}</td>
                <td className="px-4 py-2.5"><Badge tone={TYPES[e.type]?.[2] ?? 'slate'}>{TYPES[e.type]?.[fr ? 1 : 0] ?? e.type}</Badge></td>
                <td className="px-4 py-2.5 break-all">{e.email ?? '—'}</td>
                <td className="px-4 py-2.5 font-mono text-xs">{e.ip ?? '—'}</td>
                <td className="px-4 py-2.5 text-xs text-slate-500 max-w-xs wrap-break-word">{e.detail ? Object.entries(e.detail).map(([k, v]) => `${k}: ${String(v)}`).join(' · ') : '—'}</td>
              </tr>
            ))}
          </Table>
          <Pager page={page} limit={list.data.limit} total={list.data.total} onPage={setPage} />
        </div>
      )}
    </div>
  );
}

function Accounts({ fr, lang, locked, mustChange, reload, setNotice, setErr }: { fr: boolean; lang: string; locked: { id: string; name: string; email: string; role: string; locked_until: string }[]; mustChange: number; reload: () => void; setNotice: (s: string) => void; setErr: (s: string) => void }) {
  const [q, setQ] = useState(''); const dq = useDebounced(q);
  const users = useLoad(() => security.users(), []);
  const [target, setTarget] = useState<{ id: string; name: string; email: string } | null>(null);
  const [revoke, setRevoke] = useState(true);
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<{ message: string }>, ok: string) => {
    setBusy(true); setErr(''); setNotice('');
    try { await fn(); setNotice(ok); reload(); } catch (e) { setErr(msg(e)); } finally { setBusy(false); }
  };
  const matches = (users.data ?? []).filter(u => dq && (u.name.toLowerCase().includes(dq.toLowerCase()) || u.email.toLowerCase().includes(dq.toLowerCase()))).slice(0, 8);
  return (
    <div className="space-y-5">
      <Card title={fr ? 'Comptes verrouillés' : 'Locked accounts'} subtitle={fr ? 'Le verrou expire seul ; vous pouvez le lever immédiatement.' : 'Locks expire on their own; you can lift one immediately.'}>
        <Table min={560} head={[fr ? 'Nom' : 'Name', 'E-mail', fr ? 'Rôle' : 'Role', fr ? 'Jusqu’à' : 'Until', '']} empty={locked.length ? undefined : (fr ? 'Aucun compte verrouillé' : 'No locked accounts')}>
          {locked.map(u => (
            <tr key={u.id}><td className="px-4 py-2.5">{u.name}</td><td className="px-4 py-2.5 break-all">{u.email}</td><td className="px-4 py-2.5">{fr ? ROLE_FR[u.role] ?? u.role : u.role.replace(/_/g, ' ')}</td><td className="px-4 py-2.5 whitespace-nowrap">{fmtDateTime(u.locked_until, lang)}</td>
              <td className="px-4 py-2.5 text-right"><button disabled={busy} className={btnPrimary} onClick={() => void run(() => security.unlock(u.id), fr ? `Compte ${u.email} déverrouillé.` : `${u.email} unlocked.`)}><Unlock size={14} /> {fr ? 'Déverrouiller' : 'Unlock'}</button></td></tr>
          ))}
        </Table>
      </Card>
      <Card title={fr ? 'Imposer un changement de mot de passe' : 'Force a password change'} subtitle={fr ? `${mustChange} compte(s) en attente de changement` : `${mustChange} account(s) currently pending a change`}>
        <div className="space-y-2 max-w-xl">
          <label className="text-xs text-slate-500 flex flex-col gap-1">{fr ? 'Rechercher un utilisateur' : 'Find a user'}
            <input className={input} value={q} onChange={e => setQ(e.target.value)} placeholder={fr ? 'Nom ou e-mail' : 'Name or e-mail'} /></label>
          {users.error && <ErrorBox message={users.error} />}
          <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
            {matches.map(u => <li key={u.id} className="flex items-center gap-3 px-3 py-2 text-sm"><span className="min-w-0 mr-auto truncate">{u.name} <span className="text-slate-400">· {u.email}</span></span><button className={btnGhost} onClick={() => setTarget(u)}><KeyRound size={14} /> {fr ? 'Imposer' : 'Force'}</button></li>)}
            {dq && !matches.length && <li className="px-3 py-3 text-sm text-slate-400">{fr ? 'Aucun résultat' : 'No match'}</li>}
          </ul>
        </div>
      </Card>
      {target && (
        <Modal title={fr ? 'Imposer un nouveau mot de passe' : 'Force a new password'} onClose={() => setTarget(null)}>
          <p className="text-sm text-slate-600">{fr ? `${target.name} (${target.email}) devra choisir un nouveau mot de passe à sa prochaine connexion.` : `${target.name} (${target.email}) must choose a new password at the next sign-in.`}</p>
          <label className="flex items-center gap-2 text-sm text-slate-700 mt-3"><input type="checkbox" checked={revoke} onChange={e => setRevoke(e.target.checked)} /> {fr ? 'Déconnecter aussi les sessions ouvertes' : 'Also sign out its open sessions'}</label>
          <div className="flex justify-end gap-2 mt-5">
            <button className={btnGhost} onClick={() => setTarget(null)}>{fr ? 'Annuler' : 'Cancel'}</button>
            <button disabled={busy} className={btnDanger} onClick={() => void run(() => security.forceReset(target.id, revoke), fr ? 'Changement de mot de passe imposé.' : 'Password change enforced.').then(() => setTarget(null))}>{fr ? 'Confirmer' : 'Confirm'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
