import { useState } from 'react';
import { Eye } from 'lucide-react';
import { acad, type OfficialDoc } from '../../api/academics';
import DocumentSheet, { docTitle } from '../../composants/academics/DocumentSheet';
import ProfileCard from '../../composants/academics/ProfileCard';
import { ErrorBox, PageHeader, Spinner, StatusBadge, Table, btnGhost, fmtDate, msg, useLoad } from '../../composants/academics/ui';
import { useLanguage } from '../../i18n/LanguageContext';

/** The student's academic file and the official documents the registry has issued to them. */
export default function StudentDocuments() {
  const { lang } = useLanguage(); const fr = lang === 'fr';
  const docs = useLoad(acad.myDocs);
  const prof = useLoad(acad.myProfile);
  const [view, setView] = useState<OfficialDoc | null>(null); const [err, setErr] = useState('');
  const open = async (d: OfficialDoc) => { try { setView(await acad.doc(d.id)); } catch (e) { setErr(msg(e)); } };
  return (
    <div className="space-y-6">
      <PageHeader title={fr ? 'Mon dossier académique' : 'My academic file'} subtitle={fr ? 'Votre parcours et vos documents officiels' : 'Your journey and your official documents'} />
      <ErrorBox message={err || prof.error || docs.error} />
      {prof.data ? <ProfileCard p={prof.data} /> : <Spinner />}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">{fr ? 'Documents officiels' : 'Official documents'}</h2>
        {!docs.data ? <Spinner /> : (
          <Table head={['Document', 'Code', fr ? 'Émis le' : 'Issued', fr ? 'Statut' : 'Status', '']} empty={docs.data.length ? undefined : (fr ? 'Aucun document émis. Demandez-le à la scolarité.' : 'No documents issued yet. Ask the registry.')}>
            {docs.data.map(d => <tr key={d.id}><td className="px-4 py-3 font-medium text-slate-800">{docTitle(d.type, fr)}</td><td className="px-4 py-3 font-mono text-xs">{d.code}</td><td className="px-4 py-3 text-slate-500">{fmtDate(d.issued_at, lang)}</td><td className="px-4 py-3"><StatusBadge status={d.status} /></td><td className="px-4 py-3 text-right"><button className={btnGhost} onClick={() => void open(d)}><Eye size={14} /> {fr ? 'Voir / imprimer' : 'View / print'}</button></td></tr>)}
          </Table>
        )}
      </section>
      {view && <DocumentSheet doc={view} onClose={() => setView(null)} />}
    </div>
  );
}
