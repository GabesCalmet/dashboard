export function toCsv(rows: Record<string, unknown>[]) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => {
    const str = value == null ? "" : String(value);
    if (/[",\n;]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };
  const lines = [
    headers.join(";"),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(";")),
  ];
  return "﻿" + lines.join("\n");
}

export function csvResponse(filename: string, rows: Record<string, unknown>[]) {
  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
