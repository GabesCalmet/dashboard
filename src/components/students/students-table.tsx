"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { levelLabel, studentStatusLabel, studentStatusVariant } from "@/lib/labels";
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
};

export function StudentsTable({ rows, basePath }: { rows: Row[]; basePath: string }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("all");

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const matchesQuery = r.name.toLowerCase().includes(query.toLowerCase());
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id} className="cursor-pointer">
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
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
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
