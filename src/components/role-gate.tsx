"use client";

import { ReactNode } from "react";
import { useAuth } from "@/components/auth-provider";

type Role = "owner" | "member" | "visitor" | "mentor";

export function RoleGate({ allow, children, fallback }: { allow: Role[]; children: ReactNode; fallback?: ReactNode }) {
  const { user, loading } = useAuth();
  const role: Role = user?.role ?? "visitor";

  if (loading) return null;
  if (allow.includes(role)) return <>{children}</>;
  return <>{fallback ?? <div className="text-sm text-muted-foreground">You don’t have access to this action.</div>}</>;
}


