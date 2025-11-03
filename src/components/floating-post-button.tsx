"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-provider";
import { FeedComposer } from "@/components/feed-composer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface FloatingPostButtonProps {
  onAddPost: (content: string) => void;
}

export function FloatingPostButton({ onAddPost }: FloatingPostButtonProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  if (user?.role !== "owner") {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span className="sr-only">Create post</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a new post</DialogTitle>
        </DialogHeader>
        <FeedComposer 
          onAddPost={(content) => {
            onAddPost(content);
            setOpen(false);
          }} 
        />
      </DialogContent>
    </Dialog>
  );
}
