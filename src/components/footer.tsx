import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t bg-background/50 mt-auto">
      <div className="mx-auto w-full max-w-4xl px-4 py-6">
        <div className="flex flex-col items-center gap-2 text-center">
          
          <p className="text-sm text-muted-foreground">
            Belajar bersama lintas platform
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            © 2025 Kelas Tanpa Tembok
          </p>
        </div>
      </div>
    </footer>
  );
}

