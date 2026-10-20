import { Routes, Route, Navigate } from 'react-router-dom';
import { lazyPage, prefetchWhenIdle } from './lazyPage';
import TeacherLayout      from '../composants/layout/TeacherLayout';
const TeacherDashboard = lazyPage(() => import('../pages/teacher/TeacherDashboard'));
const TeacherProfile = lazyPage(() => import('../pages/teacher/TeacherProfile'));
const TeacherMyClass = lazyPage(() => import('../pages/teacher/TeacherMyClass'));
const TeacherMarks = lazyPage(() => import('../pages/teacher/TeacherMarks'));
const TeacherAttendance = lazyPage(() => import('../pages/teacher/TeacherAttendance'));
const TeacherMyAttendance = lazyPage(() => import('../pages/teacher/TeacherMyAttendance'));
const TeacherTimetable = lazyPage(() => import('../pages/teacher/TeacherTimetable'));
const TeacherBehavior = lazyPage(() => import('../pages/teacher/TeacherBehavior'));
const TeacherSalary = lazyPage(() => import('../pages/teacher/TeacherSalary'));
const TeacherELearning = lazyPage(() => import('../pages/teacher/TeacherELearning'));
const TeacherCourses = lazyPage(() => import('../pages/teacher/TeacherCourses'));
const TeacherExams = lazyPage(() => import('../pages/teacher/TeacherExams'));
const Classroom = lazyPage(() => import('../pages/elearning/Classroom'));

// Start the landing page's chunk immediately (in parallel with the layout), warm the rest when idle.
void TeacherDashboard.preload();
prefetchWhenIdle([TeacherProfile, TeacherMyClass, TeacherMarks, TeacherAttendance, TeacherMyAttendance, TeacherTimetable, TeacherBehavior, TeacherSalary, TeacherELearning, Classroom, TeacherCourses, TeacherExams]);

export default function TeacherRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/teacher/dashboard" replace />} />
      <Route path="/teacher" element={<TeacherLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"     element={<TeacherDashboard   />} />
        <Route path="profile"       element={<TeacherProfile     />} />
        <Route path="my-class"      element={<TeacherMyClass     />} />
        <Route path="marks"         element={<TeacherMarks       />} />
        <Route path="attendance"    element={<TeacherAttendance  />} />
        <Route path="my-attendance" element={<TeacherMyAttendance />} />
        <Route path="timetable"     element={<TeacherTimetable   />} />
        <Route path="behavior"      element={<TeacherBehavior    />} />
        <Route path="salary"        element={<TeacherSalary      />} />
        <Route path="courses"          element={<TeacherCourses />} />
        <Route path="exams"            element={<TeacherExams />} />
        <Route path="e-learning"       element={<TeacherELearning />} />
        <Route path="e-learning/room/:id" element={<Classroom />} />
      </Route>
      <Route path="*" element={<Navigate to="/teacher/dashboard" replace />} />
    </Routes>
  );
}
