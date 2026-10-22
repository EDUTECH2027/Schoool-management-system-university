import { useState } from 'react';
import { BookOpen, CornerDownLeft, Plus, RefreshCw, Search, UserCheck } from 'lucide-react';
import { lib, type LibItem, type Loan, type StudentLookup } from '../../api/library';
import { Badge, ErrorBox, Field, Modal, PageHeader, Pager, Spinner, Stat, Table, Tabs, btnDanger, btnGhost, btnPrimary, fmtDate, input, msg, useDebounced, useFr, useLoad } from '../../composants/academics/ui';
import { AvailabilityBadge, ItemModal, KINDS, kindLabel, money } from '../../composants/library/parts';
import { useLanguage } from '../../i18n/LanguageContext';

type Tab = 'catalogue' | 'loans' | 'reservations' | 'fines' | 'overdue' | 'settings';

export default function LibraryAdmin() {
  const fr = useFr();
  const [tab, setTab] = useState<Tab>('catalogue');
  const stats = useLoad(() => lib.stats(), []);
  const settings = useLoad(() => lib.settings(), []);
  const cur = settings.data?.currency ?? '';
  const { lang } = useLanguage();
  return (
    <div className="space-y-5">
      <PageHeader title={fr ? 'Bibliothèque' : 'Library'} subtitle={fr ? 'Catalogue, prêts, réservations et amendes.' : 'Catalogue, loans, reservations and fines.'} onRefresh={stats.reload} />
      {stats.data && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Stat label={fr ? 'Ouvrages actifs' : 'Active items'} value={String(stats.data.items)} />
          <Stat label={fr ? 'Prêts en cours' : 'Active loans'} value={String(stats.data.active_loans)} />
          <Stat label={fr ? 'En retard' : 'Overdue'} value={String(stats.data.overdue)} tone={stats.data.overdue ? 'bad' : undefined} />
          <Stat label={fr ? 'Réservations' : 'Reservations'} value={String(stats.data.reservations_waiting + stats.data.reservations_ready)} sub={`${stats.data.reservations_ready} ${fr ? 'prêtes' : 'ready'}`} />
          <Stat label={fr ? 'Amendes dues' : 'Fines due'} value={money(stats.data.unpaid_fines, cur, lang)} tone={stats.data.unpaid_fines ? 'warn' : undefined} />
        </div>
      )}
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[
        { id: 'catalogue', label: fr ? 'Catalogue' : 'Catalogue' }, { id: 'loans', label: fr ? 'Prêts & retours' : 'Loans & returns' }, { id: 'reservations', label: fr ? 'Réservations' : 'Reservations' },
        { id: 'fines', label: fr ? 'Amendes' : 'Fines' }, { id: 'overdue', label: fr ? 'Retards' : 'Overdue', badge: stats.data?.overdue }, { id: 'settings', label: fr ? 'Paramètres' : 'Settings' },
      ]} />
      {tab === 'catalogue' && <Catalogue onChange={stats.reload} />}
      {tab === 'loans' && <Loans cur={cur} onChange={stats.reload} />}
      {tab === 'reservations' && <Reservations onChange={stats.reload} />}
      {tab === 'fines' && <Fines onChange={stats.reload} />}
      {tab === 'overdue' && <Overdue onChange={stats.reload} />}
      {tab === 'settings' && <SettingsTab onSaved={() => { settings.reload(); stats.reload(); }} />}
    </div>
  );
}

// ── Catalogue ─────────────────────────────────────────────────────────────────
function Catalogue({ onChange }: { onChange: () => void }) {
  const fr = useFr();
  const [q, setQ] = useState(''); const [kind, setKind] = useState(''); const [category, setCategory] = useState(''); const [active, setActive] = useState(''); const [page, setPage] = useState(1);
  const dq = useDebounced(q);
  const items = useLoad(() => lib.items({ q: dq, kind, category, active, page, limit: 15 }), [dq, kind, category, active, page]);
  const cats = useLoad(() => lib.categories(), [items.data?.total]);
  const [edit, setEdit] = useState<LibItem | 'new' | null>(null);
  const [err, setErr] = useState('');
  const refresh = () => { items.reload(); onChange(); };
  const del = async (it: LibItem) => {
    if (!window.confirm(fr ? `Supprimer « ${it.title} » ?` : `Delete "${it.title}"?`)) return;
    try { await lib.delItem(it.id); refresh(); } catch (e) { setErr(msg(e)); }
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]"><Search size={15} className="absolute left-3 top-3 text-slate-400" /><input aria-label="Search catalogue" className={`${input} w-full pl-9`} placeholder={fr ? 'Titre, auteur, ISBN…' : 'Title, author, ISBN…'} value={q} onChange={e => { setQ(e.target.value); setPage(1); }} /></div>
        <select aria-label="Category" className={input} value={category} onChange={e => { setCategory(e.target.value); setPage(1); }}><option value="">{fr ? 'Catégories' : 'All categories'}</option>{(cats.data ?? []).map(c => <option key={c}>{c}</option>)}</select>
        <select aria-label="Kind" className={input} value={kind} onChange={e => { setKind(e.target.value); setPage(1); }}><option value="">{fr ? 'Tous types' : 'All kinds'}</option>{KINDS.map(k => <option key={k} value={k}>{kindLabel(k, fr)}</option>)}</select>
        <select aria-label="Status" className={input} value={active} onChange={e => { setActive(e.target.value); setPage(1); }}><option value="">{fr ? 'Actifs et inactifs' : 'Active & inactive'}</option><option value="true">{fr ? 'Actifs' : 'Active'}</option><option value="false">{fr ? 'Inactifs' : 'Inactive'}</option></select>
        <button className={btnPrimary} onClick={() => setEdit('new')}><Plus size={15} /> {fr ? 'Ajouter un ouvrage' : 'Add item'}</button>
      </div>
      <ErrorBox message={err || items.error} />
      {!items.data ? <Spinner /> : (
        <div>
          <Table head={[fr ? 'Titre' : 'Title', fr ? 'Auteur(s)' : 'Authors', 'ISBN', fr ? 'Type' : 'Kind', fr ? 'Catégorie' : 'Category', fr ? 'Exemplaires' : 'Copies', fr ? 'Disponibilité' : 'Availability', '']} min={900} empty={items.data.items.length ? undefined : (fr ? 'Aucun ouvrage.' : 'No items.')}>
            {items.data.items.map(it => (
              <tr key={it.id} className={it.is_active ? '' : 'opacity-60'}>
                <td className="px-4 py-3 font-medium">{it.title}</td><td className="px-4 py-3">{it.authors ?? '—'}</td><td className="px-4 py-3 text-xs">{it.isbn ?? '—'}</td>
                <td className="px-4 py-3">{kindLabel(it.kind, fr)}</td><td className="px-4 py-3">{it.category ?? '—'}</td><td className="px-4 py-3">{it.copies_total}</td>
                <td className="px-4 py-3"><AvailabilityBadge item={it} /></td>
                <td className="px-4 py-3 text-right whitespace-nowrap"><button className={`${btnGhost} inline-flex`} onClick={() => setEdit(it)}>{fr ? 'Modifier' : 'Edit'}</button> <button className="text-xs text-red-600 hover:underline ml-2" onClick={() => del(it)}>{fr ? 'Supprimer' : 'Delete'}</button></td>
              </tr>
            ))}
          </Table>
          <div className="bg-white rounded-b-xl border border-t-0 border-slate-200 -mt-1"><Pager page={page} limit={15} total={items.data.total} onPage={setPage} /></div>
        </div>
      )}
      {edit && <ItemModal item={edit === 'new' ? null : edit} onClose={() => setEdit(null)} onSaved={refresh} />}
    </div>
  );
}

// ── Loans & returns ───────────────────────────────────────────────────────────
function Loans({ cur, onChange }: { cur: string; onChange: () => void }) {
  const fr = useFr(); const { lang } = useLanguage();
  const [matricule, setMatricule] = useState(''); const [student, setStudent] = useState<StudentLookup | null>(null);
  const [iq, setIq] = useState(''); const dIq = useDebounced(iq); const [picked, setPicked] = useState<LibItem | null>(null);
  const found = useLoad(() => (dIq.length >= 2 ? lib.items({ q: dIq, limit: 6, active: 'true' }) : Promise.resolve(null)), [dIq]);
  const [status, setStatus] = useState('active'); const [q, setQ] = useState(''); const dq = useDebounced(q); const [page, setPage] = useState(1);
  const loans = useLoad(() => lib.loans({ status, q: dq, page, limit: 15 }), [status, dq, page]);
  const [err, setErr] = useState(''); const [ok, setOk] = useState(''); const [busy, setBusy] = useState('');
  const [lostFor, setLostFor] = useState<Loan | null>(null);

  const refresh = () => { loans.reload(); found.reload(); onChange(); };
  const lookup = async () => {
    setErr(''); setStudent(null);
    try { setStudent(await lib.lookup(matricule.trim())); } catch (e) { setErr(msg(e)); }
  };
  const issue = async () => {
    if (!picked || !student) return;
    setBusy('issue'); setErr(''); setOk('');
    try {
      const l = await lib.issue({ item_id: picked.id, matricule: student.matricule });
      setOk(`${fr ? 'Prêt enregistré' : 'Loan issued'}: “${l.title}” → ${l.student}, ${fr ? 'retour le' : 'due'} ${fmtDate(l.due_at, lang)}.`);
      setPicked(null); setIq(''); await lookup(); refresh();
    } catch (e) { setErr(msg(e)); } finally { setBusy(''); }
  };
  const run = async (id: string, fn: () => Promise<Loan>, done: string) => {
    setBusy(id); setErr(''); setOk('');
    try { const l = await fn(); setOk(done + (l.fine_amount > 0 ? ` ${fr ? 'Amende' : 'Fine'}: ${money(l.fine_amount, cur, lang)}.` : '')); refresh(); } catch (e) { setErr(msg(e)); } finally { setBusy(''); }
  };
  return (
    <div className="space-y-4">
      <section className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2"><BookOpen size={16} /> {fr ? 'Prêt rapide' : 'Quick issue'}</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Field label={fr ? 'Matricule de l’étudiant' : 'Student matricule'}>
              <div className="flex gap-2"><input className={`${input} flex-1 min-w-0`} value={matricule} onChange={e => { setMatricule(e.target.value); setStudent(null); }} onKeyDown={e => e.key === 'Enter' && matricule.trim() && lookup()} placeholder="U-0001" />
                <button className={btnGhost} disabled={!matricule.trim()} onClick={lookup}><UserCheck size={14} /> {fr ? 'Vérifier' : 'Check'}</button></div>
            </Field>
            {student && (
              <p className={`text-sm rounded-lg border px-3 py-2 ${student.blocked || !student.is_active ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
                <strong>{student.name}</strong> · {student.active_loans}/{student.max_loans} {fr ? 'prêts' : 'loans'}{student.unpaid_fines > 0 && ` · ${fr ? 'amendes' : 'fines'} ${money(student.unpaid_fines, student.currency, lang)}`}
                {student.blocked && ` — ${fr ? 'prêts bloqués' : 'loans blocked'}`}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Field label={fr ? 'Ouvrage' : 'Item'}>
              {picked ? <div className="flex items-center gap-2"><span className="text-sm font-medium flex-1 truncate">{picked.title}</span><button className="text-xs text-slate-500 hover:underline" onClick={() => setPicked(null)}>{fr ? 'Changer' : 'Change'}</button></div>
                : <input className={`${input} w-full`} placeholder={fr ? 'Titre ou ISBN…' : 'Title or ISBN…'} value={iq} onChange={e => setIq(e.target.value)} />}
            </Field>
            {!picked && found.data && found.data.items.length > 0 && (
              <ul className="border border-slate-200 rounded-lg divide-y divide-slate-100 text-sm">
                {found.data.items.map(it => <li key={it.id}><button className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2" onClick={() => setPicked(it)}><span className="flex-1 truncate">{it.title}</span><AvailabilityBadge item={it} /></button></li>)}
              </ul>
            )}
          </div>
        </div>
        <div className="flex justify-end"><button className={btnPrimary} disabled={!picked || !student || busy === 'issue'} onClick={issue}><CornerDownLeft size={14} /> {fr ? 'Enregistrer le prêt' : 'Issue loan'}</button></div>
      </section>
      <ErrorBox message={err || loans.error} />
      {ok && <p role="status" className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{ok}</p>}
      <div className="flex flex-wrap gap-2">
        <input aria-label="Search loans" className={`${input} flex-1 min-w-[200px]`} placeholder={fr ? 'Étudiant, matricule ou titre…' : 'Student, matricule or title…'} value={q} onChange={e => { setQ(e.target.value); setPage(1); }} />
        <select aria-label="Loan status" className={input} value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
          <option value="active">{fr ? 'En cours' : 'Active'}</option><option value="overdue">{fr ? 'En retard' : 'Overdue'}</option><option value="returned">{fr ? 'Rendus' : 'Returned'}</option><option value="lost">{fr ? 'Perdus' : 'Lost'}</option><option value="">{fr ? 'Tous' : 'All'}</option>
        </select>
      </div>
      {!loans.data ? <Spinner /> : (
        <div>
          <Table head={[fr ? 'Ouvrage' : 'Item', fr ? 'Étudiant' : 'Student', fr ? 'Emprunté' : 'Borrowed', fr ? 'Échéance' : 'Due', fr ? 'État' : 'Status', '']} min={820} empty={loans.data.items.length ? undefined : (fr ? 'Aucun prêt.' : 'No loans.')}>
            {loans.data.items.map(l => (
              <tr key={l.id}>
                <td className="px-4 py-3 font-medium">{l.title}</td><td className="px-4 py-3">{l.student}<span className="block text-xs text-slate-400">{l.matricule}</span></td>
                <td className="px-4 py-3">{fmtDate(l.borrowed_at, lang)}</td><td className="px-4 py-3">{fmtDate(l.due_at, lang)}</td>
                <td className="px-4 py-3">{l.status === 'active' ? (l.overdue_days > 0 ? <Badge tone="red">{l.overdue_days} {fr ? 'j de retard' : 'days late'}</Badge> : <Badge tone="green">{fr ? 'En cours' : 'Active'}</Badge>) : l.status === 'lost' ? <Badge tone="red">{fr ? 'Perdu' : 'Lost'}</Badge> : <Badge>{fr ? 'Rendu' : 'Returned'}</Badge>}{l.fine_open && <span className="ml-1"><Badge tone="amber">{money(l.fine_amount, cur, lang)}</Badge></span>}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {l.status === 'active' && <>
                    <button className={`${btnGhost} inline-flex`} disabled={busy === l.id} onClick={() => run(l.id, () => lib.returnLoan(l.id), fr ? 'Retour enregistré.' : 'Return recorded.')}>{fr ? 'Retour' : 'Return'}</button>{' '}
                    <button className={`${btnGhost} inline-flex`} disabled={busy === l.id} onClick={() => run(l.id, () => lib.renew(l.id), fr ? 'Prêt renouvelé.' : 'Loan renewed.')}><RefreshCw size={13} /> {fr ? 'Renouveler' : 'Renew'}</button>{' '}
                    <button className="text-xs text-red-600 hover:underline" onClick={() => setLostFor(l)}>{fr ? 'Perdu' : 'Lost'}</button></>}
                </td>
              </tr>
            ))}
          </Table>
          <div className="bg-white rounded-b-xl border border-t-0 border-slate-200 -mt-1"><Pager page={page} limit={15} total={loans.data.total} onPage={setPage} /></div>
        </div>
      )}
      {lostFor && <LostModal loan={lostFor} cur={cur} onClose={() => setLostFor(null)} onDone={(l) => { setLostFor(null); setOk(`${fr ? 'Déclaré perdu' : 'Marked lost'}. ${fr ? 'Amende' : 'Fine'}: ${money(l.fine_amount, cur, lang)}.`); refresh(); }} />}
    </div>
  );
}

function LostModal({ loan, cur, onClose, onDone }: { loan: Loan; cur: string; onClose: () => void; onDone: (l: Loan) => void }) {
  const fr = useFr();
  const [amount, setAmount] = useState(''); const [err, setErr] = useState('');
  return (
    <Modal title={fr ? 'Déclarer un ouvrage perdu' : 'Mark as lost'} onClose={onClose}>
      <p className="text-sm text-slate-600 mb-3">{loan.title} — {loan.student}</p>
      <Field label={`${fr ? 'Montant de remplacement' : 'Replacement fine'} (${cur})`} hint={fr ? 'Laissez vide pour ne facturer que le retard accumulé.' : 'Leave empty to charge only the accrued late fine.'}><input className={`${input} w-full`} type="number" min={0} value={amount} onChange={e => setAmount(e.target.value)} /></Field>
      <div className="mt-3"><ErrorBox message={err} /></div>
      <div className="flex justify-end gap-2 mt-4"><button className={btnGhost} onClick={onClose}>{fr ? 'Annuler' : 'Cancel'}</button>
        <button className={btnDanger} onClick={async () => { try { onDone(await lib.lost(loan.id, amount ? Number(amount) : undefined)); } catch (e) { setErr(msg(e)); } }}>{fr ? 'Confirmer' : 'Confirm'}</button></div>
    </Modal>
  );
}

// ── Reservations ──────────────────────────────────────────────────────────────
function Reservations({ onChange }: { onChange: () => void }) {
  const fr = useFr(); const { lang } = useLanguage();
  const res = useLoad(() => lib.reservations(), []);
  const [err, setErr] = useState('');
  return (
    <div className="space-y-3">
      <div className="flex justify-end"><button className={btnGhost} onClick={async () => { try { await lib.sweep(); res.reload(); onChange(); } catch (e) { setErr(msg(e)); } }}><RefreshCw size={13} /> {fr ? 'Expirer les réservations périmées' : 'Expire stale holds'}</button></div>
      <ErrorBox message={err || res.error} />
      {!res.data ? <Spinner /> : (
        <Table head={[fr ? 'Ouvrage' : 'Item', fr ? 'Étudiant' : 'Student', fr ? 'Statut' : 'Status', fr ? 'File' : 'Queue', fr ? 'Date' : 'Placed', '']} empty={res.data.length ? undefined : (fr ? 'Aucune réservation en cours.' : 'No open reservations.')}>
          {res.data.map(r => (
            <tr key={r.id}>
              <td className="px-4 py-3 font-medium">{r.title}</td><td className="px-4 py-3">{r.student}<span className="block text-xs text-slate-400">{r.matricule}</span></td>
              <td className="px-4 py-3">{r.status === 'ready' ? <Badge tone="green">{fr ? 'Prêt jusqu’au' : 'Ready until'} {fmtDate(r.expires_at, lang)}</Badge> : <Badge tone="amber">{fr ? 'En attente' : 'Waiting'}</Badge>}</td>
              <td className="px-4 py-3">{r.position ?? '—'}</td><td className="px-4 py-3">{fmtDate(r.created_at, lang)}</td>
              <td className="px-4 py-3 text-right"><button className="text-xs text-red-600 hover:underline" onClick={async () => { try { await lib.cancelReservation(r.id); res.reload(); onChange(); } catch (e) { setErr(msg(e)); } }}>{fr ? 'Annuler' : 'Cancel'}</button></td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}

// ── Fines ─────────────────────────────────────────────────────────────────────
function Fines({ onChange }: { onChange: () => void }) {
  const fr = useFr(); const { lang } = useLanguage();
  const [status, setStatus] = useState('unpaid');
  const fines = useLoad(() => lib.fines(status), [status]);
  const [waive, setWaive] = useState<Loan | null>(null); const [reason, setReason] = useState(''); const [err, setErr] = useState('');
  const refresh = () => { fines.reload(); onChange(); };
  const cur = fines.data?.currency ?? '';
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <select aria-label="Fine status" className={input} value={status} onChange={e => setStatus(e.target.value)}><option value="unpaid">{fr ? 'À payer' : 'Unpaid'}</option><option value="paid">{fr ? 'Payées' : 'Paid'}</option><option value="waived">{fr ? 'Annulées' : 'Waived'}</option><option value="all">{fr ? 'Toutes' : 'All'}</option></select>
        {fines.data && <span className="text-sm text-slate-600">{fines.data.total} · <strong>{money(fines.data.amount, cur, lang)}</strong></span>}
      </div>
      <ErrorBox message={err || fines.error} />
      {!fines.data ? <Spinner /> : (
        <Table head={[fr ? 'Étudiant' : 'Student', fr ? 'Ouvrage' : 'Item', fr ? 'Montant' : 'Amount', fr ? 'État' : 'Status', '']} empty={fines.data.items.length ? undefined : (fr ? 'Aucune amende.' : 'No fines.')}>
          {fines.data.items.map(l => (
            <tr key={l.id}>
              <td className="px-4 py-3">{l.student}<span className="block text-xs text-slate-400">{l.matricule}</span></td><td className="px-4 py-3">{l.title}</td><td className="px-4 py-3 font-medium">{money(l.fine_amount, cur, lang)}</td>
              <td className="px-4 py-3">{l.fine_paid ? <Badge tone="green">{fr ? 'Payée' : 'Paid'}</Badge> : l.fine_waived ? <Badge tone="blue">{fr ? 'Annulée' : 'Waived'}</Badge> : <Badge tone="red">{fr ? 'À payer' : 'Unpaid'}</Badge>}</td>
              <td className="px-4 py-3 text-right whitespace-nowrap">{l.fine_open && <>
                <button className={`${btnPrimary} inline-flex`} onClick={async () => { try { await lib.payFine(l.id); refresh(); } catch (e) { setErr(msg(e)); } }}>{fr ? 'Marquer payée' : 'Mark paid'}</button>{' '}
                <button className={`${btnGhost} inline-flex`} onClick={() => { setWaive(l); setReason(''); }}>{fr ? 'Annuler l’amende' : 'Waive'}</button></>}</td>
            </tr>
          ))}
        </Table>
      )}
      {waive && (
        <Modal title={fr ? 'Annuler une amende' : 'Waive fine'} onClose={() => setWaive(null)}>
          <p className="text-sm text-slate-600 mb-3">{waive.student} — {waive.title} — {money(waive.fine_amount, cur, lang)}</p>
          <Field label={fr ? 'Motif (obligatoire, journalisé)' : 'Reason (required, audited)'}><textarea className={`${input} w-full`} rows={3} value={reason} onChange={e => setReason(e.target.value)} /></Field>
          <div className="flex justify-end gap-2 mt-4"><button className={btnGhost} onClick={() => setWaive(null)}>{fr ? 'Annuler' : 'Cancel'}</button>
            <button className={btnPrimary} disabled={reason.trim().length < 3} onClick={async () => { try { await lib.waiveFine(waive.id, reason.trim()); setWaive(null); refresh(); } catch (e) { setErr(msg(e)); setWaive(null); } }}>{fr ? 'Confirmer' : 'Confirm'}</button></div>
        </Modal>
      )}
    </div>
  );
}

// ── Overdue ───────────────────────────────────────────────────────────────────
function Overdue({ onChange }: { onChange: () => void }) {
  const fr = useFr(); const { lang } = useLanguage();
  const od = useLoad(() => lib.overdue(), []);
  const [err, setErr] = useState('');
  const cur = od.data?.currency ?? '';
  return (
    <div className="space-y-3">
      {od.data && <p className="text-sm text-slate-600">{od.data.total} {fr ? 'prêts en retard' : 'overdue loans'} · {fr ? 'amendes accumulées' : 'accrued fines'} <strong>{money(od.data.accrued_total, cur, lang)}</strong></p>}
      <ErrorBox message={err || od.error} />
      {!od.data ? <Spinner /> : (
        <Table head={[fr ? 'Étudiant' : 'Student', fr ? 'Ouvrage' : 'Item', fr ? 'Échéance' : 'Due', fr ? 'Retard' : 'Late', fr ? 'Amende accumulée' : 'Accrued fine', '']} empty={od.data.items.length ? undefined : (fr ? 'Aucun retard.' : 'Nothing overdue.')}>
          {od.data.items.map(l => (
            <tr key={l.id}>
              <td className="px-4 py-3">{l.student}<span className="block text-xs text-slate-400">{l.matricule}</span></td><td className="px-4 py-3">{l.title}</td><td className="px-4 py-3">{fmtDate(l.due_at, lang)}</td>
              <td className="px-4 py-3"><Badge tone="red">{l.overdue_days} {fr ? 'jours' : 'days'}</Badge></td><td className="px-4 py-3 font-medium">{money(l.accrued_fine, cur, lang)}</td>
              <td className="px-4 py-3 text-right"><button className={`${btnGhost} inline-flex`} onClick={async () => { try { await lib.returnLoan(l.id); od.reload(); onChange(); } catch (e) { setErr(msg(e)); } }}>{fr ? 'Enregistrer le retour' : 'Record return'}</button></td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}

// ── Settings ──────────────────────────────────────────────────────────────────
function SettingsTab({ onSaved }: { onSaved: () => void }) {
  const fr = useFr();
  const s = useLoad(() => lib.settings(), []);
  const [f, setF] = useState<Record<string, string | boolean> | null>(null);
  const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const cur = f ?? (s.data ? { loan_days: String(s.data.loan_days), max_loans: String(s.data.max_loans), max_renewals: String(s.data.max_renewals), fine_per_day: String(s.data.fine_per_day), currency: s.data.currency, block_on_fines: s.data.block_on_fines } : null);
  if (!cur) return <Spinner />;
  const set = (k: string, v: string | boolean) => setF({ ...cur, [k]: v });
  const save = async () => {
    setErr(''); setOk('');
    try { await lib.saveSettings({ loan_days: Number(cur.loan_days), max_loans: Number(cur.max_loans), max_renewals: Number(cur.max_renewals), fine_per_day: Number(cur.fine_per_day), currency: String(cur.currency), block_on_fines: !!cur.block_on_fines }); setOk(fr ? 'Paramètres enregistrés.' : 'Settings saved.'); setF(null); s.reload(); onSaved(); } catch (e) { setErr(msg(e)); }
  };
  return (
    <section className="bg-white rounded-xl border border-slate-200 p-5 max-w-2xl space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label={fr ? 'Durée du prêt (jours)' : 'Loan period (days)'}><input className={`${input} w-full`} type="number" min={1} value={String(cur.loan_days)} onChange={e => set('loan_days', e.target.value)} /></Field>
        <Field label={fr ? 'Prêts simultanés max.' : 'Max concurrent loans'}><input className={`${input} w-full`} type="number" min={0} value={String(cur.max_loans)} onChange={e => set('max_loans', e.target.value)} /></Field>
        <Field label={fr ? 'Renouvellements max.' : 'Max renewals'}><input className={`${input} w-full`} type="number" min={0} value={String(cur.max_renewals)} onChange={e => set('max_renewals', e.target.value)} /></Field>
        <Field label={fr ? 'Amende par jour de retard' : 'Fine per day late'}><input className={`${input} w-full`} type="number" min={0} value={String(cur.fine_per_day)} onChange={e => set('fine_per_day', e.target.value)} /></Field>
        <Field label={fr ? 'Devise' : 'Currency'}><input className={`${input} w-full`} value={String(cur.currency)} onChange={e => set('currency', e.target.value)} /></Field>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!cur.block_on_fines} onChange={e => set('block_on_fines', e.target.checked)} /> {fr ? 'Bloquer les nouveaux prêts tant que des amendes sont impayées' : 'Block new loans while fines are unpaid'}</label>
      <ErrorBox message={err} />{ok && <p role="status" className="text-sm text-emerald-700">{ok}</p>}
      <div className="flex justify-end"><button className={btnPrimary} onClick={save}>{fr ? 'Enregistrer' : 'Save'}</button></div>
    </section>
  );
}
