"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-provider";
import { MobileSidebar } from "@/components/mobile-sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore";
import { PlatformSwitcher } from "@/components/platform-switcher";
import { Bookmark, User, LogOut, Plus, Users } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Removed top navigation in favor of left sidebar shortcuts

export function SiteHeader() {
  const pathname = usePathname();
  const { user, loginAs, loginWithGoogle, logout, loading } = useAuth() as any;
  const [logoutOpen, setLogoutOpen] = useState(false);
  const router = useRouter();
  const [platformRole, setPlatformRole] = useState<string | null>(null);
  const [platformTagline, setPlatformTagline] = useState<string | null>(null);
  const [platformLogo, setPlatformLogo] = useState<string | null>(null);
  const [platformPrimaryColor, setPlatformPrimaryColor] = useState<string | null>(null);
  const [platformName, setPlatformName] = useState<string | null>(null);

  // Resolve platform brand from path if under /platforms/[slug]
  let brandName = "Kelas Tanpa Tembok";
  let brandHref = "/";
  try {
    if (pathname.startsWith("/platforms/")) {
      const parts = pathname.split("/");
      const slug = parts[2];
      if (slug) {
        brandHref = `/platforms/${slug}`;
        // Use platformName from Firestore if available, otherwise fallback to platforms.json
        if (platformName) {
          brandName = platformName;
        } else {
          const platforms = require("@/data/platforms.json");
          const p = platforms.find((x: any) => x.slug === slug);
          if (p) {
            brandName = p.name;
          }
        }
      }
    }
  } catch {}

  // Derive role within current platform (owner/member) for label and get tagline
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setPlatformRole(null);
        setPlatformTagline(null);
        setPlatformLogo(null);
        setPlatformPrimaryColor(null);
        setPlatformName(null);
        if (!pathname.startsWith("/platforms/")) return;
        const slug = pathname.split("/")[2];
        const snap = await getDocs(query(collection(db, "platforms"), where("slug", "==", slug), limit(1)));
        const platform = snap.docs[0] ? { id: snap.docs[0].id, ...snap.docs[0].data() } as any : null;
        if (!platform) return;
        
        // Set name, tagline, logo, and primary color (load even without user)
        if (active) {
          if (platform.name) {
            setPlatformName(platform.name);
          }
          if (platform.tagline) {
            setPlatformTagline(platform.tagline);
          }
          if (platform.branding?.logoUrl) {
            setPlatformLogo(platform.branding.logoUrl);
          }
          if (platform.branding?.primaryColor) {
            setPlatformPrimaryColor(platform.branding.primaryColor);
          }
        }
        
        const currentUid = auth.currentUser?.uid || user?.uid || (user as any)?.id;
        if (!currentUid) return;
        if (platform.ownerId && platform.ownerId === currentUid) {
          if (active) setPlatformRole("owner");
          return;
        }
        const memRef = doc(db, "platforms", platform.id, "members", currentUid);
        const mem = await getDoc(memRef);
        if (mem.exists() && active) {
          const role = (mem.data() as any)?.role || "member";
          setPlatformRole(role);
        }
      } catch (e) {
        console.error("Error loading platform tagline:", e);
      }
    })();
    return () => { active = false; };
  }, [pathname, user]);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className={`mx-auto relative flex w-full max-w-[110rem] items-center justify-between px-4 ${platformTagline ? 'h-16 py-1' : 'h-14'}`}>
        {/* Left: mobile menu */}
        <div className="flex items-center gap-3">
          <MobileSidebar />
        </div>

        {/* Center: brand - absolutely centered */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <Link href={brandHref} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            {platformLogo && (
              <div className="h-8 w-8 rounded-lg bg-muted overflow-hidden shrink-0 border-2" style={{ borderColor: platformPrimaryColor || undefined }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={platformLogo} alt="logo" className="h-full w-full object-cover" />
              </div>
            )}
            <div className="flex flex-col items-start gap-0.5">
              <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                {brandName}
              </span>
              {platformTagline && (
                <span className="text-xs text-foreground/70 font-medium">
                  {platformTagline}
                </span>
              )}
            </div>
          </Link>
        </div>

        {/* Right: actions */}
        <div className="flex items-center justify-end gap-2">
          <PlatformSwitcher />
          {user?.role === "owner" && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/platforms/create" className="hidden md:block">
                    <Button size="sm" variant="outline" className="bg-white hover:bg-white/90" aria-label="Create Platform">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Create Platform</p>
                </TooltipContent>
              </Tooltip>
              {pathname.startsWith("/platforms/") && (() => {
                const parts = pathname.split("/");
                const slug = parts[2];
                return slug ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link href={`/platforms/${slug}/communities/create`} className="hidden md:block">
                        <Button size="sm" variant="outline" aria-label="Create Community">
                          <Users className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Create Community</p>
                    </TooltipContent>
                  </Tooltip>
                ) : null;
              })()}
            </>
          )}
          {/* Review Queue button hidden for now; page still accessible via URL */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button aria-label="Open profile menu" className="relative inline-flex items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-ring">
                  <Avatar className="h-8 w-8 ring-2 ring-primary shadow-sm">
                    <AvatarImage src={user.avatarUrl || ""} alt={user.name} />
                    <AvatarFallback>{user.name.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-0 -right-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel>
                  <div className="truncate text-sm font-medium">{user.name}</div>
                  <div className="text-xs text-muted-foreground">{platformRole || user.role}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/bookmarks" className="flex items-center">
                    <Bookmark className="h-4 w-4 mr-2" />
                    Show bookmarks
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setLogoutOpen(true)} className="flex items-center">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="bg-white text-foreground hover:bg-white/90 gap-2 px-3"
              disabled={loading}
              onClick={async ()=>{ await loginWithGoogle(); }}
              aria-label="Continue with Google"
            >
              <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.156 7.961 3.039l5.657-5.657C33.64 6.053 29.082 4 24 4 12.954 4 4 12.954 4 24s8.954 20 20 20c11.046 0 20-8.954 20-20 0-1.341-.138-2.651-.389-3.917z"/>
                <path fill="#FF3D00" d="M6.306 14.691l6.571 4.817C14.655 16.108 18.961 14 24 14c3.059 0 5.842 1.156 7.961 3.039l5.657-5.657C33.64 6.053 29.082 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
                <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.197l-6.191-5.238C29.145 35.091 26.691 36 24 36c-5.202 0-9.62-3.317-11.281-7.946l-6.513 5.02C9.521 39.556 16.227 44 24 44z"/>
                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.79 2.233-2.231 4.166-4.095 5.565.001-.001 6.191 5.238 6.191 5.238C39.244 35.659 44 30 44 24c0-1.341-.138-2.651-.389-3.917z"/>
              </svg>
              <span className="hidden lg:inline">Continue with Google</span>
            </Button>
          )}
        </div>
      </div>
      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log out?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">You will be signed out of Kelas Tanpa Dinding.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogoutOpen(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                await logout();
                setLogoutOpen(false);
                router.push("/");
              }}
            >
              Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}


