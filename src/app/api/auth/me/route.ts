import users from "@/data/users.json";
import { readSession } from "@/lib/session";

export async function GET() {
  const session = await readSession();
  if (!session) return Response.json({ user: null });
  const user = users.find((u) => u.id === session.userId);
  if (!user) return Response.json({ user: null });
  return Response.json({ user: { id: user.id, name: user.name, role: user.role, avatarUrl: user.avatarUrl } });
}


