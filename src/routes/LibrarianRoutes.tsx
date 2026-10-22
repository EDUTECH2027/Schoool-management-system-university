import { Routes, Route, Navigate } from 'react-router-dom';
import { lazyPage } from './lazyPage';
import LibrarianLayout from '../composants/layout/LibrarianLayout';

const LibraryAdmin = lazyPage(() => import('../pages/academics/LibraryAdmin'));
const NotificationCenter = lazyPage(() => import('../pages/shared/NotificationCenter'));

// librarian sessions get ONLY the library tree (the notification centre is their inbox).
export default function LibrarianRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/library" replace />} />
      <Route element={<LibrarianLayout />}>
        <Route path="library" element={<LibraryAdmin />} />
        <Route path="library/notifications" element={<NotificationCenter />} />
      </Route>
      <Route path="*" element={<Navigate to="/library" replace />} />
    </Routes>
  );
}
