import { Routes, Route, Navigate } from 'react-router-dom';
import { lazyPage, prefetchWhenIdle } from './lazyPage';
import StudentLayout     from '../composants/layout/StudentLayout';
const StudentDashboard = lazyPage(() => import('../pages/student/StudentDashboard'));
const StudentProfile = lazyPage(() => import('../pages/student/StudentProfile'));
const StudentMarks = lazyPage(() => import('../pages/student/StudentMarks'));
const StudentAttendance = lazyPage(() => import('../pages/student/StudentAttendance'));
const StudentTimetable = lazyPage(() => import('../pages/student/StudentTimetable'));
const StudentFees = lazyPage(() => import('../pages/student/StudentFees'));
const StudentELearning = lazyPage(() => import('../pages/student/StudentELearning'));
const Classroom = lazyPage(() => import('../pages/elearning/Classroom'));

// Start the landing page's chunk immediately (in parallel with the layout), warm the rest when idle.
void StudentDashboard.preload();
prefetchWhenIdle([StudentProfile, StudentMarks, StudentAttendance, StudentTimetable, StudentFees, StudentELearning, Classroom]);

export default function StudentRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/student/dashboard" replace />} />
      <Route path="/student" element={<StudentLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"  element={<StudentDashboard  />} />
        <Route path="profile"    element={<StudentProfile    />} />
        <Route path="marks"      element={<StudentMarks      />} />
        <Route path="attendance" element={<StudentAttendance />} />
        <Route path="timetable"  element={<StudentTimetable  />} />
        <Route path="fees"       element={<StudentFees       />} />
        <Route path="e-learning"  element={<StudentELearning />} />
        <Route path="e-learning/room/:id" element={<Classroom />} />
      </Route>
      <Route path="*" element={<Navigate to="/student/dashboard" replace />} />
    </Routes>
  );
}
