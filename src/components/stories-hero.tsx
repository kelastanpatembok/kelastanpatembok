"use client";

import { Button } from "@/components/ui/button";
import { Rocket } from "lucide-react";
import Link from "next/link";

interface StoriesHeroProps {
  className?: string;
}

export function StoriesHero({
  className,
}: StoriesHeroProps) {
  return (
    <div className={`relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-background ${className}`}>
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      
      <div className="relative p-8 md:p-12">
        <div className="max-w-4xl">
          <div className="flex items-center gap-2 mb-4">
            <Rocket className="h-8 w-8 text-primary" />
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Kisah Sukses Nyata
              <span className="block text-primary">Dari Komunitas Kami</span>
            </h1>
          </div>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl">
            Temukan bagaimana anggota komunitas mengubah karir mereka, meningkatkan pendapatan, 
            dan mendapatkan pekerjaan remote impian mereka. Ini adalah kisah nyata dari orang-orang nyata.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button size="lg" asChild>
              <Link href="#stories">
                Baca Kisah Sukses
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/courses">
                Mulai Perjalananmu
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
