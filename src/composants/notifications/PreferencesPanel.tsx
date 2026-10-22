import { useState } from 'react';
import { Lock, MailWarning } from 'lucide-react';
import { notif } from '../../api/notifications';
import { ErrorBox, Spinner, msg, useFr, useLoad } from '../academics/ui';

export function EmailNotConfigured() {
  const fr = useFr();
  return (
    <p role="note" data-testid="email-not-configured" className="flex items-start gap-2 text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2">
      <MailWarning size={16} className="mt-0.5 shrink-0" />
      <span>{fr ? 'L’envoi d’e-mails n’est pas configuré sur ce serveur : aucun e-mail ne sera envoyé, seules les notifications dans l’application fonctionnent.' : 'E-mail delivery is not configured on this server: no e-mail will be sent, only in-app notifications work.'}</span>
    </p>
  );
}

function Toggle({ label, checked, onChange, disabled, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; hint?: string }) {
  return (
    <label className={`flex items-center gap-3 text-sm ${disabled ? 'opacity-60' : ''}`}>
      <input type="checkbox" role="switch" className="h-4 w-4 accent-indigo-600" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} />
      <span className="text-slate-800">{label}{hint && <span className="block text-xs text-slate-400">{hint}</span>}</span>
    </label>
  );
}

export default function PreferencesPanel() {
  const fr = useFr();
  const p = useLoad(() => notif.prefs(), []);
  const [err, setErr] = useState(''); const [saved, setSaved] = useState(false);
  const d = p.data;
  const save = async (patch: Parameters<typeof notif.savePrefs>[0]) => {
    setErr(''); setSaved(false);
    try { p.setData(await notif.savePrefs(patch).then(r => ({ ...r, types: d?.types }))); setSaved(true); } catch (e) { setErr(msg(e)); }
  };
  if (!d) return p.error ? <ErrorBox message={p.error} /> : <Spinner />;
  const muted = new Set(d.muted_types);
  const flip = (t: string, on: boolean) => { const s = new Set(muted); if (on) s.delete(t); else s.add(t); void save({ muted_types: [...s] }); };
  return (
    <div className="space-y-4" data-testid="prefs">
      {!d.email_configured && <EmailNotConfigured />}
      <div className="space-y-3">
        <Toggle label={fr ? 'Notifications dans l’application' : 'In-app notifications'} checked={d.in_app} onChange={v => save({ in_app: v })} hint={fr ? 'Les alertes de sécurité et les annonces obligatoires sont toujours reçues.' : 'Security alerts and must-read announcements are always delivered.'} />
        <Toggle label={fr ? 'Recevoir aussi par e-mail' : 'Also receive by e-mail'} checked={d.email} onChange={v => save({ email: v })} hint={d.email_configured ? undefined : (fr ? 'Inactif tant que l’e-mail n’est pas configuré.' : 'Has no effect until e-mail is configured.')} />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">{fr ? 'Catégories' : 'Categories'}</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {(d.types ?? []).map(t => (
            <Toggle key={t.type} label={fr ? t.label_fr : t.label_en} checked={t.critical || !muted.has(t.type)} disabled={t.critical} onChange={v => flip(t.type, v)}
              hint={t.critical ? (fr ? 'Toujours activé' : 'Always on') : t.email ? (fr ? 'Peut aussi être envoyé par e-mail' : 'May also be sent by e-mail') : undefined} />
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-400 flex items-center gap-1"><Lock size={11} /> {fr ? 'Les catégories verrouillées ne peuvent pas être désactivées.' : 'Locked categories cannot be turned off.'}</p>
      </div>
      <ErrorBox message={err} />
      {saved && !err && <p role="status" className="text-xs text-emerald-700">{fr ? 'Préférences enregistrées.' : 'Preferences saved.'}</p>}
    </div>
  );
}
