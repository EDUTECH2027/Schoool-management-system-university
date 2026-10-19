import PortalLayout from './PortalLayout';
import FinanceSidebar from './FinanceSidebar';

export default function FinanceLayout() {
  return <PortalLayout sidebar={<FinanceSidebar />} />;
}
