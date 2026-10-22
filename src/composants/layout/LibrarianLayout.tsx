import PortalLayout from './PortalLayout';
import LibrarianSidebar from './LibrarianSidebar';

export default function LibrarianLayout() {
  return <PortalLayout sidebar={<LibrarianSidebar />} />;
}
