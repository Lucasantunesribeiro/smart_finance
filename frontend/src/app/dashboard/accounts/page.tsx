import { AuthGuard } from '@/components/auth/AuthGuard';
import { AccountsPage } from '@/components/dashboard/pages/AccountsPage';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';

export default function Accounts() {
  return (
    <AuthGuard>
      <DashboardLayout>
        <AccountsPage />
      </DashboardLayout>
    </AuthGuard>
  );
}