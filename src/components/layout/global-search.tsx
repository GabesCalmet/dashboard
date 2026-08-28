"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search, GraduationCap, User, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type SearchResult = {
  type: string;
  label: string;
  sublabel?: string;
  href: string;
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const inFinancialSection = pathname.startsWith("/admin/financial");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clears stale results when the debounced query no longer qualifies for a search
      setResults([]);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.results ?? []);
      setLoading(false);
    }, 250);
  }, [query]);

  return (
    <>
      <Button
        variant="outline"
        className="w-full max-w-xs justify-start gap-2 text-muted-foreground sm:w-64"
        onClick={() => setOpen(true)}
      >
        <Search className="size-4" />
        <span className="hidden sm:inline">Pesquisar...</span>
        <kbd className="ml-auto hidden rounded border bg-secondary px-1.5 py-0.5 text-[10px] sm:inline">
          ⌘K
        </kbd>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-[20%] max-w-lg translate-y-0 gap-0 p-0" showCloseButton={false}>
          <DialogTitle className="sr-only">Pesquisa global</DialogTitle>
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <Search className="size-4 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Buscar alunos, professores..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border-0 shadow-none focus-visible:ring-0"
            />
            {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          </div>
          <div className="max-h-80 overflow-y-auto scrollbar-thin p-2">
            {results.length === 0 && query.trim().length >= 2 && !loading && (
              <p className="p-4 text-center text-sm text-muted-foreground">
                Nenhum resultado encontrado.
              </p>
            )}
            {results.map((r) => (
              <button
                key={r.href}
                onClick={() => {
                  setOpen(false);
                  setQuery("");
                  const href =
                    r.type === "Aluno" && inFinancialSection ? `${r.href}?tab=financial` : r.href;
                  router.push(href);
                }}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-secondary"
              >
                {r.type === "Aluno" ? (
                  <GraduationCap className="size-4 text-accent" />
                ) : (
                  <User className="size-4 text-accent" />
                )}
                <div className="min-w-0">
                  <p className="truncate font-medium">{r.label}</p>
                  {r.sublabel && (
                    <p className="truncate text-xs text-muted-foreground">{r.sublabel}</p>
                  )}
                </div>
                <span className="ml-auto text-xs text-muted-foreground">{r.type}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
