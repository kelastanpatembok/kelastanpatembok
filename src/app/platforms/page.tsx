"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, limit, query } from "firebase/firestore";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Button } from "@/components/ui/button";
import { PlatformSwitcher } from "@/components/platform-switcher";

export default function PlatformsBrowserPage() {
  const [platforms, setPlatforms] = useState<any[]>([]);
  const enableCreate = process.env.NEXT_PUBLIC_ENABLE_PLATFORM_CREATION === "1";
  const enableSwitcher = process.env.NEXT_PUBLIC_ENABLE_PLATFORM_SWITCHER === "1";

  useEffect(() => {
    (async () => {
      const snap = await getDocs(query(collection(db, "platforms")));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      setPlatforms(list);
    })();
  }, []);

  const items = useMemo(() => platforms, [platforms]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 space-y-6">
      <Breadcrumbs items={[{ label: "Platforms" }]} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Platform browser</h1>
        <div className="flex items-center gap-2">
          {enableSwitcher ? <PlatformSwitcher /> : null}
          {enableCreate ? (
            <Button asChild>
              <Link href="/platforms/create">Create platform</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => (
          <Link key={p.id} href={`/platforms/${p.slug}`} className="group rounded-md border p-4 hover:border-primary transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded bg-muted overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.branding.logoUrl ? <img src={p.branding.logoUrl} alt="logo" className="h-full w-full object-cover" /> : null}
              </div>
              <div>
                <div className="font-medium" style={{ color: p.branding.primaryColor }}>{p.name}</div>
                <div className="text-xs text-muted-foreground">/{p.slug}</div>
              </div>
            </div>
            <div className="mt-3 flex gap-2 text-xs text-muted-foreground">
              {p.settings.features.communities ? <span className="rounded bg-muted px-2 py-0.5">Communities</span> : null}
              {p.settings.features.courses ? <span className="rounded bg-muted px-2 py-0.5">Courses</span> : null}
              {p.settings.features.successStories ? <span className="rounded bg-muted px-2 py-0.5">Success stories</span> : null}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}


