import { Routes, Route, Navigate } from 'react-router-dom';
import { lazyPage, prefetchWhenIdle } from './lazyPage';
import PlatformLayout        from '../composants/layout/PlatformLayout';
const PlatformDashboard = lazyPage(() => import('../pages/platform/PlatformDashboard'));
const Schools = lazyPage(() => import('../pages/platform/Schools'));
const SchoolDetail = lazyPage(() => import('../pages/platform/SchoolDetail'));
const PlatformUsers = lazyPage(() => import('../pages/platform/PlatformUsers'));
const Subscriptions = lazyPage(() => import('../pages/platform/Subscriptions'));
const Reports = lazyPage(() => import('../pages/platform/Reports'));
const SystemLogs = lazyPage(() => import('../pages/platform/SystemLogs'));
const PlansBilling = lazyPage(() => import('../pages/platform/PlansBilling'));
const Features = lazyPage(() => import('../pages/platform/Features'));
const PlatformAnnouncements = lazyPage(() => import('../pages/platform/PlatformAnnouncements'));
const RolesPermissions = lazyPage(() => import('../pages/platform/RolesPermissions'));
const PlatformSettings = lazyPage(() => import('../pages/platform/PlatformSettings'));
const BackupRestore = lazyPage(() => import('../pages/platform/BackupRestore'));

// Start the landing page's chunk immediately (in parallel with the layout), warm the rest when idle.
void PlatformDashboard.preload();
prefetchWhenIdle([Schools, SchoolDetail, PlatformUsers, Subscriptions, Reports, SystemLogs, PlansBilling, Features, PlatformAnnouncements, RolesPermissions, PlatformSettings, BackupRestore]);

export default function PlatformRoutes() {
  return (
    <Routes>
      <Route path="/platform" element={<PlatformLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"          element={<PlatformDashboard />} />
        <Route path="schools"            element={<Schools />} />
        <Route path="schools/:id"        element={<SchoolDetail />} />
        <Route path="users"              element={<PlatformUsers />} />
        <Route path="subscriptions"      element={<Subscriptions />} />
        <Route path="reports"            element={<Reports />} />
        <Route path="system-logs"        element={<SystemLogs />} />
        <Route path="plans-billing"      element={<PlansBilling />} />
        <Route path="features"           element={<Features />} />
        <Route path="announcements"      element={<PlatformAnnouncements />} />
        <Route path="roles-permissions"  element={<RolesPermissions />} />
        <Route path="settings"           element={<PlatformSettings />} />
        <Route path="backup-restore"     element={<BackupRestore />} />
      </Route>
      <Route path="*" element={<Navigate to="/platform/dashboard" replace />} />
    </Routes>
  );
}
