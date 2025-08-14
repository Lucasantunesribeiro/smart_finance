import { AuthGuard } from '@/components/auth/AuthGuard';
import { BudgetPage } from '@/components/dashboard/pages/BudgetPage';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';

export default function Budgets() {
  return (
    <AuthGuard>
      <DashboardLayout>
        <BudgetPage />
      </DashboardLayout>
    </AuthGuard>
  );
}