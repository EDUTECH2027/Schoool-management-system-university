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

export const academicPageList = [AcademicStructure, CourseCatalogue, CourseOfferings, RegistrationAdmin, ResultsValidation, Exams, Progression, Documents, StudentFile, AcademicSettings, AuditLog];

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
  ];
}

