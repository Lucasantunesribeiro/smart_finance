import { AuthGuard } from '@/components/auth/AuthGuard';
import { TransactionsPage } from '@/components/dashboard/pages/TransactionsPage';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';

export default function Transactions() {
  return (
    <AuthGuard>
      <DashboardLayout>
        <TransactionsPage />
      </DashboardLayout>
    </AuthGuard>
  );
}