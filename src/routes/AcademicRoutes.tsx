import { Routes, Route, Navigate } from 'react-router-dom';
import { prefetchWhenIdle } from './lazyPage';
import AcademicLayout from '../composants/layout/AcademicLayout';
import { academicPageList, academicRoutes } from './academicPages';

// Start the landing page's chunk immediately, warm the rest when idle.
void academicPageList[3].preload();
prefetchWhenIdle(academicPageList.filter((_, i) => i !== 3));

// academic_officer sessions get ONLY the academic tree.
export default function AcademicRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/academics/registration" replace />} />
      <Route element={<AcademicLayout />}>{academicRoutes()}</Route>
      <Route path="*" element={<Navigate to="/academics/registration" replace />} />
    </Routes>
  );
}
