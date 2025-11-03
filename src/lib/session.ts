import { cookies } from "next/headers";

export type Session = {
  userId: string;
  role: "owner" | "member" | "visitor" | "mentor";
};

const SESSION_COOKIE = "rwid_session";

export function getSessionCookieName() {
  return SESSION_COOKIE;
}

export async function readSession(): Promise<Session | null> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(SESSION_COOKIE)?.value;
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export async function writeSession(session: Session) {
  const store = await cookies();
  store.set({
    name: SESSION_COOKIE,
    value: JSON.stringify(session),
    httpOnly: false,
    sameSite: "lax",
    path: "/",
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}


