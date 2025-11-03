"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, limit, query, where, updateDoc, doc } from "firebase/firestore";

const shortcutsBase = [
  { path: "", label: "Home" },
  // success-stories hidden due to upload permission issues
  // courses removed from platform root; courses live under communities now
];

export function MobileSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [communities, setCommunities] = React.useState<any[]>([]);
  const [platformName, setPlatformName] = React.useState<string | null>(null);
  const [platformLogo, setPlatformLogo] = React.useState<string | null>(null);
  const [platformTagline, setPlatformTagline] = React.useState<string | null>(null);
  const [platformPrimaryColor, setPlatformPrimaryColor] = React.useState<string | null>(null);

  // Detect platform context: /platforms/[slug]/...
  let platformBase = "";
  if (pathname.startsWith("/platforms/")) {
    const parts = pathname.split("/"); // "", "platforms", slug, ...
    if (parts.length >= 3 && parts[2]) {
      platformBase = `/platforms/${parts[2]}`;
    }
  }

  // Load communities from Firestore when inside a platform
  const loadCommunities = React.useCallback(async () => {
    try {
      if (!platformBase) {
        setCommunities([]);
        setPlatformName(null);
        setPlatformLogo(null);
        setPlatformTagline(null);
        setPlatformPrimaryColor(null);
        return;
      }
      const slug = platformBase.split("/")[2];
      const ps = await getDocs(query(collection(db, "platforms"), where("slug", "==", slug), limit(1)));
      const p = ps.docs[0] ? { id: ps.docs[0].id, ...ps.docs[0].data() } as any : null;
      if (!p) { 
        setCommunities([]); 
        setPlatformName(null);
        setPlatformLogo(null);
        setPlatformTagline(null);
        setPlatformPrimaryColor(null);
        return; 
      }
      setPlatformName(p.name || null);
      setPlatformLogo(p.logoUrl || p.branding?.logoUrl || null);
      setPlatformTagline(p.tagline || null);
      setPlatformPrimaryColor(p.branding?.primaryColor || p.primaryColor || null);
      
      const cs = await getDocs(query(collection(db, "platforms", p.id as string, "communities")) as any);
      const items = cs.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as any[];
      // Backfill missing order field with 0
      const missing = items.filter(c => typeof c.order === "undefined");
      missing.forEach(async (c) => {
        try {
          await updateDoc(doc(db, "platforms", p.id as string, "communities", c.id), { order: 0 });
        } catch {}
      });
      items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setCommunities(items);
    } catch (e) {
      setCommunities([]);
      setPlatformName(null);
      setPlatformLogo(null);
      setPlatformTagline(null);
      setPlatformPrimaryColor(null);
    }
  }, [platformBase]);

  React.useEffect(() => {
    loadCommunities();
  }, [loadCommunities]);

  // Listen for community deletion/update events
  React.useEffect(() => {
    const handleRefresh = () => {
      loadCommunities();
    };

    window.addEventListener('community-deleted', handleRefresh);
    window.addEventListener('community-updated', handleRefresh);

    return () => {
      window.removeEventListener('community-deleted', handleRefresh);
      window.removeEventListener('community-updated', handleRefresh);
    };
  }, [loadCommunities]);

  const shortcuts = shortcutsBase.map(s => ({
    href: platformBase ? (s.path ? `${platformBase}/${s.path}` : `${platformBase}`) : (s.path ? `/${s.path}` : "/"),
    label: s.label,
  }));

  // Resolve platform brand from path if under /platforms/[slug]
  let brandName = "Kelas Tanpa Tembok";
  if (platformName) {
    brandName = platformName;
  } else if (platformBase) {
    // Fallback to slug if platform name not yet loaded
    const slug = platformBase.split("/")[2];
    brandName = slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : "Kelas Tanpa Tembok";
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  function ShortcutIcon({ label }: { label: string }) {
    const cls = "mr-3 inline-block text-muted-foreground";
    switch (label) {
      case "Home":
        return (
          <svg className={cls} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 10.5 12 3l9 7.5"/><path d="M5 10v10h14V10"/>
          </svg>
        );
      case "Success Story":
        return (
          <svg className={cls} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 17l-4.5 2.4.9-5.1L5 10.2l5.1-.7L12 5l1.9 4.5 5.1.7-3.4 4.1.9 5.1z"/>
          </svg>
        );
      case "Courses":
        return (
          <svg className={cls} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19V7l8-4 8 4v12"/><path d="M4 7l8 4 8-4"/><path d="M12 11v8"/>
          </svg>
        );
      case "Communities":
      default:
        return (
          <svg className={cls} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="7" cy="7" r="3"/><circle cx="17" cy="7" r="3"/><path d="M7 10v4M17 10v4"/><path d="M3 21v-2a4 4 0 0 1 4-4h0a4 4 0 0 1 4 4v2"/><path d="M13 21v-2a4 4 0 0 1 4-4h0a4 4 0 0 1 4 4v2"/>
          </svg>
        );
    }
  }

  function CommunityIcon({ community }: { community: any }) {
    const cls = "mr-3 inline-block text-muted-foreground";
    const iconSize = 16;
    
    // If community has iconUrl, use it
    if (community.iconUrl) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img 
          src={community.iconUrl} 
          alt={community.name || ""} 
          className={`${cls} rounded object-cover shrink-0 flex-shrink-0`}
          style={{ 
            width: `${iconSize}px`, 
            height: `${iconSize}px`,
            minWidth: `${iconSize}px`,
            maxWidth: `${iconSize}px`,
            minHeight: `${iconSize}px`,
            maxHeight: `${iconSize}px`
          }}
        />
      );
    }
    
    // Fallback to SVG icons based on id
    switch (community.id) {
      case "c_job":
        return (
          <svg className={cls} width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7h16v10H4z"/><path d="M9 7V5h6v2"/>
          </svg>
        );
      case "c_portfolio":
        return (
          <svg className={cls} width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="14" rx="2"/><path d="M7 8h10M7 12h6"/>
          </svg>
        );
      case "c_va":
        return (
          <svg className={cls} width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="10" rx="2"/><path d="M6 7V5h12v2"/>
          </svg>
        );
      case "c_design":
        return (
          <svg className={cls} width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/>
          </svg>
        );
      case "c_react":
      default:
        return (
          <svg className={cls} width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="2"/><ellipse cx="12" cy="12" rx="11" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="11" ry="4" transform="rotate(-60 12 12)"/><ellipse cx="12" cy="12" rx="11" ry="4"/>
          </svg>
        );
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="md:hidden">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] p-0">
        <SheetHeader className="p-6 pb-4">
          <SheetTitle className="flex items-center gap-2">
            {platformLogo ? (
              <div className="h-6 w-6 rounded-lg bg-muted overflow-hidden shrink-0 border-2" style={{ borderColor: platformPrimaryColor || undefined }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={platformLogo} alt="logo" className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="h-6 w-6 rounded bg-primary" />
            )}
            <div className="flex flex-col items-start gap-0.5">
              <span>{brandName}</span>
              {platformTagline && (
                <span className="text-xs text-muted-foreground font-normal">
                  {platformTagline}
                </span>
              )}
            </div>
          </SheetTitle>
        </SheetHeader>
        <div className="px-6 space-y-6">
          <section>
            <ul className="space-y-1">
              {shortcuts.map((s) => {
                const active = isActive(s.href);
                return (
                  <li key={s.href}>
                    <Link
                      className={`flex items-center rounded px-3 py-2 hover:bg-accent transition-colors ${active ? "bg-accent font-medium border-l-2 border-primary" : ""}`}
                      href={s.href}
                      onClick={() => setOpen(false)}
                    >
                      <ShortcutIcon label={s.label} />
                      {s.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          {platformBase && (
            <section>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">Communities</h2>
              <ul className="space-y-1">
                {communities.slice(0, 6).map((c) => {
                  const commHref = `${platformBase}/communities/${c.id}`;
                  const active = pathname.startsWith(commHref);
                  return (
                    <li key={c.id}>
                      <Link
                        className={`flex items-center truncate rounded px-3 py-2 hover:bg-accent transition-colors ${active ? "bg-accent font-medium border-l-2 border-primary" : ""}`}
                        href={commHref}
                        onClick={() => setOpen(false)}
                      >
                        <CommunityIcon community={c} />
                        {c.name}
                      </Link>
                    </li>
                  );
                })}
                {communities.length === 0 && (
                  <li className="px-3 py-2 text-sm text-muted-foreground">No communities</li>
                )}
              </ul>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
