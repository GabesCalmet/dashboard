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
// have anywhere from a few lessons to 15+, and a fixed-height image sized
// for "5 example rows" would either leave empty space or get overflowed —
// so that table is code-drawn, sized to however many lessons this student
// actually had, flowing naturally between the two real image sections.
//
// Original template image: 1024×1536px. Top crop is 1024×685, displayed
// at the page's full width (595.28pt for A4 with 0 padding) — every
// overlay coordinate below is that crop's own pixel position × the same
// scale factor (595.28 / 1024 ≈ 0.5813).
const SCALE = 595.28 / 1024;
const px = (n: number) => n * SCALE;

const NAVY = "#0B2254";
const ORANGE = "#D4542E";
const GREEN = "#1F9D55";
const RED = "#D64545";
const GRAY = "#6b7280";

const styles = StyleSheet.create({
  page: { fontSize: 10, fontFamily: "Helvetica", color: "#1f2937" },
  topWrap: { position: "relative", width: "100%" },
  topImage: { width: "100%" },

  // Each value/number is stamped on top of the template's own placeholder
  // ("[Nome do aluno]", "XX") — a plain Text with a transparent background
  // would just overlap that placeholder rather than replace it, so a
  // solid-color mask (sampled from the template's own box fill) sits
  // underneath every value, sized to fully cover the placeholder first.
  infoMask: { position: "absolute", top: px(391), backgroundColor: "#dff0fa", height: px(36) },
  infoValue: {
    position: "absolute",
    top: px(398),
    fontSize: 11,
    color: "#1f2937",
  },

  statMask: { position: "absolute", top: px(604), height: px(68) },
  statValue: {
    position: "absolute",
    top: px(615),
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
  colData: { width: "13%" },
  colHorario: { width: "13%" },
  colStatus: { width: "24%", padding: 4, alignItems: "center", justifyContent: "center" },
  colObs: { width: "50%", textAlign: "left" },
  statusBadge: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    borderRadius: 3,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },

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
  return (
    <Document title={`Relatório Mensal — ${studentName} — ${period}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.topWrap}>
          <Image src={REPORT_TOP_BASE64} style={styles.topImage} />

          <View style={[styles.infoMask, { left: px(158), width: px(217) }]} />
          <Text style={[styles.infoValue, { left: px(163), width: px(210) }]}>{studentName}</Text>

          <View style={[styles.infoMask, { left: px(478), width: px(197) }]} />
          <Text style={[styles.infoValue, { left: px(483), width: px(190) }]}>{period}</Text>

          <View style={[styles.infoMask, { left: px(798), width: px(197) }]} />
          <Text style={[styles.infoValue, { left: px(833), width: px(160) }]}>{teacherName}</Text>

          <View style={[styles.statMask, { left: px(30), width: px(235), backgroundColor: "#e0f0ff" }]} />
          <Text style={[styles.statValue, { left: px(30), width: px(235) }]}>
            {aulasContratadas}
          </Text>

          <View style={[styles.statMask, { left: px(275), width: px(235), backgroundColor: "#ceefd2" }]} />
          <Text style={[styles.statValue, { left: px(275), width: px(235) }]}>
            {aulasRealizadas}
          </Text>

          <View style={[styles.statMask, { left: px(520), width: px(235), backgroundColor: "#ffe9c2" }]} />
          <Text style={[styles.statValue, { left: px(520), width: px(235) }]}>
            {aulasReagendadas}
          </Text>

          <View style={[styles.statMask, { left: px(765), width: px(230), backgroundColor: "#def1f8" }]} />
          <Text style={[styles.statValue, { left: px(765), width: px(230) }]}>{aulasExtras}</Text>
        </View>

        <Image src={REPORT_TABLE_HEADER_BASE64} style={styles.tableHeaderImage} />
        <View style={styles.table}>
          {rows.map((r, i) => (
            <View key={i} style={[styles.tableRow, ...(i % 2 === 1 ? [styles.tableRowAlt] : [])]} wrap={false}>
              <Text style={[styles.td, styles.colData]}>{r.data}</Text>
              <Text style={[styles.td, styles.colHorario]}>{r.horario}</Text>
              <View style={styles.colStatus}>
                <Text style={[styles.statusBadge, STATUS_TONE_STYLE[r.statusTone]]}>{r.status}</Text>
              </View>
              <Text style={[styles.td, styles.colObs]}>{r.observacoes || "—"}</Text>
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
