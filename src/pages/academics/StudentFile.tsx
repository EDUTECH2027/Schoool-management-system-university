import { useState } from 'react';
import { acad, type Profile } from '../../api/academics';
import ProfileCard from '../../composants/academics/ProfileCard';
import { ErrorBox, PageHeader, Spinner, input, msg, useDebounced, useFr, useLoad } from '../../composants/academics/ui';
import { useAuth } from '../../context/AuthContext';

/** Administrator / academic-officer view of one student's whole academic file. Finance totals are only returned to administrators. */
export default function StudentFile() {
  const fr = useFr(); useAuth();
  const [q, setQ] = useState(''); const dq = useDebounced(q);
  const found = useLoad(() => (dq.length >= 2 ? acad.students(dq) : Promise.resolve([])), [dq]);
  const [p, setP] = useState<Profile | null>(null); const [err, setErr] = useState(''); const [loading, setLoading] = useState(false);
  const open = async (id: string) => { setLoading(true); setErr(''); try { setP(await acad.profileOf(id)); } catch (e) { setErr(msg(e)); } finally { setLoading(false); } };
  return (
    <div className="space-y-5">
      <PageHeader title={fr ? 'Dossier étudiant' : 'Student file'} subtitle={fr ? 'Parcours, inscriptions, résultats, assiduité et historique' : 'Journey, registrations, results, attendance and history'} />
      <input aria-label="Search student" className={`${input} w-full max-w-md`} placeholder={fr ? 'Nom ou matricule…' : 'Name or matricule…'} value={q} onChange={e => setQ(e.target.value)} />
      {found.data && found.data.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 max-w-md max-h-56 overflow-y-auto">{found.data.slice(0, 20).map(s => <button key={s.id} className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50" onClick={() => void open(s.id)}>{s.first_name} {s.last_name} <span className="text-xs text-slate-400 ml-1">{s.student_number}</span></button>)}</div>
      )}
      <ErrorBox message={err} />
      {loading ? <Spinner /> : p && <ProfileCard p={p} />}
    </div>
  );
}
