import { AuthGuard } from '@/components/auth/AuthGuard';
import { AnalyticsPage } from '@/components/dashboard/pages/AnalyticsPage';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';

export default function Analytics() {
  return (
    <AuthGuard>
      <DashboardLayout>
        <AnalyticsPage />
      </DashboardLayout>
    </AuthGuard>
  );
}