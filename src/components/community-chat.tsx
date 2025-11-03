"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/components/auth-provider";
import { auth, db } from "@/lib/firebase";
import { collection, doc, addDoc, serverTimestamp, onSnapshot, query, orderBy, limit, setDoc, updateDoc, getDoc } from "firebase/firestore";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Send, Users } from "lucide-react";
import { formatRelativeTime } from "@/lib/format";
import { toast } from "sonner";

type CommunityChatProps = {
  platformId: string;
  communityId: string;
  hasAccess: boolean;
};

interface Message {
  id: string;
  content: string;
  createdBy: string;
  authorName: string;
  authorAvatar?: string;
  createdAt: any;
  editedAt?: any;
}

interface TypingUser {
  userId: string;
  userName: string;
  lastTypingAt: any;
}

export function CommunityChat({ platformId, communityId, hasAccess }: CommunityChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageValue, setMessageValue] = useState("");
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages]);

  // Set up real-time listener for messages
  useEffect(() => {
    if (!hasAccess) {
      setLoading(false);
      return;
    }

    const messagesRef = collection(db, "platforms", platformId, "communities", communityId, "messages");
    
    // Listen to last 100 messages, newest first
    const q = query(
      messagesRef,
      orderBy("createdAt", "desc"),
      limit(100)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const newMessages = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .reverse() as Message[]; // Reverse to show oldest first
        
        setMessages(newMessages);
        setLoading(false);
      },
      (error) => {
        console.error("Error listening to messages:", error);
        toast.error("Failed to load messages");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [platformId, communityId, hasAccess]);

  // Set up typing indicators listener
  useEffect(() => {
    if (!hasAccess || !auth.currentUser) return;

    const typingRef = collection(db, "platforms", platformId, "communities", communityId, "typing");
    
    const unsubscribe = onSnapshot(
      typingRef,
      (snapshot) => {
        const now = new Date();
        const typing: TypingUser[] = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const userId = docSnap.id;
          
          // Only show typing if it's not the current user and was recent (last 5 seconds)
          if (userId !== auth.currentUser?.uid && data.lastTypingAt) {
            const lastTyping = data.lastTypingAt.toDate();
            const secondsSinceTyping = (now.getTime() - lastTyping.getTime()) / 1000;
            
            if (secondsSinceTyping < 5) {
              typing.push({
                userId,
                userName: data.userName || "Someone",
                lastTypingAt: data.lastTypingAt,
              });
            }
          }
        });

        setTypingUsers(typing);
      },
      (error) => {
        console.error("Error listening to typing indicators:", error);
      }
    );

    return () => unsubscribe();
  }, [platformId, communityId, hasAccess]);

  // Clean up typing indicator when unmounting
  useEffect(() => {
    return () => {
      if (auth.currentUser && isTyping) {
        removeTypingIndicator();
      }
    };
  }, []);

  const updateTypingIndicator = async () => {
    if (!auth.currentUser || !hasAccess) return;

    try {
      const typingRef = doc(db, "platforms", platformId, "communities", communityId, "typing", auth.currentUser.uid);
      
      await setDoc(typingRef, {
        userId: auth.currentUser.uid,
        userName: user?.name || "Anonymous",
        lastTypingAt: serverTimestamp(),
      });
      
      setIsTyping(true);
    } catch (error) {
      console.error("Failed to update typing indicator:", error);
    }
  };

  const removeTypingIndicator = async () => {
    if (!auth.currentUser || !hasAccess) return;

    try {
      const typingRef = doc(db, "platforms", platformId, "communities", communityId, "typing", auth.currentUser.uid);
      await updateDoc(typingRef, {
        lastTypingAt: null,
      });
      setIsTyping(false);
    } catch (error) {
      console.error("Failed to remove typing indicator:", error);
    }
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessageValue(value);

    // Update typing indicator
    if (value.trim() && !isTyping) {
      updateTypingIndicator();
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to remove typing indicator after 3 seconds of no typing
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        removeTypingIndicator();
      }
    }, 3000);
  };

  const handleSendMessage = async () => {
    if (!messageValue.trim() || sending || !hasAccess) return;

    const uid = auth.currentUser?.uid;
    if (!uid) {
      toast.error("Please log in to send messages");
      return;
    }

    setSending(true);

    try {
      // Remove typing indicator
      if (isTyping) {
        await removeTypingIndicator();
      }

      // Add message
      const messagesRef = collection(db, "platforms", platformId, "communities", communityId, "messages");
      
      const messageData: any = {
        content: messageValue.trim(),
        createdBy: uid,
        authorName: user?.name || "Anonymous",
        createdAt: serverTimestamp(),
        deleted: false,
      };
      
      // Only include authorAvatar if it exists
      if (user && (user.avatarUrl || (user as any)?.photoURL)) {
        messageData.authorAvatar = user.avatarUrl || (user as any)?.photoURL || "";
      }
      
      await addDoc(messagesRef, messageData);

      setMessageValue("");
      
      // Focus back to input
      if (messageInputRef.current) {
        messageInputRef.current.focus();
      }
    } catch (error: any) {
      console.error("Failed to send message:", error);
      if (error?.message?.includes("permission")) {
        toast.error("You don't have permission to send messages");
      } else {
        toast.error("Failed to send message");
      }
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-96 border rounded-lg">
        <div className="text-center space-y-4">
          <Users className="h-16 w-16 mx-auto text-muted-foreground" />
          <div>
            <h3 className="text-lg font-semibold mb-2">Chat Access Required</h3>
            <p className="text-muted-foreground">
              You need to be a member of this community to access the chat.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 border rounded-lg">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading messages...</p>
        </div>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const isOwnMessage = (message: Message) => {
    return message.createdBy === auth.currentUser?.uid;
  };

  return (
    <div className="flex flex-col h-[600px] border rounded-lg bg-background">
      {/* Chat Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Community Chat</h3>
          {messages.length > 0 && (
            <span className="text-sm text-muted-foreground">
              ({messages.length} message{messages.length !== 1 ? "s" : ""})
            </span>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-2">
                <p className="text-muted-foreground">No messages yet</p>
                <p className="text-sm text-muted-foreground">
                  Be the first to start the conversation!
                </p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${isOwnMessage(message) ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar */}
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback>
                    {getInitials(message.authorName)}
                  </AvatarFallback>
                </Avatar>

                {/* Message Bubble */}
                <div className={`flex flex-col max-w-[75%] ${isOwnMessage(message) ? "items-end" : "items-start"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-sm font-medium ${isOwnMessage(message) ? "text-right" : "text-left"}`}>
                      {message.authorName}
                      {isOwnMessage(message) && " (You)"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(message.createdAt)}
                    </span>
                  </div>
                  <div
                    className={`rounded-lg px-4 py-2 ${
                      isOwnMessage(message)
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted rounded-bl-sm"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Typing Indicator */}
          {typingUsers.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground italic">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <span>
                {typingUsers.length === 1
                  ? `${typingUsers[0].userName} is typing...`
                  : `${typingUsers.length} people are typing...`}
              </span>
            </div>
          )}
        </div>
      </ScrollArea>

      <Separator />

      {/* Message Composer */}
      <div className="p-4">
        <div className="flex gap-2">
          <Input
            ref={messageInputRef}
            value={messageValue}
            onChange={handleMessageChange}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            disabled={sending || !hasAccess}
            maxLength={1000}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!messageValue.trim() || sending || !hasAccess}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

