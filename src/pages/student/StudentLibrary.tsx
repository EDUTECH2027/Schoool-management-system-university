import { useState } from 'react';
import { BookMarked, Clock, Coins, RefreshCw, Search } from 'lucide-react';
import { lib, type LibItem } from '../../api/library';
import { Badge, ErrorBox, PageHeader, Pager, Spinner, Stat, Table, Tabs, btnGhost, btnPrimary, fmtDate, input, msg, useDebounced, useFr, useLoad } from '../../composants/academics/ui';
import { AvailabilityBadge, DigitalLink, KINDS, kindLabel, money } from '../../composants/library/parts';
import { useLanguage } from '../../i18n/LanguageContext';

type Tab = 'catalogue' | 'loans' | 'reservations' | 'fines';

export default function StudentLibrary() {
  const fr = useFr(); const { lang } = useLanguage();
  const [tab, setTab] = useState<Tab>('catalogue');
  const [q, setQ] = useState(''); const [category, setCategory] = useState(''); const [kind, setKind] = useState(''); const [avail, setAvail] = useState(false); const [page, setPage] = useState(1);
  const dq = useDebounced(q);
  const items = useLoad(() => lib.items({ q: dq, category, kind, available: avail, page, limit: 12 }), [dq, category, kind, avail, page]);
  const cats = useLoad(() => lib.categories(), []);
  const me = useLoad(() => lib.me(), []);
  const [busy, setBusy] = useState(''); const [err, setErr] = useState(''); const [ok, setOk] = useState('');

  const act = async (id: string, fn: () => Promise<unknown>, done: string) => {
    setBusy(id); setErr(''); setOk('');
    try { await fn(); setOk(done); items.reload(); me.reload(); } catch (e) { setErr(msg(e)); } finally { setBusy(''); }
  };
  const reserve = (it: LibItem) => act(it.id, () => lib.reserve(it.id), fr ? 'Réservation enregistrée.' : 'Reservation placed.');
  const m = me.data;
  const cur = m?.settings.currency ?? '';

  return (
    <div className="space-y-5">
      <PageHeader title={fr ? 'Bibliothèque' : 'Library'} subtitle={fr ? 'Cherchez un ouvrage, réservez-le et suivez vos emprunts.' : 'Search the catalogue, reserve items and follow your loans.'} onRefresh={() => { items.reload(); me.reload(); }} />
      <ErrorBox message={err || items.error || me.error} />
      {ok && <p role="status" className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{ok}</p>}
      {m && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label={fr ? 'Emprunts en cours' : 'Active loans'} value={`${m.loans.length} / ${m.settings.max_loans}`} />
          <Stat label={fr ? 'Réservations' : 'Reservations'} value={String(m.reservations.length)} sub={m.reservations.some(r => r.status === 'ready') ? (fr ? 'Un ouvrage est prêt' : 'One item is ready') : undefined} tone={m.reservations.some(r => r.status === 'ready') ? 'good' : undefined} />
          <Stat label={fr ? 'Amendes à payer' : 'Fines due'} value={money(m.fines_unpaid, cur, lang)} tone={m.fines_unpaid > 0 ? 'bad' : undefined} sub={m.settings.block_on_fines && m.fines_unpaid > 0 ? (fr ? 'Nouveaux prêts bloqués' : 'New loans blocked') : undefined} />
          <Stat label={fr ? 'Durée de prêt' : 'Loan period'} value={`${m.settings.loan_days} ${fr ? 'jours' : 'days'}`} sub={`${m.settings.fine_per_day} ${cur}/${fr ? 'jour de retard' : 'day late'}`} />
        </div>
      )}
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[
        { id: 'catalogue', label: fr ? 'Catalogue' : 'Catalogue' }, { id: 'loans', label: fr ? 'Mes emprunts' : 'My loans', badge: m?.loans.filter(l => l.overdue_days > 0).length },
        { id: 'reservations', label: fr ? 'Mes réservations' : 'My reservations' }, { id: 'fines', label: fr ? 'Mes amendes' : 'My fines' },
      ]} />

      {tab === 'catalogue' && (
        <>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px]"><Search size={15} className="absolute left-3 top-3 text-slate-400" /><input aria-label={fr ? 'Rechercher' : 'Search'} className={`${input} w-full pl-9`} placeholder={fr ? 'Titre, auteur ou ISBN…' : 'Title, author or ISBN…'} value={q} onChange={e => { setQ(e.target.value); setPage(1); }} /></div>
            <select aria-label="Category" className={input} value={category} onChange={e => { setCategory(e.target.value); setPage(1); }}><option value="">{fr ? 'Toutes catégories' : 'All categories'}</option>{(cats.data ?? []).map(c => <option key={c}>{c}</option>)}</select>
            <select aria-label="Kind" className={input} value={kind} onChange={e => { setKind(e.target.value); setPage(1); }}><option value="">{fr ? 'Tous types' : 'All types'}</option>{KINDS.map(k => <option key={k} value={k}>{kindLabel(k, fr)}</option>)}</select>
            <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={avail} onChange={e => { setAvail(e.target.checked); setPage(1); }} /> {fr ? 'Disponibles seulement' : 'Available only'}</label>
          </div>
          {!items.data ? <Spinner /> : (
            <div className="space-y-2">
              {items.data.items.map(it => (
                <article key={it.id} className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3 items-start">
                  <div className="flex-1 min-w-[220px]">
                    <h3 className="font-semibold text-slate-800">{it.title}</h3>
                    <p className="text-sm text-slate-500">{[it.authors, it.publisher, it.year].filter(Boolean).join(' · ')}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2"><Badge tone="indigo">{kindLabel(it.kind, fr)}</Badge>{it.category && <Badge>{it.category}</Badge>}<AvailabilityBadge item={it} />{it.location && <span className="text-xs text-slate-400 self-center">{fr ? 'Rayon' : 'Shelf'} {it.location}</span>}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {it.kind === 'digital' ? <DigitalLink url={it.digital_url} />
                      : it.my_loan ? <Badge tone="blue">{fr ? 'Emprunté, retour le' : 'On loan, due'} {fmtDate(it.my_loan.due_at, lang)}</Badge>
                      : it.my_reservation ? <Badge tone={it.my_reservation.status === 'ready' ? 'green' : 'amber'}>{it.my_reservation.status === 'ready' ? (fr ? 'Prêt : passez au guichet' : 'Ready: collect at the desk') : (fr ? 'Réservé' : 'Reserved')}</Badge>
                      : it.available > 0 ? <span className="text-xs text-slate-500">{fr ? 'Disponible au guichet' : 'Available at the desk'}</span>
                      : <button className={btnPrimary} disabled={busy === it.id} onClick={() => reserve(it)}><BookMarked size={14} /> {fr ? 'Réserver' : 'Reserve'}</button>}
                  </div>
                </article>
              ))}
              {!items.data.items.length && <p className="px-4 py-10 text-center text-slate-400 text-sm bg-white rounded-xl border border-slate-200">{fr ? 'Aucun ouvrage trouvé.' : 'No items found.'}</p>}
              <div className="bg-white rounded-xl border border-slate-200"><Pager page={page} limit={12} total={items.data.total} onPage={setPage} /></div>
            </div>
          )}
        </>
      )}

      {tab === 'loans' && (!m ? <Spinner /> : (
        <div className="space-y-4">
          <Table head={[fr ? 'Ouvrage' : 'Item', fr ? 'Emprunté le' : 'Borrowed', fr ? 'À rendre le' : 'Due', fr ? 'Reste' : 'Left', fr ? 'Renouv.' : 'Renewals', '']} empty={m.loans.length ? undefined : (fr ? 'Aucun emprunt en cours.' : 'No active loans.')}>
            {m.loans.map(l => (
              <tr key={l.id}>
                <td className="px-4 py-3 font-medium">{l.title}</td><td className="px-4 py-3">{fmtDate(l.borrowed_at, lang)}</td><td className="px-4 py-3">{fmtDate(l.due_at, lang)}</td>
                <td className="px-4 py-3">{l.overdue_days > 0 ? <Badge tone="red">{l.overdue_days} {fr ? 'j de retard' : 'days late'} · {money(l.accrued_fine, cur, lang)}</Badge> : <Badge tone={(l.days_left ?? 0) <= 3 ? 'amber' : 'green'}>{l.days_left} {fr ? 'jours' : 'days'}</Badge>}</td>
                <td className="px-4 py-3">{l.renewals} / {m.settings.max_renewals}</td>
                <td className="px-4 py-3 text-right"><button className={btnGhost} disabled={busy === l.id} onClick={() => act(l.id, () => lib.renew(l.id), fr ? 'Prêt renouvelé.' : 'Loan renewed.')}><RefreshCw size={13} /> {fr ? 'Renouveler' : 'Renew'}</button></td>
              </tr>
            ))}
          </Table>
          {m.history.length > 0 && (<><h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">{fr ? 'Historique' : 'History'}</h2>
            <Table head={[fr ? 'Ouvrage' : 'Item', fr ? 'Emprunté le' : 'Borrowed', fr ? 'Rendu le' : 'Returned', fr ? 'État' : 'Status']}>
              {m.history.map(l => <tr key={l.id}><td className="px-4 py-3">{l.title}</td><td className="px-4 py-3">{fmtDate(l.borrowed_at, lang)}</td><td className="px-4 py-3">{fmtDate(l.returned_at, lang)}</td><td className="px-4 py-3"><Badge tone={l.status === 'lost' ? 'red' : 'slate'}>{l.status === 'lost' ? (fr ? 'Perdu' : 'Lost') : (fr ? 'Rendu' : 'Returned')}</Badge></td></tr>)}
            </Table></>)}
        </div>
      ))}

      {tab === 'reservations' && (!m ? <Spinner /> : (
        <Table head={[fr ? 'Ouvrage' : 'Item', fr ? 'Statut' : 'Status', fr ? 'Position' : 'Position', fr ? 'Date' : 'Placed', '']} empty={m.reservations.length ? undefined : (fr ? 'Aucune réservation.' : 'No reservations.')}>
          {m.reservations.map(r => (
            <tr key={r.id}>
              <td className="px-4 py-3 font-medium">{r.title}</td>
              <td className="px-4 py-3">{r.status === 'ready' ? <Badge tone="green"><Clock size={11} className="inline mr-1" />{fr ? 'Prêt jusqu’au' : 'Ready until'} {fmtDate(r.expires_at, lang)}</Badge> : <Badge tone="amber">{fr ? 'En attente' : 'Waiting'}</Badge>}</td>
              <td className="px-4 py-3">{r.position ?? '—'}</td><td className="px-4 py-3">{fmtDate(r.created_at, lang)}</td>
              <td className="px-4 py-3 text-right"><button className={btnGhost} disabled={busy === r.id} onClick={() => act(r.id, () => lib.cancelReservation(r.id), fr ? 'Réservation annulée.' : 'Reservation cancelled.')}>{fr ? 'Annuler' : 'Cancel'}</button></td>
            </tr>
          ))}
        </Table>
      ))}

      {tab === 'fines' && (!m ? <Spinner /> : (
        <div className="space-y-3">
          <p className="text-sm text-slate-600 flex items-center gap-2"><Coins size={15} /> {fr ? 'À payer' : 'Due'}: <strong>{money(m.fines_unpaid, cur, lang)}</strong>{m.loans.some(l => l.accrued_fine > 0) && <span className="text-amber-600">({fr ? 'les retards en cours s’ajoutent au retour' : 'late loans in progress will add to this when returned'})</span>}</p>
          <Table head={[fr ? 'Ouvrage' : 'Item', fr ? 'Montant' : 'Amount', fr ? 'État' : 'Status']} empty={m.fines.length ? undefined : (fr ? 'Aucune amende.' : 'No fines.')}>
            {m.fines.map(l => <tr key={l.id}><td className="px-4 py-3">{l.title}</td><td className="px-4 py-3">{money(l.fine_amount, cur, lang)}</td><td className="px-4 py-3">{l.fine_paid ? <Badge tone="green">{fr ? 'Payée' : 'Paid'}</Badge> : l.fine_waived ? <Badge tone="blue">{fr ? 'Annulée' : 'Waived'}</Badge> : <Badge tone="red">{fr ? 'À payer' : 'Due'}</Badge>}</td></tr>)}
          </Table>
          <p className="text-xs text-slate-400">{fr ? 'Les amendes se règlent au guichet de la bibliothèque.' : 'Fines are settled at the library desk.'}</p>
        </div>
      ))}
    </div>
  );
}
