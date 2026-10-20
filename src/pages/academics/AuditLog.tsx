import { useState } from 'react';
import { acad } from '../../api/academics';
import { ErrorBox, PageHeader, Pager, Spinner, Table, fmtDateTime, input, useDebounced, useFr, useLoad } from '../../composants/academics/ui';
import { useLanguage } from '../../i18n/LanguageContext';

export default function AuditLog() {
  const { lang } = useLanguage(); const fr = lang === 'fr';
  const [page, setPage] = useState(1); const [action, setAction] = useState(''); const da = useDebounced(action);
  const list = useLoad(() => acad.audit({ page, limit: 25, action: da || undefined }), [page, da]);
  useFr();
  return (
    <div className="space-y-5">
      <PageHeader title={fr ? 'Journal d’audit académique' : 'Academic audit trail'} subtitle={fr ? 'Qui a fait quoi : inscriptions, notes, barèmes, examens, documents…' : 'Who did what: registrations, marks, grading, exams, documents…'} onRefresh={() => void list.reload()}>
        <input aria-label="Filter action" className={`${input} w-56`} placeholder={fr ? 'Filtrer (ex. registration)' : 'Filter (e.g. registration)'} value={action} onChange={e => { setAction(e.target.value); setPage(1); }} />
      </PageHeader>
      <ErrorBox message={list.error} />
      {!list.data ? <Spinner /> : (
        <div className="bg-white rounded-xl border border-slate-200">
          <Table min={760} head={['Date', fr ? 'Auteur' : 'Actor', 'Action', fr ? 'Cible' : 'Target', fr ? 'Motif' : 'Reason']} empty={list.data.items.length ? undefined : '—'}>
            {list.data.items.map(a => <tr key={a.id}><td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{fmtDateTime(a.created_at, lang)}</td><td className="px-4 py-2.5">{a.actor_name ?? '—'}<p className="text-xs text-slate-400">{a.actor_role}</p></td><td className="px-4 py-2.5 font-mono text-xs">{a.action}</td><td className="px-4 py-2.5 text-xs text-slate-500">{a.target_type}</td><td className="px-4 py-2.5 text-slate-600 max-w-xs">{a.reason ?? '—'}</td></tr>)}
          </Table>
          <Pager page={page} limit={25} total={list.data.total} onPage={setPage} />
        </div>
      )}
    </div>
  );
}
