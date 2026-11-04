import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { recordAudit } from "@/server/audit";
import { buildJsonBackup, buildCsvZipBackup } from "@/server/backup";

// Manual, on-demand full-database export for disaster-recovery purposes —
// every table except login credentials (User.passwordEncrypted is left
// out on purpose, see src/server/backup.ts). Admin-only; a Route Handler
// rather than a server action since this needs to stream back a file with
// its own Content-Disposition header, not an action's { success } shape.
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso negado" }, { status: user ? 403 : 401 });
  }

  const format = request.nextUrl.searchParams.get("format") === "csv" ? "csv" : "json";
  const stamp = new Date().toISOString().slice(0, 10);

  await recordAudit({
    entityType: "Backup",
    entityId: user.id,
    action: "CREATE",
    actor: user,
    changes: { format },
  });

  if (format === "csv") {
    const zip = await buildCsvZipBackup();
    return new NextResponse(new Uint8Array(zip), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="backup-upfront-${stamp}.zip"`,
      },
    });
  }

  const json = await buildJsonBackup();
  return new NextResponse(json, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="backup-upfront-${stamp}.json"`,
    },
  });
}
