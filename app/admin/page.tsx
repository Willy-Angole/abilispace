import { AdminDashboard } from '@/components/admin-dashboard';

export const metadata = {
  title: 'Admin',
  description: 'Abilispace platform administration',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminDashboard />;
}
