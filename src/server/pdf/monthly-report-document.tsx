/* eslint-disable jsx-a11y/alt-text -- @react-pdf/renderer's <Image> is a PDF
   drawing primitive, not an HTML <img>; it has no alt prop and PDFs have no
   equivalent accessibility attribute for it. */
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import {
  REPORT_TOP_BASE64,
  REPORT_TABLE_HEADER_BASE64,
  REPORT_BOTTOM_BASE64,
} from "@/server/pdf/report-assets";

// "Relatório Mensal de Aulas" — the parent/student-facing PDF a coordinator
// hands out for one student's month. The header, the Aluno/Período/
// Professor row, the 4 stat cards, "Regras gerais das aulas", and the
// footer are all real crops of the school's own template image (see
// report-assets.ts) rendered full-bleed, with the actual values stamped on
// top at the exact spot the template reserves for them — not redrawn, so
// the match is exact rather than an approximation. The one section that
// can't be a static image is "Detalhamento das aulas": a real month can
// have anywhere from a few lessons to 14, and a fixed-height image sized
// for a handful of example rows would either leave empty space or get
// overflowed — so that table is code-drawn, sized to however many lessons
// this student actually had, flowing naturally between the two real image
// sections. The school redimensioned the template specifically to leave a
// blank band there big enough for ~14 rows on one page (see rowStyleFor
// below for how row height adapts past ~10 rows).
//
// Source template image: 1055×1491px, proportioned to match one A4 page
// exactly (595.28 / 1055 ≈ 0.5642pt per source pixel) so the three crops
// stack up to fill the page height with zero leftover. Every overlay
// coordinate below is a raw pixel position measured directly on that source
// image, converted to PDF points by px().
const SCALE = 595.28 / 1055;
const px = (n: number) => n * SCALE;

const NAVY = "#0B2254";
const ORANGE = "#D4542E";
const GREEN = "#1F9D55";
const RED = "#D64545";
const GRAY = "#6b7280";

// Past this many rows, the table switches to a more compact row style so
// everything (table + the "Regras gerais" bottom image) still fits on one
// page — a typical month has ~10 lessons and never needs this; the compact
// style only kicks in for an unusually busy month, up to the 14-row budget
// the template's blank band was sized for.
const COMPACT_ROW_THRESHOLD = 10;

const styles = StyleSheet.create({
  page: { fontSize: 10, fontFamily: "Helvetica", color: "#1f2937" },
  topWrap: { position: "relative", width: "100%" },
  topImage: { width: "100%" },

  // Each value/number is stamped on top of the template's own placeholder
  // ("[Nome do aluno]", "XX") — a plain Text with a transparent background
  // would just overlap that placeholder rather than replace it, so a
  // solid-color mask (sampled from the template's own box fill) sits
  // underneath every value, sized to fully cover the placeholder first.
  infoMask: { position: "absolute", top: px(330), backgroundColor: "#d5ecfb", height: px(38) },
  infoValue: {
    position: "absolute",
    top: px(337),
    fontSize: 11,
    color: "#1f2937",
  },

  statMask: { position: "absolute", top: px(510), height: px(53) },
  statValue: {
    position: "absolute",
    top: px(519),
    fontFamily: "Helvetica-Bold",
    fontSize: 20,
    color: NAVY,
    textAlign: "center",
  },

  tableHeaderImage: { width: "100%" },

  table: { paddingHorizontal: 0 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  tableRowAlt: { backgroundColor: "#f7fafd" },
  td: { padding: 6, fontSize: 8, color: "#1f2937", textAlign: "center" },
  tdCompact: { padding: 3, fontSize: 7.5 },
  colData: { width: "13%" },
  colHorario: { width: "13%" },
  colStatus: { width: "24%", padding: 4, alignItems: "center", justifyContent: "center" },
  colStatusCompact: { padding: 2 },
  colObs: { width: "50%", textAlign: "left" },
  statusBadge: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    borderRadius: 3,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  statusBadgeCompact: { fontSize: 7, paddingVertical: 1, paddingHorizontal: 5 },

  bottomImage: { width: "100%" },
});

const STATUS_TONE_STYLE: Record<StatusTone, { backgroundColor: string; color: string }> = {
  completed: { backgroundColor: "#e7f7ec", color: GREEN },
  canceled: { backgroundColor: "#fdecec", color: RED },
  makeup: { backgroundColor: "#fff2e3", color: ORANGE },
  neutral: { backgroundColor: "#f3f4f6", color: GRAY },
};

export type StatusTone = "completed" | "canceled" | "makeup" | "neutral";

export type MonthlyReportRow = {
  data: string;
  horario: string;
  status: string;
  statusTone: StatusTone;
  observacoes: string;
};

export function MonthlyReportDocument({
  studentName,
  period,
  teacherName,
  aulasContratadas,
  aulasRealizadas,
  aulasReagendadas,
  aulasExtras,
  rows,
}: {
  studentName: string;
  period: string;
  teacherName: string;
  aulasContratadas: number;
  aulasRealizadas: number;
  aulasReagendadas: number;
  aulasExtras: number;
  rows: MonthlyReportRow[];
}) {
  const compact = rows.length > COMPACT_ROW_THRESHOLD;

  return (
    <Document title={`Relatório Mensal — ${studentName} — ${period}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.topWrap}>
          <Image src={REPORT_TOP_BASE64} style={styles.topImage} />

          <View style={[styles.infoMask, { left: px(143), width: px(229) }]} />
          <Text style={[styles.infoValue, { left: px(148), width: px(220) }]}>{studentName}</Text>

          <View style={[styles.infoMask, { left: px(509), width: px(171) }]} />
          <Text style={[styles.infoValue, { left: px(514), width: px(165) }]}>{period}</Text>

          <View style={[styles.infoMask, { left: px(814), width: px(199) }]} />
          <Text style={[styles.infoValue, { left: px(819), width: px(190) }]}>{teacherName}</Text>

          <View style={[styles.statMask, { left: px(43), width: px(216), backgroundColor: "#d5edfe" }]} />
          <Text style={[styles.statValue, { left: px(43), width: px(216) }]}>{aulasContratadas}</Text>

          <View style={[styles.statMask, { left: px(303), width: px(202), backgroundColor: "#cdf0d2" }]} />
          <Text style={[styles.statValue, { left: px(303), width: px(202) }]}>{aulasRealizadas}</Text>

          <View style={[styles.statMask, { left: px(549), width: px(201), backgroundColor: "#fee8c7" }]} />
          <Text style={[styles.statValue, { left: px(549), width: px(201) }]}>{aulasReagendadas}</Text>

          <View style={[styles.statMask, { left: px(796), width: px(215), backgroundColor: "#d5edfe" }]} />
          <Text style={[styles.statValue, { left: px(796), width: px(215) }]}>{aulasExtras}</Text>
        </View>

        <Image src={REPORT_TABLE_HEADER_BASE64} style={styles.tableHeaderImage} />
        <View style={styles.table}>
          {rows.map((r, i) => (
            <View key={i} style={[styles.tableRow, ...(i % 2 === 1 ? [styles.tableRowAlt] : [])]} wrap={false}>
              <Text style={[styles.td, styles.colData, ...(compact ? [styles.tdCompact] : [])]}>
                {r.data}
              </Text>
              <Text style={[styles.td, styles.colHorario, ...(compact ? [styles.tdCompact] : [])]}>
                {r.horario}
              </Text>
              <View style={[styles.colStatus, ...(compact ? [styles.colStatusCompact] : [])]}>
                <Text
                  style={[
                    styles.statusBadge,
                    STATUS_TONE_STYLE[r.statusTone],
                    ...(compact ? [styles.statusBadgeCompact] : []),
                  ]}
                >
                  {r.status}
                </Text>
              </View>
              <Text style={[styles.td, styles.colObs, ...(compact ? [styles.tdCompact] : [])]}>
                {r.observacoes || "—"}
              </Text>
            </View>
          ))}
          {rows.length === 0 && (
            <View style={styles.tableRow}>
              <Text style={[styles.td, { width: "100%", textAlign: "center", color: GRAY }]}>
                Nenhuma aula registrada neste mês.
              </Text>
            </View>
          )}
        </View>

        <Image src={REPORT_BOTTOM_BASE64} style={styles.bottomImage} />
      </Page>
    </Document>
  );
}
