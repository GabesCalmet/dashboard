import { PageHeader } from "@/components/shared/page-header";
import { AuditEntityPicker } from "@/components/audit/audit-entity-picker";
import { AuditEntriesTable } from "@/components/audit/audit-entries-table";
import {
  getAuditEntriesForEntityType,
  AUDIT_ENTITY_LABELS,
  AUDIT_ENTITY_TYPES,
} from "@/server/queries/audit";

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string }>;
}) {
  const { entity: entityParam } = await searchParams;
  const entityType =
    entityParam && AUDIT_ENTITY_TYPES.includes(entityParam) ? entityParam : AUDIT_ENTITY_TYPES[0];
  const entries = await getAuditEntriesForEntityType(entityType);

  return (
    <div>
      <PageHeader
        title="Auditoria"
        description="Histórico de alterações registradas em cada tabela do sistema."
      />

      <div className="mb-4">
        <AuditEntityPicker
          value={entityType}
          options={AUDIT_ENTITY_TYPES.map((t) => ({ value: t, label: AUDIT_ENTITY_LABELS[t] }))}
        />
      </div>

      <AuditEntriesTable
        entries={entries.map((e) => ({
          id: e.id,
          action: e.action,
          actorName: e.actorName,
          actorRole: e.actorRole,
          entityId: e.entityId,
          changes: e.changes,
          createdAt: e.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
