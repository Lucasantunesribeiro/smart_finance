import { AuthGuard } from '@/components/auth/AuthGuard';
import { ReportsPage } from '@/components/dashboard/pages/ReportsPage';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';

export default function Reports() {
  return (
    <AuthGuard>
      <DashboardLayout>
        <ReportsPage />
      </DashboardLayout>
    </AuthGuard>
  );
}