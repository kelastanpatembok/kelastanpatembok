"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, limit, query, updateDoc, where, doc } from "firebase/firestore";

export const SidebarContext = React.createContext<{ 
  collapsed: boolean; 
  setCollapsed: (v: boolean) => void;
  refreshCommunities: () => void;
}>({
  collapsed: false,
  setCollapsed: () => {},
  refreshCommunities: () => {},
});

export function useSidebar() {
  return React.useContext(SidebarContext);
}

const shortcutsBase = [
  { path: "", label: "Home" },
  { path: "membership", label: "Membership" },
  // success-stories hidden due to upload permission issues
  // courses removed from platform root; courses live under communities now
];

export function LeftSidebar() {
  const pathname = usePathname();
  const { collapsed, setCollapsed } = useSidebar();
  const [communities, setCommunities] = React.useState<any[]>([]);
  const [isOwner, setIsOwner] = React.useState(false);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [platformId, setPlatformId] = React.useState<string | null>(null);
  const [draggedCommunityId, setDraggedCommunityId] = React.useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null);

  // Detect platform context: /platforms/[slug]/...
  let platformBase = "";
  if (pathname.startsWith("/platforms/")) {
    const parts = pathname.split("/"); // "", "platforms", slug, ...
    if (parts.length >= 3 && parts[2]) {
      platformBase = `/platforms/${parts[2]}`;
    }
  }

  const shortcuts = shortcutsBase.map(s => ({
    href: platformBase ? (s.path ? `${platformBase}/${s.path}` : `${platformBase}`) : (s.path ? `/${s.path}` : "/"),
    label: s.label,
  }));

  // Load communities from Firestore when inside a platform; otherwise show none
  const loadCommunities = React.useCallback(async () => {
    try {
      if (!platformBase) {
        setCommunities([]);
        setIsOwner(false);
        return;
      }
      const slug = platformBase.split("/")[2];
      const ps = await getDocs(query(collection(db, "platforms"), where("slug", "==", slug), limit(1)));
      const p = ps.docs[0] ? { id: ps.docs[0].id, ...ps.docs[0].data() } as any : null;
      if (!p) { setCommunities([]); setPlatformId(null); return; }
      setPlatformId(p.id as string);
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
      const uid = auth.currentUser?.uid;
      setIsOwner(!!uid && p.ownerId === uid);
    } catch (e) {
      setCommunities([]);
      setIsOwner(false);
    }
  }, [platformBase]);

  React.useEffect(() => {
    loadCommunities();
  }, [loadCommunities, refreshKey]);

  // Listen for community deletion/update events
  React.useEffect(() => {
    const handleRefresh = () => {
      setRefreshKey(prev => prev + 1);
    };

    window.addEventListener('community-deleted', handleRefresh);
    window.addEventListener('community-updated', handleRefresh);

    return () => {
      window.removeEventListener('community-deleted', handleRefresh);
      window.removeEventListener('community-updated', handleRefresh);
    };
  }, []);

  // Handle drag & drop reorder for owner
  async function handleCommunityReorder(newOrder: any[]) {
    if (!isOwner || !platformId) return;
    try {
      // Update order for each community where it changed
      await Promise.all(
        newOrder.map((comm, index) => {
          if (comm.order !== index) {
            return updateDoc(doc(db, "platforms", platformId, "communities", comm.id), { order: index });
          }
          return Promise.resolve();
        })
      );
      // Dispatch update event so other widgets refresh
      try { window.dispatchEvent(new CustomEvent('community-updated')); } catch {}
    } catch {
      // On error, reload from server to avoid inconsistent state
      loadCommunities();
    }
  }

  function handleDragStart(e: React.DragEvent, communityId: string) {
    setDraggedCommunityId(communityId);
    e.dataTransfer.effectAllowed = "move";
    (e.currentTarget as HTMLElement).style.opacity = "0.6";
  }

  function handleDragEnd(e: React.DragEvent) {
    (e.currentTarget as HTMLElement).style.opacity = "1";
    setDraggedCommunityId(null);
    setDragOverIndex(null);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  }

  function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault();
    if (!isOwner || !draggedCommunityId) { setDragOverIndex(null); return; }
    const draggedIndex = communities.findIndex(c => c.id === draggedCommunityId);
    if (draggedIndex === -1 || draggedIndex === dropIndex) { setDragOverIndex(null); return; }
    const next = [...communities];
    const [removed] = next.splice(draggedIndex, 1);
    next.splice(dropIndex, 0, removed);
    // Optimistic update
    setCommunities(next);
    setDragOverIndex(null);
    handleCommunityReorder(next);
  }

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("rwid_sidebar_collapsed", next ? "1" : "0");
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  function ShortcutIcon({ label }: { label: string }) {
    const cls = collapsed ? "inline-block text-muted-foreground" : "mr-2 inline-block text-muted-foreground";
    switch (label) {
      case "Home":
        return (
          <svg className={cls} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 10.5 12 3l9 7.5"/><path d="M5 10v10h14V10"/>
          </svg>
        );
      case "Membership":
        return (
          <svg className={cls} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
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
    const cls = collapsed ? "inline-block text-muted-foreground" : "mr-2 inline-block text-muted-foreground";
    const iconSize = 24;
    
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
    <aside className="hidden md:block">
      <div className="sticky top-16">
        <div className={`rounded-xl border bg-sidebar p-3 text-sidebar-foreground ${collapsed ? "w-[56px]" : "w-[260px]"}`}>
          <section>
          <ul className="space-y-1">
            {shortcuts.map((s) => {
              const active = isActive(s.href);
              return (
                <li key={s.href}>
                  <Link
                    className={
                      `flex items-center rounded px-2 py-1.5 hover:bg-accent transition-colors ${active ? "bg-accent font-medium border-l-2 border-primary" : ""}`
                    }
                    href={s.href}
                    aria-label={active ? `${s.label} (current page)` : `Navigate to ${s.label}`}
                  >
                    <ShortcutIcon label={s.label} />
                    {!collapsed && s.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="mt-6">
          {!collapsed && <h2 className="mb-2 text-xs font-medium text-muted-foreground">Communities</h2>}
          <ul className="space-y-1">
            {communities.map((c, index) => {
              const commHref = platformBase ? `${platformBase}/communities/${c.id}` : `/communities/${c.id}`;
              const active = pathname.startsWith(commHref);
              return (
                <li
                  key={c.id}
                  draggable={isOwner}
                  onDragStart={(e)=> handleDragStart(e, c.id)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e)=> handleDragOver(e, index)}
                  onDrop={(e)=> handleDrop(e, index)}
                >
                  <Link
                    className={`flex items-center truncate rounded px-2 py-1.5 hover:bg-accent transition-colors ${active ? "bg-accent font-medium border-l-2 border-primary" : ""} ${dragOverIndex === index ? "ring-2 ring-primary/50" : ""}`}
                    href={commHref}
                  >
                    <CommunityIcon community={c} />
                    {!collapsed && (
                      <span className="flex-1 truncate">{c.name}</span>
                    )}
                    {isOwner && (
                      <span className="ml-2 cursor-move text-muted-foreground" aria-hidden>⋮⋮</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Footer: owner action + collapse/expand */}
        {platformBase && isOwner && (
          <div className="mt-4">
            <Button asChild size="sm" className="w-full">
              <a href={`${platformBase}/communities/create`}>Create community</a>
            </Button>
          </div>
        )}
        <div className="mt-3 flex justify-end">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggle}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent transition-colors"
                  aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {collapsed ? (
                      // Expand (chevron-right)
                      <polyline points="9 18 15 12 9 6" />
                    ) : (
                      // Collapse (chevron-left)
                      <polyline points="15 18 9 12 15 6" />
                    )}
                  </svg>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <span className="text-xs">{collapsed ? "Expand" : "Collapse"} sidebar</span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
    </aside>
  );
}


