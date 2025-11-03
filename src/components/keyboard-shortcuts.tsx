"use client";

import { useState } from "react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";

const shortcuts = [
  { keys: ["Ctrl", "K"], description: "Open command palette" },
  { keys: ["Ctrl", "Enter"], description: "Submit post" },
  { keys: ["/"], description: "Focus search" },
];

export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);

  // Removed "?" shortcut to allow typing question marks in editors
  // useEffect(() => {
  //   const down = (e: KeyboardEvent) => {
  //     if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
  //       e.preventDefault();
  //       setOpen((open) => !open);
  //     }
  //   };
  //   document.addEventListener("keydown", down);
  //   return () => document.removeEventListener("keydown", down);
  // }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search shortcuts..." />
      <CommandList>
        <CommandEmpty>No shortcuts found.</CommandEmpty>
        <CommandGroup heading="Keyboard Shortcuts">
          {shortcuts.map((shortcut, i) => (
            <CommandItem key={i}>
              <div className="flex w-full items-center justify-between">
                <span>{shortcut.description}</span>
                <div className="flex gap-1">
                  {shortcut.keys.map((key, j) => (
                    <Badge key={j} variant="outline" className="font-mono text-xs">
                      {key}
                    </Badge>
                  ))}
                </div>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
