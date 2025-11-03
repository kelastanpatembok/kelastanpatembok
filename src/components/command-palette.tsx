"use client";

import * as React from "react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useRouter } from "next/navigation";
import users from "@/data/users.json";
import { useAuth } from "@/components/auth-provider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const { user, loginAs, logout } = useAuth();

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function go(path: string) {
    setOpen(false);
    router.push(path);
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            aria-label="Open command palette"
            onClick={() => setOpen(true)}
            className="inline-flex h-9 items-center justify-center rounded-md px-2 text-sm hover:bg-accent"
          >
            {/* simple magnifier icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Search and actions (Ctrl/Cmd+K)</p>
        </TooltipContent>
      </Tooltip>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search or jump to..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigate">
            <CommandItem onSelect={() => go("/")}>Home</CommandItem>
            <CommandItem onSelect={() => go("/success-stories")}>Success Stories</CommandItem>
            <CommandItem onSelect={() => go("/courses")}>Courses</CommandItem>
            <CommandItem onSelect={() => go("/communities")}>Communities</CommandItem>
            <CommandItem onSelect={() => go("/profile")}>Profile</CommandItem>
          </CommandGroup>
          <CommandGroup heading={user ? `Logged in as ${user.name} (${user.role})` : "Login as"}>
            {users.map((u) => (
              <CommandItem key={u.id} onSelect={async () => { await loginAs(u.id); }}>
                {u.name} — {u.role}
              </CommandItem>
            ))}
            {user && (
              <CommandItem onSelect={async () => { await logout(); router.push("/"); }}>Logout</CommandItem>
            )}
          </CommandGroup>
          <CommandGroup heading="Actions">
            <CommandItem onSelect={() => alert("Create post (mock)")}>Create post</CommandItem>
            {user?.role === "owner" && (
              <CommandItem onSelect={() => go("/communities/create")}>Create community</CommandItem>
            )}
            {user?.role === "mentor" && (
              <CommandItem onSelect={() => go("/review")}>Open review queue</CommandItem>
            )}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </TooltipProvider>
  );
}


