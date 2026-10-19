import { Routes, Route, Navigate } from 'react-router-dom';
import { lazyPage, prefetchWhenIdle } from './lazyPage';
import Layout          from '../composants/layout/Layout';
const Dashboard = lazyPage(() => import('../pages/Dashboard'));
const Students = lazyPage(() => import('../pages/Students'));
const Classes = lazyPage(() => import('../pages/Classes'));
const Teachers = lazyPage(() => import('../pages/Teachers'));
const Attendance = lazyPage(() => import('../pages/Attendance'));
const Assessments = lazyPage(() => import('../pages/Assessments'));
const Transcripts = lazyPage(() => import('../pages/Transcripts'));
const Fees = lazyPage(() => import('../pages/Fees'));
const Timetable = lazyPage(() => import('../pages/Timetable'));
const Parents = lazyPage(() => import('../pages/Parents'));
const Settings = lazyPage(() => import('../pages/Settings'));
const Announcements = lazyPage(() => import('../pages/Announcements'));
const EmailAlerts = lazyPage(() => import('../pages/EmailAlerts'));
const DiscussionForums = lazyPage(() => import('../pages/DiscussionForums'));
const TeacherPayment = lazyPage(() => import('../pages/TeacherPayment'));
const Certificates = lazyPage(() => import('../pages/Certificates'));
const UserManagement = lazyPage(() => import('../pages/admin/UserManagement'));
const AdminWithdrawals = lazyPage(() => import('../pages/admin/AdminWithdrawals'));
const FinanceDashboard      = lazyPage(() => import('../pages/finance/FinanceDashboard'));
const FinanceTransactions   = lazyPage(() => import('../pages/finance/FinanceTransactions'));
const FinanceReconciliation = lazyPage(() => import('../pages/finance/FinanceReconciliation'));
const FinanceReports        = lazyPage(() => import('../pages/finance/FinanceReports'));
const AdminELearning = lazyPage(() => import('../pages/admin/AdminELearning'));

// Start the landing page's chunk immediately (in parallel with the layout), warm the rest when idle.
void Dashboard.preload();
prefetchWhenIdle([Students, Classes, Teachers, Attendance, Assessments, Fees, Parents, Settings, Announcements, EmailAlerts, DiscussionForums, UserManagement, AdminWithdrawals, FinanceDashboard, FinanceTransactions, FinanceReconciliation, FinanceReports, AdminELearning]);

export default function AdminRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"         element={<Dashboard        />} />
        <Route path="students"          element={<Students         />} />
        <Route path="classes"           element={<Classes          />} />
        <Route path="teachers"          element={<Teachers         />} />
        <Route path="attendance"        element={<Attendance       />} />
        <Route path="assessments"       element={<Assessments      />} />
        <Route path="transcripts"       element={<Transcripts      />} />
        <Route path="certificates"      element={<Certificates     />} />
        <Route path="fees"              element={<Fees             />} />
        <Route path="timetable"         element={<Timetable        />} />
        <Route path="parents"           element={<Parents          />} />
        <Route path="settings"          element={<Settings         />} />
        <Route path="announcements"     element={<Announcements    />} />
        <Route path="email-alerts"      element={<EmailAlerts      />} />
        <Route path="discussion-forums" element={<DiscussionForums />} />
        <Route path="teacher-payment"   element={<TeacherPayment  />} />
        <Route path="user-management"   element={<UserManagement  />} />
        <Route path="withdrawals"       element={<AdminWithdrawals />} />
        <Route path="e-learning"        element={<AdminELearning />} />
        <Route path="finance"                element={<FinanceDashboard />} />
        <Route path="finance/transactions"   element={<FinanceTransactions />} />
        <Route path="finance/reconciliation" element={<FinanceReconciliation />} />
        <Route path="finance/reports"        element={<FinanceReports />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
