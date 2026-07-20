import { History } from "lucide-react";
import { formatDateTime } from "@/lib/labels";

type AuditEntry = {
  id: string;
  action: string;
  createdAt: Date;
  actorName: string;
  changes: unknown;
};

const actionLabel: Record<string, string> = {
  CREATE: "criou o registro",
  UPDATE: "atualizou o registro",
  DELETE: "excluiu o registro",
  PROMOTE: "promoveu de nível",
  STATUS_CHANGE: "alterou o status",
};

export function AuditTrail({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Nenhum evento de histórico registrado ainda.
      </p>
    );
  }

  return (
    <ol className="space-y-4">
      {entries.map((e) => (
        <li key={e.id} className="flex gap-3">
          <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary">
            <History className="size-3.5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm">
              <span className="font-medium">{e.actorName}</span>{" "}
              <span className="text-muted-foreground">
                {actionLabel[e.action] ?? e.action.toLowerCase()}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">{formatDateTime(e.createdAt)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
