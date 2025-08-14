import { AuthGuard } from '@/components/auth/AuthGuard';
import { CategoriesPage } from '@/components/dashboard/pages/CategoriesPage';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';

export default function Categories() {
  return (
    <AuthGuard>
      <DashboardLayout>
        <CategoriesPage />
      </DashboardLayout>
    </AuthGuard>
  );
}