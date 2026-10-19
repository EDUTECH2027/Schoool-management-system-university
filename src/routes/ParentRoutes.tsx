import { Routes, Route, Navigate } from 'react-router-dom';
import { lazyPage, prefetchWhenIdle } from './lazyPage';
import ParentLayout          from '../composants/layout/ParentLayout';
const ParentDashboard = lazyPage(() => import('../pages/parent/ParentDashboard'));
const ParentProfile = lazyPage(() => import('../pages/parent/ParentProfile'));
const ParentChildren = lazyPage(() => import('../pages/parent/ParentChildren'));
const ParentChildMarks = lazyPage(() => import('../pages/parent/ParentChildMarks'));
const ParentChildAttendance = lazyPage(() => import('../pages/parent/ParentChildAttendance'));
const ParentChildFees = lazyPage(() => import('../pages/parent/ParentChildFees'));

// Start the landing page's chunk immediately (in parallel with the layout), warm the rest when idle.
void ParentDashboard.preload();
prefetchWhenIdle([ParentProfile, ParentChildren, ParentChildMarks, ParentChildAttendance, ParentChildFees]);

export default function ParentRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/parent/dashboard" replace />} />
      <Route path="/parent" element={<ParentLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"                              element={<ParentDashboard       />} />
        <Route path="profile"                                element={<ParentProfile         />} />
        <Route path="children"                               element={<ParentChildren        />} />
        <Route path="children/:studentId/marks"              element={<ParentChildMarks      />} />
        <Route path="children/:studentId/attendance"         element={<ParentChildAttendance />} />
        <Route path="children/:studentId/fees"               element={<ParentChildFees       />} />
      </Route>
      <Route path="*" element={<Navigate to="/parent/dashboard" replace />} />
    </Routes>
  );
}
