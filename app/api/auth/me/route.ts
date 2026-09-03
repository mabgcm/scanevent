import { getAdminUser } from '@/lib/auth';

export async function GET() {
  const user = await getAdminUser();
  if (!user) return Response.json({ user: null }, { status: 401 });
  return Response.json({ user: { uid: user.uid, email: user.email } });
}
