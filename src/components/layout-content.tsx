"use client";

import { SiteHeader } from "@/components/site-header";
import { LeftSidebar, useSidebar, SidebarContext } from "@/components/left-sidebar";
import { Footer } from "@/components/footer";
import { useState, useEffect, useCallback, ReactNode } from "react";
import { usePathname } from "next/navigation";

export function LayoutContent({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const saved = localStorage.getItem("rwid_sidebar_collapsed");
    if (saved) setCollapsed(saved === "1");
  }, []);

  // Check if we're on a course viewer page
  const isCourseViewer = pathname.includes("/courses/") && pathname.includes("/view");
  // Platform creation route should bypass main layout as it's platform-agnostic
  const isPlatformCreate = pathname === "/platforms/create";
  // Platforms browser should show header but no sidebar (platform-agnostic)
  const isPlatformsIndex = pathname === "/platforms";
  // Home landing should hide the left sidebar but keep header
  const isHomeLanding = pathname === "/";
  // Payment page should hide the left sidebar
  const isPaymentPage = pathname.startsWith("/payment");
  // Bookmarks page should hide the left sidebar
  const isBookmarksPage = pathname === "/bookmarks";
  // Profile pages should hide the left sidebar
  const isProfilePage = pathname.startsWith("/profile");

  if (isCourseViewer || isPlatformCreate) {
    // For course viewer and platform create, render children directly without main site layout
    return <>{children}</>;
  }
  
  // Create refresh function for sidebar
  const refreshCommunities = useCallback(() => {
    window.dispatchEvent(new CustomEvent('community-deleted'));
  }, []);

  if (isPaymentPage || isBookmarksPage || isProfilePage || isPlatformsIndex) {
    // For payment/bookmarks/profile/platforms pages, show header but no sidebar
    return (
      <SidebarContext.Provider value={{ collapsed, setCollapsed, refreshCommunities }}>
        <div className="flex min-h-screen flex-col">
          <SiteHeader />
          <div className={`mx-auto w-full flex-1 ${(isBookmarksPage || isProfilePage) ? "max-w-5xl" : "max-w-[110rem]"} px-4 py-6`}>
            <main id="main-content">{children}</main>
          </div>
          <Footer />
        </div>
      </SidebarContext.Provider>
    );
  }

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed, refreshCommunities }}>
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <div className={`mx-auto w-full flex-1 ${isHomeLanding ? "max-w-4xl" : "max-w-[110rem]"} px-4 py-6`}>
          <div className={`grid grid-cols-1 gap-6 ${isHomeLanding ? "" : (collapsed ? "md:grid-cols-[56px_1fr]" : "md:grid-cols-[280px_1fr]")}`}>
            {!isHomeLanding && <LeftSidebar />}
            <main id="main-content" className="min-w-0">{children}</main>
          </div>
        </div>
        <Footer />
      </div>
    </SidebarContext.Provider>
  );
}
