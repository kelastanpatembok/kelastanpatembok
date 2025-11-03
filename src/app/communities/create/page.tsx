"use client";

import { RoleGate } from "@/components/role-gate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function CreateCommunityPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  function handleCreate() {
    alert(`Mock create community: ${name}`);
    setName("");
    setDescription("");
  }

  return (
    <RoleGate allow={["owner"]} fallback={<div className="text-sm text-muted-foreground">Owner access required to create communities.</div>}>
      <Card>
        <CardHeader>
          <CardTitle>Create Community</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Community name" value={name} onChange={(e) => setName(e.target.value)} />
          <Textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="flex justify-end">
            <Button onClick={handleCreate} disabled={!name.trim()}>Create</Button>
          </div>
        </CardContent>
      </Card>
    </RoleGate>
  );
}


