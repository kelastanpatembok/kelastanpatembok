"use client";

import { RoleGate } from "@/components/role-gate";
import initialQueue from "@/data/review-queue.json";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTimeUTC } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";

export default function ReviewQueuePage() {
  const [items, setItems] = useState(initialQueue.map((q) => ({ ...q })) as any[]);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((i) => i.status === filter);
  }, [items, filter]);

  function updateStatus(id: string, status: "approved" | "rejected") {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
  }

  return (
    <RoleGate allow={["mentor"]} fallback={<div className="text-sm text-muted-foreground">Mentor access required to view the review queue.</div>}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Review Queue</h1>
          <div className="flex gap-2">
            <Button size="sm" variant={filter === "pending" ? "default" : "outline"} onClick={() => setFilter("pending")}>Pending</Button>
            <Button size="sm" variant={filter === "approved" ? "default" : "outline"} onClick={() => setFilter("approved")}>Approved</Button>
            <Button size="sm" variant={filter === "rejected" ? "default" : "outline"} onClick={() => setFilter("rejected")}>Rejected</Button>
            <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>All</Button>
          </div>
        </div>

        {filtered.map((item) => (
          <Card key={item.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{item.title}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{item.type}</Badge>
                  <Badge variant={item.priority === "high" ? "destructive" : "outline"}>{item.priority}</Badge>
                  <Badge variant={item.status === "pending" ? "secondary" : item.status === "approved" ? "outline" : "destructive"}>{item.status}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">{item.communityName} • By {item.authorName}</div>
              <p className="mt-2 text-sm leading-6">{item.excerpt}</p>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>Submitted {formatDateTimeUTC(item.submittedAt)}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => updateStatus(item.id, "rejected")}>Reject</Button>
                  <Button size="sm" onClick={() => updateStatus(item.id, "approved")}>Approve</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="text-sm text-muted-foreground">No items in this view.</div>
        )}
      </div>
    </RoleGate>
  );
}


