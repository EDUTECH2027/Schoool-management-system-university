import { NavLink } from 'react-router-dom';
import { Layers, BookOpen, LifeBuoy, Library, DoorOpen, CalendarDays, Briefcase, BookMarked, BarChart3, Megaphone, ShieldCheck, Bell, CalendarCheck, ClipboardSignature, FileCheck2, Settings2, CalendarClock, TrendingUp, FileBadge, UserSearch, ScrollText, GraduationCap, LogOut } from 'lucide-react';
import { clsx } from 'clsx';
import { useLanguage } from '../../i18n/LanguageContext';
import { useBranding } from '../../context/BrandingContext';
import { useAuth } from '../../context/AuthContext';

const ACCENT = 'bg-indigo-600';

export const academicNav = (fr: boolean) => [
  { label: fr ? 'Structure' : 'Structure',                    to: '/academics/structure',     icon: Layers },
  { label: fr ? 'Catalogue des cours' : 'Course catalogue',   to: '/academics/catalogue',     icon: BookOpen },
  { label: fr ? 'Cours ouverts' : 'Course offerings',         to: '/academics/offerings',     icon: CalendarCheck },
  { label: fr ? 'Inscriptions' : 'Registration',              to: '/academics/registration',  icon: ClipboardSignature },
  { label: fr ? 'Validation des notes' : 'Results validation', to: '/academics/results',      icon: FileCheck2 },
  { label: fr ? 'Examens' : 'Exams',                          to: '/academics/exams',         icon: CalendarClock },
  { label: fr ? 'Passage & diplômes' : 'Progression',         to: '/academics/progression',   icon: TrendingUp },
  { label: fr ? 'Documents officiels' : 'Official documents', to: '/academics/documents',    icon: FileBadge },
  { label: fr ? 'Dossier étudiant' : 'Student file',          to: '/academics/student-file',  icon: UserSearch },
  { label: fr ? 'Règles académiques' : 'Academic rules',      to: '/academics/settings',      icon: Settings2 },
  { label: fr ? 'Journal d’audit' : 'Audit trail',            to: '/academics/audit',         icon: ScrollText },
  { label: fr ? 'Guichet des demandes' : 'Service desk',      to: '/academics/services',      icon: LifeBuoy },
  { label: fr ? 'Bibliothèque' : 'Library',                   to: '/academics/library',       icon: Library },
  { label: fr ? 'Salles' : 'Rooms',                           to: '/academics/rooms',         icon: DoorOpen },
  { label: fr ? 'Emploi du temps' : 'Timetable',              to: '/academics/timetable',     icon: CalendarDays },
  { label: fr ? 'Carrières & alumni' : 'Careers & alumni',    to: '/academics/careers',       icon: Briefcase },
  { label: fr ? 'Mémoires & thèses' : 'Thesis',               to: '/academics/thesis',        icon: BookMarked },
  { label: fr ? 'Statistiques' : 'Analytics',                 to: '/academics/analytics',     icon: BarChart3 },
  { label: fr ? 'Messages & annonces' : 'Broadcasts',         to: '/academics/broadcasts',    icon: Megaphone },
  { label: fr ? 'Notifications' : 'Notifications',           to: '/academics/notifications', icon: Bell },
  { label: fr ? 'Sécurité' : 'Security',                      to: '/academics/security',      icon: ShieldCheck },
];

export default function AcademicSidebar() {
  const { lang } = useLanguage();
  const { logoUrl, schoolName, schoolSub } = useBranding();
  const { logout } = useAuth();
  const fr = lang === 'fr';
  return (
    <aside className="w-[86vw] max-w-72 bg-slate-900 flex flex-col h-screen shrink-0 lg:w-64">
      <div className="px-6 py-5 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
            {logoUrl ? <img src={logoUrl} alt="logo" className="w-full h-full object-contain p-0.5" /> : <GraduationCap size={20} className="text-white" />}
          </div>
          <div className="min-w-0"><p className="text-white font-semibold text-sm leading-tight truncate">{schoolName}</p><p className="text-slate-400 text-xs truncate">{schoolSub}</p></div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-widest px-3 mb-2">{fr ? 'Affaires académiques' : 'Academic affairs'}</p>
        {academicNav(fr).map(({ label, to, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => clsx('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors', isActive ? `${ACCENT} text-white` : 'text-slate-400 hover:bg-slate-800 hover:text-white')}>
            <Icon size={17} />{label}
          </NavLink>
        ))}
      </nav>
      <div className="px-3 py-4 border-t border-slate-700">
        <button type="button" onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-red-950/40 hover:text-red-400 transition-colors"><LogOut size={17} />{fr ? 'Se déconnecter' : 'Sign out'}</button>
      </div>
    </aside>
  );
}
