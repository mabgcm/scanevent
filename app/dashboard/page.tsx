import { redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/auth';
import DashboardClient from './dashboard-client';
import './dashboard.css';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await getAdminUser();
  if (!user) redirect('/dashboard/login');
  return <DashboardClient email={user.email || ''} />;
}
