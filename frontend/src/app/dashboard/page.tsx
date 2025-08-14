import { ModernDashboard } from '@/components/dashboard/ModernDashboard';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardLayout>
        <ModernDashboard />
      </DashboardLayout>
    </AuthGuard>
  );
}