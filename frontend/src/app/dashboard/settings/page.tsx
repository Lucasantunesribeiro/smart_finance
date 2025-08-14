import { AuthGuard } from '@/components/auth/AuthGuard';
import { SettingsPage } from '@/components/dashboard/pages/SettingsPage';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';

export default function Settings() {
  return (
    <AuthGuard>
      <DashboardLayout>
        <SettingsPage />
      </DashboardLayout>
    </AuthGuard>
  );
}