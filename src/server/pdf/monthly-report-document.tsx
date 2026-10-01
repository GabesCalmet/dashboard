/* eslint-disable jsx-a11y/alt-text -- @react-pdf/renderer's <Image> is a PDF
   drawing primitive, not an HTML <img>; it has no alt prop and PDFs have no
   equivalent accessibility attribute for it. */
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import {
  LOGO_BASE64,
  BIG_BEN_BASE64,
  ICON_ALUNO_BASE64,
  ICON_PERIODO_BASE64,
  ICON_PROFESSOR_BASE64,
  ICON_CONTRATADAS_BASE64,
  ICON_REALIZADAS_BASE64,
  ICON_REAGENDADAS_BASE64,
  ICON_EXTRAS_BASE64,
  ICON_DETALHAMENTO_HEADER_BASE64,
  ICON_REGRAS_HEADER_BASE64,
  ICON_FOOTER_CHAT_BASE64,
  ICON_FOOTER_PLANE_BASE64,
} from "@/server/pdf/report-assets";

// "Relatório Mensal de Aulas" — the parent/student-facing PDF a coordinator
// hands out for one student's month. Built with @react-pdf/renderer (pure
// JS, no headless browser) instead of an HTML-to-PDF route, since this app
// already runs close to Vercel's usage limits and a Chromium-based
// renderer would add real cold-start/bundle weight for what's otherwise a
// simple, mostly-static layout. The logo, header photo, and every icon
// badge are real crops taken directly from the school's own marketing
// template (see report-assets.ts) — not redrawn — so the match is close
// to exact rather than an approximation.
const NAVY = "#0B2254";
const BLUE = "#0F6FE0";
const ORANGE = "#D4542E";
const GREEN = "#1F9D55";
const RED = "#D64545";
const GRAY = "#6b7280";

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 10, fontFamily: "Helvetica", color: "#1f2937" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    borderBottomWidth: 3,
    borderBottomColor: ORANGE,
    paddingBottom: 10,
  },
  logo: { width: 64, height: 64, marginRight: 10 },
  headerDivider: { width: 1, height: 56, backgroundColor: "#d7dee8", marginRight: 10 },
  titleBlock: { flex: 1 },
  title: { fontSize: 17, fontFamily: "Helvetica-Bold", color: NAVY, lineHeight: 1.1 },
  titleAccent: { color: BLUE },
  subtitle: { fontSize: 7.5, color: GRAY, marginTop: 4, maxWidth: 260 },
  bigBen: { width: 110, height: 70, borderRadius: 6, marginLeft: 10 },

  infoCard: {
    flexDirection: "row",
    backgroundColor: "#f7f9fc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  infoCol: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  infoDivider: { width: 1, backgroundColor: "#dbe2ec", marginHorizontal: 8 },
  infoIcon: { width: 28, height: 28 },
  infoTextCol: { flex: 1 },
  infoLabel: { fontSize: 9, fontFamily: "Helvetica-Bold", color: NAVY, marginBottom: 3 },
  infoValueBox: {
    backgroundColor: "#eaf2fc",
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  infoValue: { fontSize: 9, color: "#1f2937" },

  statsRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  statCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e8ecf2",
    borderBottomWidth: 3,
    borderRadius: 8,
    alignItems: "center",
    padding: 8,
  },
  statIcon: { width: 32, height: 32, marginBottom: 5 },
  statLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    textAlign: "center",
    marginBottom: 6,
  },
  statValueBox: { borderRadius: 4, paddingVertical: 3, width: "100%", alignItems: "center" },
  statValue: { fontSize: 15, fontFamily: "Helvetica-Bold" },

  sectionHeader: {
    backgroundColor: NAVY,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  sectionHeaderIcon: { width: 20, height: 20 },
  sectionHeaderText: { color: "#ffffff", fontFamily: "Helvetica-Bold", fontSize: 11 },

  table: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 4, marginBottom: 16 },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#eef2f7",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  tableRowAlt: { backgroundColor: "#f7fafd" },
  th: { padding: 6, fontSize: 8, fontFamily: "Helvetica-Bold", color: NAVY, textAlign: "center" },
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

  rulesSection: { marginBottom: 16 },
  rulesBody: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderTopWidth: 0,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    padding: 10,
  },
  ruleCard: { flex: 1 },
  ruleHeaderRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 5 },
  ruleNumber: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: ORANGE,
    color: "#ffffff",
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    paddingTop: 3,
  },
  ruleTitle: { fontFamily: "Helvetica-Bold", color: NAVY, fontSize: 8 },
  ruleText: { fontSize: 7.5, color: "#374151", lineHeight: 1.4 },
  ruleDivider: { width: 1, backgroundColor: "#e5e7eb", marginHorizontal: 10 },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 10,
    gap: 10,
  },
  footerIcon: { width: 36, height: 36 },
  footerTextCol: { flex: 1 },
  footerTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: NAVY, marginBottom: 3 },
  footerBody: { fontSize: 7.5, color: "#374151", lineHeight: 1.4 },
  footerPlane: { width: 26, height: 26 },
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
        <View style={styles.header}>
          <Image src={LOGO_BASE64} style={styles.logo} />
          <View style={styles.headerDivider} />
          <View style={styles.titleBlock}>
            <Text style={styles.title}>
              RELATÓRIO <Text style={styles.titleAccent}>MENSAL</Text>
            </Text>
            <Text style={styles.title}>DE AULAS</Text>
            <Text style={styles.subtitle}>
              Acompanhe aqui o resumo das aulas e informações importantes do mês.
            </Text>
          </View>
          <Image src={BIG_BEN_BASE64} style={styles.bigBen} />
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoCol}>
            <Image src={ICON_ALUNO_BASE64} style={styles.infoIcon} />
            <View style={styles.infoTextCol}>
              <Text style={styles.infoLabel}>ALUNO(A)</Text>
              <View style={styles.infoValueBox}>
                <Text style={styles.infoValue}>{studentName}</Text>
              </View>
            </View>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoCol}>
            <Image src={ICON_PERIODO_BASE64} style={styles.infoIcon} />
            <View style={styles.infoTextCol}>
              <Text style={styles.infoLabel}>PERÍODO</Text>
              <View style={styles.infoValueBox}>
                <Text style={[styles.infoValue, { textTransform: "capitalize" }]}>{period}</Text>
              </View>
            </View>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoCol}>
            <Image src={ICON_PROFESSOR_BASE64} style={styles.infoIcon} />
            <View style={styles.infoTextCol}>
              <Text style={styles.infoLabel}>PROFESSOR(A)</Text>
              <View style={styles.infoValueBox}>
                <Text style={styles.infoValue}>{teacherName}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderBottomColor: BLUE }]}>
            <Image src={ICON_CONTRATADAS_BASE64} style={styles.statIcon} />
            <Text style={styles.statLabel}>AULAS{"\n"}CONTRATADAS</Text>
            <View style={[styles.statValueBox, { backgroundColor: "#eaf2fc" }]}>
              <Text style={[styles.statValue, { color: BLUE }]}>{aulasContratadas}</Text>
            </View>
          </View>
          <View style={[styles.statCard, { borderBottomColor: GREEN }]}>
            <Image src={ICON_REALIZADAS_BASE64} style={styles.statIcon} />
            <Text style={styles.statLabel}>AULAS{"\n"}REALIZADAS</Text>
            <View style={[styles.statValueBox, { backgroundColor: "#e7f7ec" }]}>
              <Text style={[styles.statValue, { color: GREEN }]}>{aulasRealizadas}</Text>
            </View>
          </View>
          <View style={[styles.statCard, { borderBottomColor: ORANGE }]}>
            <Image src={ICON_REAGENDADAS_BASE64} style={styles.statIcon} />
            <Text style={styles.statLabel}>AULAS{"\n"}REAGENDADAS</Text>
            <View style={[styles.statValueBox, { backgroundColor: "#fff2e3" }]}>
              <Text style={[styles.statValue, { color: ORANGE }]}>{aulasReagendadas}</Text>
            </View>
          </View>
          <View style={[styles.statCard, { borderBottomColor: BLUE }]}>
            <Image src={ICON_EXTRAS_BASE64} style={styles.statIcon} />
            <Text style={styles.statLabel}>AULAS{"\n"}EXTRAS</Text>
            <View style={[styles.statValueBox, { backgroundColor: "#eaf2fc" }]}>
              <Text style={[styles.statValue, { color: BLUE }]}>{aulasExtras}</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Image src={ICON_DETALHAMENTO_HEADER_BASE64} style={styles.sectionHeaderIcon} />
          <Text style={styles.sectionHeaderText}>Detalhamento das aulas</Text>
        </View>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.th, styles.colData]}>Data</Text>
            <Text style={[styles.th, styles.colHorario]}>Horário</Text>
            <Text style={[styles.th, styles.colStatus]}>Status</Text>
            <Text style={[styles.th, styles.colObs]}>Observações</Text>
          </View>
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

        <View style={styles.rulesSection}>
          <View style={styles.sectionHeader}>
            <Image src={ICON_REGRAS_HEADER_BASE64} style={styles.sectionHeaderIcon} />
            <Text style={styles.sectionHeaderText}>Regras gerais das aulas</Text>
          </View>
          <View style={styles.rulesBody}>
            <View style={styles.ruleCard}>
              <View style={styles.ruleHeaderRow}>
                <Text style={styles.ruleNumber}>1</Text>
                <Text style={styles.ruleTitle}>Cancelamento de aulas</Text>
              </View>
              <Text style={styles.ruleText}>
                Quando precisar cancelar uma aula, por favor nos avise com no mínimo 4 horas de
                antecedência para dar tempo do(a) professor(a) agendar outro aluno no lugar. Com o
                aviso dentro desse prazo, a aula poderá ser reagendada para outro dia ou horário.
              </Text>
            </View>
            <View style={styles.ruleDivider} />
            <View style={styles.ruleCard}>
              <View style={styles.ruleHeaderRow}>
                <Text style={styles.ruleNumber}>2</Text>
                <Text style={styles.ruleTitle}>Aulas contratadas e extras</Text>
              </View>
              <Text style={styles.ruleText}>
                O(a) aluno(a) terá direito a todas as aulas contratadas para o mês. Em alguns
                meses, poderá haver aulas extras para compensar: feriados, reposições de aulas e
                períodos de férias do(a) aluno(a).
              </Text>
            </View>
            <View style={styles.ruleDivider} />
            <View style={styles.ruleCard}>
              <View style={styles.ruleHeaderRow}>
                <Text style={styles.ruleNumber}>3</Text>
                <Text style={styles.ruleTitle}>Prazo para reposições</Text>
              </View>
              <Text style={styles.ruleText}>
                As reposições de aulas devem ser realizadas em um prazo máximo de 30 dias, para não
                acumular. Após o reagendamento, a aula não poderá ser reagendada novamente.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Image src={ICON_FOOTER_CHAT_BASE64} style={styles.footerIcon} />
          <View style={styles.footerTextCol}>
            <Text style={styles.footerTitle}>Dúvidas ou precisa reagendar uma aula?</Text>
            <Text style={styles.footerBody}>
              Entre em contato conosco o quanto antes. Assim conseguimos verificar a
              disponibilidade do(a) professor(a) e encontrar o melhor horário para a reposição.
            </Text>
          </View>
          <Image src={ICON_FOOTER_PLANE_BASE64} style={styles.footerPlane} />
        </View>
      </Page>
    </Document>
  );
}
