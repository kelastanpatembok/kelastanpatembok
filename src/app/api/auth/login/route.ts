import { NextRequest } from "next/server";
import users from "@/data/users.json";
import { writeSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const body = await req.json();
  let user = null as any;
  if (body.userId) {
    user = users.find((u) => u.id === body.userId);
  } else if (body.username && body.password) {
    user = users.find((u) => u.username === body.username && u.password === body.password);
  }
  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }
  await writeSession({ userId: user.id, role: user.role as any });
  return Response.json({ ok: true, user: { id: user.id, name: user.name, role: user.role, avatarUrl: user.avatarUrl } });
}


