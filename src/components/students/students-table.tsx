"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { markStudentContacted } from "@/server/actions/students";
import { levelLabel, studentStatusLabel, studentStatusVariant, formatCalendarDate } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { CourseLevel, StudentStatus } from "@prisma/client";

type Row = {
  id: string;
  name: string;
  login: string | null;
  avatarUrl?: string | null;
  level: CourseLevel;
  status: StudentStatus;
  teacherName?: string | null;
  courseName?: string | null;
  // Group name + every participant's name, for a "grupo" cadastro — each
  // one needs to be findable by their own name even though they all share
  // this one row/profile. Just [name] for an ordinary individual student.
  searchNames: string[];
  groupMemberNames?: string[];
  // Pausados follow-up reminder — pauseContactDue is computed server-side
  // (status PAUSED, date arrived, not yet contacted) so this stays in sync
  // with Brazil's calendar day instead of the viewer's own browser clock.
  pauseContactDate?: string | null;
  pauseContacted?: boolean;
  pauseContactDue?: boolean;
};

function ContatoCell({ row }: { row: Row }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (row.status !== "PAUSED") return <span className="text-sm text-muted-foreground">—</span>;
  if (row.pauseContacted) {
    return (
      <span className="flex items-center gap-1 text-sm text-muted-foreground">
        <CheckCircle2 className="size-3.5 text-success" /> Contatado
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("text-xs", row.pauseContactDue ? "font-medium text-warning" : "text-muted-foreground")}>
        {row.pauseContactDate ? formatCalendarDate(row.pauseContactDate) : "—"}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          startTransition(async () => {
            try {
              await markStudentContacted(row.id);
              toast.success("Aluno marcado como contatado.");
              router.refresh();
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Erro ao atualizar.");
            }
          });
        }}
      >
        {isPending && <Loader2 className="animate-spin" />}
        Contatado
      </Button>
    </div>
  );
}

export function StudentsTable({
  rows,
  basePath,
  initialStatus = "all",
}: {
  rows: Row[];
  basePath: string;
  initialStatus?: string;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>(initialStatus);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return rows.filter((r) => {
      const matchesQuery = r.searchNames.some((n) => n.toLowerCase().includes(q));
      const matchesStatus = status === "all" || r.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [rows, query, status]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          placeholder="Buscar por nome..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="ACTIVE">Ativo</SelectItem>
            <SelectItem value="PAUSED">Pausado</SelectItem>
            <SelectItem value="CANCELED">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aluno</TableHead>
              <TableHead>Nível</TableHead>
              <TableHead>Professor</TableHead>
              <TableHead>Curso</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Contato</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow
                key={r.id}
                className={cn("cursor-pointer", r.pauseContactDue && "bg-warning/5")}
              >
                <TableCell className="p-0">
                  <Link
                    href={`${basePath}/${r.id}`}
                    className="flex items-center gap-3 px-3 py-2.5"
                  >
                    <Avatar className="size-8">
                      {r.avatarUrl && <AvatarImage src={r.avatarUrl} />}
                      <AvatarFallback>{r.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{r.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{r.login}</p>
                      {r.groupMemberNames && r.groupMemberNames.length > 0 && (
                        <p className="truncate text-xs text-muted-foreground">
                          Grupo: {r.groupMemberNames.join(", ")}
                        </p>
                      )}
                    </div>
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{levelLabel[r.level].split(" —")[0]}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {r.teacherName ?? "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {r.courseName ?? "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={studentStatusVariant[r.status]}>
                    {studentStatusLabel[r.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <ContatoCell row={r} />
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Nenhum aluno encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
