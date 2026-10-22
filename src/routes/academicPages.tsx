import { Route } from 'react-router-dom';
import { lazyPage } from './lazyPage';
const AcademicStructure = lazyPage(() => import('../pages/academics/AcademicStructure'));
const CourseCatalogue   = lazyPage(() => import('../pages/academics/CourseCatalogue'));
const CourseOfferings   = lazyPage(() => import('../pages/academics/CourseOfferings'));
const RegistrationAdmin = lazyPage(() => import('../pages/academics/RegistrationAdmin'));
const ResultsValidation = lazyPage(() => import('../pages/academics/ResultsValidation'));
const Exams             = lazyPage(() => import('../pages/academics/Exams'));
const Progression       = lazyPage(() => import('../pages/academics/Progression'));
const Documents         = lazyPage(() => import('../pages/academics/Documents'));
const StudentFile       = lazyPage(() => import('../pages/academics/StudentFile'));
const AcademicSettings  = lazyPage(() => import('../pages/academics/AcademicSettings'));
const AuditLog          = lazyPage(() => import('../pages/academics/AuditLog'));
const ServiceDesk       = lazyPage(() => import('../pages/academics/ServiceDesk'));
const LibraryAdmin      = lazyPage(() => import('../pages/academics/LibraryAdmin'));
const RoomsAdmin        = lazyPage(() => import('../pages/academics/RoomsAdmin'));
const TimetableEngine   = lazyPage(() => import('../pages/academics/TimetableEngine'));
const CareersAdmin      = lazyPage(() => import('../pages/academics/CareersAdmin'));
const ThesisAdmin       = lazyPage(() => import('../pages/academics/ThesisAdmin'));
const Analytics         = lazyPage(() => import('../pages/academics/Analytics'));
const Broadcasts        = lazyPage(() => import('../pages/academics/Broadcasts'));
const SecurityCenter    = lazyPage(() => import('../pages/academics/SecurityCenter'));
const NotificationCenter = lazyPage(() => import('../pages/shared/NotificationCenter'));

export const academicPageList = [AcademicStructure, CourseCatalogue, CourseOfferings, RegistrationAdmin, ResultsValidation, Exams, Progression, Documents, StudentFile, AcademicSettings, AuditLog, ServiceDesk, LibraryAdmin, RoomsAdmin, TimetableEngine, CareersAdmin, ThesisAdmin, Analytics, Broadcasts, SecurityCenter, NotificationCenter];

/** The academic-affairs pages, shared by the academic_officer's own tree and the administrator's layout. */
export function academicRoutes() {
  return [
    <Route key="structure" path="academics/structure" element={<AcademicStructure />} />,
    <Route key="catalogue" path="academics/catalogue" element={<CourseCatalogue />} />,
    <Route key="offerings" path="academics/offerings" element={<CourseOfferings />} />,
    <Route key="registration" path="academics/registration" element={<RegistrationAdmin />} />,
    <Route key="results" path="academics/results" element={<ResultsValidation />} />,
    <Route key="exams" path="academics/exams" element={<Exams />} />,
    <Route key="progression" path="academics/progression" element={<Progression />} />,
    <Route key="documents" path="academics/documents" element={<Documents />} />,
    <Route key="student-file" path="academics/student-file" element={<StudentFile />} />,
    <Route key="settings" path="academics/settings" element={<AcademicSettings />} />,
    <Route key="audit" path="academics/audit" element={<AuditLog />} />,
    <Route key="services" path="academics/services" element={<ServiceDesk />} />,
    <Route key="library" path="academics/library" element={<LibraryAdmin />} />,
    <Route key="rooms" path="academics/rooms" element={<RoomsAdmin />} />,
    <Route key="timetable" path="academics/timetable" element={<TimetableEngine />} />,
    <Route key="careers" path="academics/careers" element={<CareersAdmin />} />,
    <Route key="thesis" path="academics/thesis" element={<ThesisAdmin />} />,
    <Route key="analytics" path="academics/analytics" element={<Analytics />} />,
    <Route key="broadcasts" path="academics/broadcasts" element={<Broadcasts />} />,
    <Route key="security" path="academics/security" element={<SecurityCenter />} />,
    <Route key="notifications" path="academics/notifications" element={<NotificationCenter />} />,
  ];
}

