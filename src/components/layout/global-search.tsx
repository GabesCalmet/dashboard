"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search, GraduationCap, User, Clock, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type SearchResult = {
  type: string;
  label: string;
  sublabel?: string;
  href: string;
};

const WEEKDAY_TOKENS: Record<string, number> = {
  dom: 0,
  domingo: 0,
  seg: 1,
  segunda: 1,
  ter: 2,
  terca: 2,
  qua: 3,
  quarta: 3,
  qui: 4,
  quinta: 4,
  sex: 5,
  sexta: 5,
  sab: 6,
  sabado: 6,
};

function normalizeTimeToken(tok: string): string | null {
  const m = tok.match(/^(\d{1,2})(?:[h:](\d{2}))?h?$/i);
  if (!m) return null;
  const h = Number(m[1]);
  const mm = m[2] ? Number(m[2]) : 0;
  if (h > 23 || mm > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

// Recognizes "seg 17-18", "17h-18h", "segunda 17:00-18:00", etc. — a
// weekday word (Portuguese, optional) followed by a start-end time range.
// Anything that doesn't match this shape is a plain name search instead.
function parseAvailabilityQuery(raw: string): { weekday?: number; start: string; end: string } | null {
  const trimmed = raw.trim().toLowerCase();
  const rangeMatch = trimmed.match(/^(?:([a-zà-ÿ]+)\s+)?(\S+)\s*(?:-|a|às|as|ate|até)\s*(\S+)$/i);
  if (!rangeMatch) return null;
  const [, dayToken, startTok, endTok] = rangeMatch;
  const start = normalizeTimeToken(startTok);
  const end = normalizeTimeToken(endTok);
  if (!start || !end) return null;

  let weekday: number | undefined;
  if (dayToken) {
    const key = dayToken.normalize("NFD").replace(/[̀-ͯ]/g, "");
    weekday = WEEKDAY_TOKENS[key];
    if (weekday === undefined) return null;
  }
  return { weekday, start, end };
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const inFinancialSection = pathname.startsWith("/admin/financial");
  // While already on an Agenda page, a Professor result jumps straight to
  // that teacher's filtered calendar instead of their profile page — the
  // profile is still one click away from there if needed.
  const agendaBasePath = pathname.startsWith("/admin/agenda")
    ? "/admin/agenda"
    : pathname.startsWith("/coordinator/agenda")
      ? "/coordinator/agenda"
      : null;
  // Broader than agendaBasePath above — any admin/coordinator page, not
  // just Agenda itself, since an availability search can be triggered from
  // anywhere and always jumps straight to the matching teacher's calendar.
  const roleBase = pathname.startsWith("/admin")
    ? "/admin"
    : pathname.startsWith("/coordinator")
      ? "/coordinator"
      : null;
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
      const availability = parseAvailabilityQuery(query);
      const url = availability
        ? `/api/teacher-availability?start=${availability.start}&end=${availability.end}${
            availability.weekday !== undefined ? `&weekday=${availability.weekday}` : ""
          }`
        : `/api/search?q=${encodeURIComponent(query)}`;
      const res = await fetch(url);
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
              placeholder="Buscar alunos, professores, ou 'seg 17-18' por disponibilidade..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border-0 shadow-none focus-visible:ring-0"
            />
            {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          </div>
          <div className="max-h-80 overflow-y-auto scrollbar-thin p-2">
            {results.length === 0 && query.trim().length >= 2 && !loading && (
              <p className="p-4 text-center text-sm text-muted-foreground">
                {parseAvailabilityQuery(query)
                  ? "Nenhum professor disponível nesse horário."
                  : "Nenhum resultado encontrado."}
              </p>
            )}
            {results.map((r) => (
              <button
                key={r.href}
                onClick={() => {
                  setOpen(false);
                  setQuery("");
                  const href =
                    r.type === "Aluno" && inFinancialSection
                      ? `${r.href}?tab=financial`
                      : r.type === "Professor" && agendaBasePath
                        ? `${agendaBasePath}?teacherId=${r.href.split("/").pop()}`
                        : r.type === "Disponível"
                          ? `${roleBase ?? "/admin"}/agenda?teacherId=${r.href.split("/").pop()}`
                          : r.href;
                  router.push(href);
                }}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-secondary"
              >
                {r.type === "Aluno" ? (
                  <GraduationCap className="size-4 text-accent" />
                ) : r.type === "Disponível" ? (
                  <Clock className="size-4 text-accent" />
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
