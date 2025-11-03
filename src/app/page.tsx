"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, BookOpen, TrendingUp, ArrowRight, Sparkles } from "lucide-react";

export default function HomeLanding() {
  const [platforms, setPlatforms] = useState<any[] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        let platformsData: any[] = [];
        try {
          const snap = await getDocs(query(collection(db, "platforms"), orderBy("createdAt", "desc")));
          platformsData = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
        } catch {
          // Fallback if createdAt doesn't exist or ordering fails
          const snap = await getDocs(query(collection(db, "platforms")));
          platformsData = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
        }
        setPlatforms(platformsData);
      } catch (error) {
        console.error("Error loading data:", error);
      }
    })();
  }, []);

  const hasSinglePlatform = platforms !== null && platforms.length === 1;
  const singlePlatform = hasSinglePlatform ? platforms[0] : null;

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="rounded-xl border bg-gradient-to-br from-background to-muted p-8 text-center">
        <h1 className="text-3xl font-bold">Belajar bersama lintas platform</h1>
        <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
          Jaringan sosial multi-platform yang fokus pada pembelajaran komunitas. Jelajahi platform berbasis topik, bergabunglah dengan komunitas, dan berkembang bersama rekan-rekan.
        </p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <Button asChild>
            <Link href="/platforms">Jelajahi platform</Link>
          </Button>
        </div>
      </section>

      {/* Single Platform Hero View */}
      {hasSinglePlatform && singlePlatform && (
        <>
          {/* Featured Platform Card */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Platform Anda</h2>
              <Button asChild variant="outline" size="sm">
                <Link href={`/platforms/${singlePlatform.slug}`}>
                  Jelajahi <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <Link href={`/platforms/${singlePlatform.slug}`}>
              <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50">
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row gap-4 items-start">
                    <div className="h-20 w-20 rounded-xl bg-muted overflow-hidden shrink-0 border-2" style={{ borderColor: singlePlatform.branding?.primaryColor }}>
                      {singlePlatform.branding?.logoUrl ? (
                        <img src={singlePlatform.branding.logoUrl} alt="logo" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-3xl" style={{ color: singlePlatform.branding?.primaryColor }}>
                          <Sparkles />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <h3 className="text-2xl font-bold mb-1" style={{ color: singlePlatform.branding?.primaryColor }}>
                            {singlePlatform.name}
                          </h3>
                          {singlePlatform.tagline && (
                            <p className="text-sm font-medium text-muted-foreground mb-1">
                              {singlePlatform.tagline}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground">/{singlePlatform.slug}</p>
                        </div>
                      </div>
                      {singlePlatform.description && (
                        <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                          {singlePlatform.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {singlePlatform.settings?.features?.communities && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            Komunitas
                          </Badge>
                        )}
                        {singlePlatform.settings?.features?.courses && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            Kursus
                          </Badge>
                        )}
                        {singlePlatform.settings?.features?.successStories && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            Kisah Sukses
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </section>

        </>
      )}

      {/* Multiple Platforms Grid */}
      {platforms !== null && platforms.length > 1 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Platform Unggulan</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {platforms.map((p) => (
              <Link key={p.id} href={`/platforms/${p.slug}`} className="group rounded-md border p-4 hover:border-primary transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded bg-muted overflow-hidden">
                    {p.branding?.logoUrl ? <img src={p.branding.logoUrl} alt="logo" className="h-full w-full object-cover" /> : null}
                  </div>
                  <div>
                    <div className="font-medium" style={{ color: p.branding?.primaryColor }}>{p.name}</div>
                    <div className="text-xs text-muted-foreground">/{p.slug}</div>
                  </div>
                </div>
                <div className="mt-3 flex gap-2 text-xs text-muted-foreground">
                  {p.settings?.features?.communities ? <span className="rounded bg-muted px-2 py-0.5">Komunitas</span> : null}
                  {p.settings?.features?.courses ? <span className="rounded bg-muted px-2 py-0.5">Kursus</span> : null}
                  {p.settings?.features?.successStories ? <span className="rounded bg-muted px-2 py-0.5">Kisah sukses</span> : null}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Loading State */}
      {platforms === null && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Platform Unggulan</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(4)].map((_: any, i: number) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-40" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Empty State - No Platforms */}
      {platforms !== null && platforms.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Belum ada platform</h3>
            <p className="text-muted-foreground mb-4">
              Mulai dengan membuat platform pertama Anda.
            </p>
            <Button asChild>
              <Link href="/platforms/create">Buat Platform</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}