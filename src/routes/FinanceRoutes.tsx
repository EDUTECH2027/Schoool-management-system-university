import { Routes, Route, Navigate } from 'react-router-dom';
import { lazyPage, prefetchWhenIdle } from './lazyPage';
import FinanceLayout from '../composants/layout/FinanceLayout';
const FinanceDashboard      = lazyPage(() => import('../pages/finance/FinanceDashboard'));
const FinanceTransactions   = lazyPage(() => import('../pages/finance/FinanceTransactions'));
const FinanceReconciliation = lazyPage(() => import('../pages/finance/FinanceReconciliation'));
const FinanceReports        = lazyPage(() => import('../pages/finance/FinanceReports'));

// finance_officer sessions get ONLY the finance tree.
// Start the landing page's chunk immediately (in parallel with the layout), warm the rest when idle.
void FinanceDashboard.preload();
prefetchWhenIdle([FinanceTransactions, FinanceReconciliation, FinanceReports]);

export default function FinanceRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/finance" replace />} />
      <Route path="/finance" element={<FinanceLayout />}>
        <Route index element={<FinanceDashboard />} />
        <Route path="transactions"   element={<FinanceTransactions />} />
        <Route path="reconciliation" element={<FinanceReconciliation />} />
        <Route path="reports"        element={<FinanceReports />} />
      </Route>
      <Route path="*" element={<Navigate to="/finance" replace />} />
    </Routes>
  );
}
