"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateTime, auditActionLabel, auditActionVariant } from "@/lib/labels";
import { roleLabel } from "@/components/layout/nav-config";
import type { AuditAction, Role } from "@prisma/client";

export type AuditEntryRow = {
  id: string;
  action: AuditAction;
  actorName: string;
  actorRole: Role;
  entityId: string;
  changes: unknown;
  createdAt: string;
};

function formatValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

// recordAudit's `changes` isn't one fixed shape across the codebase — some
// calls store a { field: [old, new] } diff per field, some store a single
// { before: {...}, after: {...} } pair, and some just a flat { field:
// value } descriptor with no "before" at all. This reads all three back
// into one uniform list of rows for the table below instead of each
// caller having to agree on a shape up front.
function normalizeChanges(changes: unknown): { field: string; before: string; after: string }[] {
  if (!changes || typeof changes !== "object") return [];
  const obj = changes as Record<string, unknown>;
  const keys = Object.keys(obj);

  if (
    keys.length === 2 &&
    keys.includes("before") &&
    keys.includes("after") &&
    typeof obj.before === "object" &&
    typeof obj.after === "object" &&
    obj.before !== null &&
    obj.after !== null
  ) {
    const before = obj.before as Record<string, unknown>;
    const after = obj.after as Record<string, unknown>;
    const fields = [...new Set([...Object.keys(before), ...Object.keys(after)])];
    return fields.map((field) => ({
      field,
      before: formatValue(before[field]),
      after: formatValue(after[field]),
    }));
  }

  return keys.map((field) => {
    const value = obj[field];
    if (Array.isArray(value) && value.length === 2) {
      return { field, before: formatValue(value[0]), after: formatValue(value[1]) };
    }
    return { field, before: "—", after: formatValue(value) };
  });
}

function ChangesDialog({ entry, onOpenChange }: { entry: AuditEntryRow; onOpenChange: (open: boolean) => void }) {
  const rows = normalizeChanges(entry.changes);

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalhes da alteração</DialogTitle>
          <DialogDescription>
            {entry.actorName} · {formatDateTime(entry.createdAt)}
          </DialogDescription>
        </DialogHeader>

        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhum detalhe adicional registrado para esta ação.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campo</TableHead>
                  <TableHead>Valor anterior</TableHead>
                  <TableHead>Valor novo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.field}>
                    <TableCell className="font-medium">{r.field}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.before}</TableCell>
                    <TableCell className="text-sm">{r.after}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function AuditEntriesTable({ entries }: { entries: AuditEntryRow[] }) {
  const [viewing, setViewing] = useState<AuditEntryRow | null>(null);

  function viewButton(e: AuditEntryRow) {
    return (
      <Button variant="outline" size="sm" onClick={() => setViewing(e)}>
        <Eye /> Ver
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      {/* Mobile: one card per entry. */}
      <div className="space-y-3 md:hidden">
        {entries.map((e) => (
          <div key={e.id} className="space-y-2 rounded-xl border p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{e.actorName}</p>
                <p className="text-xs text-muted-foreground">{roleLabel[e.actorRole]}</p>
              </div>
              <Badge variant={auditActionVariant[e.action]}>{auditActionLabel[e.action]}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{formatDateTime(e.createdAt)}</p>
            <p className="truncate font-mono text-xs text-muted-foreground" title={e.entityId}>
              {e.entityId}
            </p>
            {viewButton(e)}
          </div>
        ))}
        {entries.length === 0 && (
          <p className="py-10 text-center text-muted-foreground">Nenhum registro de auditoria ainda.</p>
        )}
      </div>

      {/* Desktop/tablet: the full table. */}
      <div className="hidden overflow-hidden rounded-xl border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/hora</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Registro</TableHead>
              <TableHead className="text-right">Detalhes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDateTime(e.createdAt)}
                </TableCell>
                <TableCell>
                  {e.actorName}{" "}
                  <span className="text-xs text-muted-foreground">({roleLabel[e.actorRole]})</span>
                </TableCell>
                <TableCell>
                  <Badge variant={auditActionVariant[e.action]}>{auditActionLabel[e.action]}</Badge>
                </TableCell>
                <TableCell className="max-w-48 truncate font-mono text-xs text-muted-foreground" title={e.entityId}>
                  {e.entityId}
                </TableCell>
                <TableCell className="text-right">{viewButton(e)}</TableCell>
              </TableRow>
            ))}
            {entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  Nenhum registro de auditoria ainda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {viewing && <ChangesDialog entry={viewing} onOpenChange={(o) => !o && setViewing(null)} />}
    </div>
  );
}
