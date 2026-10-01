import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

// "Relatório Mensal de Aulas" — the parent/student-facing PDF a coordinator
// hands out for one student's month. Built with @react-pdf/renderer (pure
// JS, no headless browser) instead of an HTML-to-PDF route, since this app
// already runs close to Vercel's usage limits and a Chromium-based
// renderer would add real cold-start/bundle weight for what's otherwise a
// simple, mostly-static layout. Colors/layout approximate the school's
// marketing template closely but aren't pixel-identical (no logo/photo
// assets were provided) — swap in real assets later if an exact match
// matters.
const BLUE = "#1a3a6b";
const ORANGE = "#f5821f";
const GREEN = "#1f9d55";
const RED = "#d64545";
const GRAY = "#6b7280";

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1f2937",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    borderBottomWidth: 3,
    borderBottomColor: ORANGE,
    paddingBottom: 12,
    marginBottom: 16,
  },
  logoRow: { flexDirection: "row" },
  logoUp: { fontSize: 20, fontFamily: "Helvetica-Bold", color: BLUE },
  logoFront: { fontSize: 20, fontFamily: "Helvetica-Bold", color: ORANGE },
  logoSub: { fontSize: 8, color: GRAY, letterSpacing: 2, marginTop: 2 },
  titleWrap: { flexDirection: "column", alignItems: "flex-end", maxWidth: 280 },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", color: BLUE, textAlign: "right" },
  subtitle: { fontSize: 8, color: GRAY, marginTop: 3, textAlign: "right" },

  infoRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  infoCard: { flex: 1, backgroundColor: "#f7f9fc", borderRadius: 6, padding: 10 },
  infoLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: BLUE, marginBottom: 4 },
  infoValue: { fontSize: 10, color: "#1f2937" },

  statsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 6, padding: 10, alignItems: "center" },
  statLabel: { fontSize: 7.5, fontFamily: "Helvetica-Bold", textAlign: "center", marginBottom: 6 },
  statValue: { fontSize: 18, fontFamily: "Helvetica-Bold" },

  sectionHeader: {
    backgroundColor: BLUE,
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
  },

  table: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 4 },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#eef2f7",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  th: { padding: 6, fontSize: 8, fontFamily: "Helvetica-Bold", color: BLUE },
  td: { padding: 6, fontSize: 8, color: "#1f2937" },
  colData: { width: "13%" },
  colHorario: { width: "13%" },
  colStatus: { width: "24%", padding: 4, justifyContent: "center" },
  colObs: { width: "50%" },
  statusBadge: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    borderRadius: 3,
    paddingVertical: 2,
    paddingHorizontal: 5,
    alignSelf: "flex-start",
  },

  rulesSection: { marginTop: 18 },
  rulesRow: { flexDirection: "row", gap: 10 },
  ruleCard: { flex: 1, fontSize: 7.5, color: "#374151", lineHeight: 1.4 },
  ruleTitle: { fontFamily: "Helvetica-Bold", color: BLUE, fontSize: 8, marginBottom: 3 },

  footer: {
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 8,
    fontSize: 7.5,
    color: GRAY,
    textAlign: "center",
  },
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
          <View>
            <View style={styles.logoRow}>
              <Text style={styles.logoUp}>UP</Text>
              <Text style={styles.logoFront}>FRONT</Text>
            </View>
            <Text style={styles.logoSub}>IDIOMAS</Text>
          </View>
          <View style={styles.titleWrap}>
            <Text style={styles.title}>RELATÓRIO MENSAL DE AULAS</Text>
            <Text style={styles.subtitle}>
              Acompanhe aqui o resumo das aulas e informações importantes do mês.
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>ALUNO(A)</Text>
            <Text style={styles.infoValue}>{studentName}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>PERÍODO</Text>
            <Text style={[styles.infoValue, { textTransform: "capitalize" }]}>{period}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>PROFESSOR(A)</Text>
            <Text style={styles.infoValue}>{teacherName}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: "#eaf1fb" }]}>
            <Text style={[styles.statLabel, { color: BLUE }]}>AULAS CONTRATADAS</Text>
            <Text style={[styles.statValue, { color: BLUE }]}>{aulasContratadas}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#e7f7ec" }]}>
            <Text style={[styles.statLabel, { color: GREEN }]}>AULAS REALIZADAS</Text>
            <Text style={[styles.statValue, { color: GREEN }]}>{aulasRealizadas}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#fff2e3" }]}>
            <Text style={[styles.statLabel, { color: ORANGE }]}>AULAS REAGENDADAS</Text>
            <Text style={[styles.statValue, { color: ORANGE }]}>{aulasReagendadas}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#eaf1fb" }]}>
            <Text style={[styles.statLabel, { color: BLUE }]}>AULAS EXTRAS</Text>
            <Text style={[styles.statValue, { color: BLUE }]}>{aulasExtras}</Text>
          </View>
        </View>

        <Text style={styles.sectionHeader}>Detalhamento das aulas</Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.th, styles.colData]}>Data</Text>
            <Text style={[styles.th, styles.colHorario]}>Horário</Text>
            <Text style={[styles.th, styles.colStatus]}>Status</Text>
            <Text style={[styles.th, styles.colObs]}>Observações</Text>
          </View>
          {rows.map((r, i) => (
            <View key={i} style={styles.tableRow} wrap={false}>
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
          <Text style={styles.sectionHeader}>Regras gerais das aulas</Text>
          <View style={styles.rulesRow}>
            <View style={styles.ruleCard}>
              <Text style={styles.ruleTitle}>1. Cancelamento de aulas</Text>
              <Text>
                Quando precisar cancelar uma aula, por favor nos avise com no mínimo 4 horas de
                antecedência para dar tempo do(a) professor(a) agendar outro aluno no lugar. Com o
                aviso dentro desse prazo, a aula poderá ser reagendada para outro dia ou horário.
              </Text>
            </View>
            <View style={styles.ruleCard}>
              <Text style={styles.ruleTitle}>2. Aulas contratadas e aulas extras</Text>
              <Text>
                O(a) aluno(a) terá direito a todas as aulas contratadas para o mês. Em alguns
                meses, poderá haver aulas extras para compensar: feriados, reposições de aulas e
                períodos de férias do(a) aluno(a).
              </Text>
            </View>
            <View style={styles.ruleCard}>
              <Text style={styles.ruleTitle}>3. Prazo para reposições</Text>
              <Text>
                As reposições de aulas devem ser realizadas em um prazo máximo de 30 dias, para não
                acumular. Após o reagendamento, a aula não poderá ser reagendada novamente.
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.footer}>
          Dúvidas ou precisa reagendar uma aula? Entre em contato conosco o quanto antes. Assim
          conseguimos verificar a disponibilidade do(a) professor(a) e encontrar o melhor horário
          para a reposição.
        </Text>
      </Page>
    </Document>
  );
}
