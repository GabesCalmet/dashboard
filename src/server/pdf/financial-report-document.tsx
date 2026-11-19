import { Document, Page, View, Text, StyleSheet, Svg, Path } from "@react-pdf/renderer";
import type { ChargeCategory } from "@prisma/client";

// "Relatório Financeiro Mensal" — a dense, spreadsheet-style internal
// document (as opposed to the parent-facing MonthlyReportDocument, which
// is built on the school's branded template images). Every section here
// is just a plain bordered table, since this is meant to be printed/
// archived as a full accounting record of one month, not handed to a
// parent.

const NAVY = "#0B2254";
const GREEN = "#1F9D55";
const RED = "#D64545";
const YELLOW = "#D97706";
const GRAY = "#6b7280";
const BORDER = "#d9dee8";

// Colors the "Status" column by its label — Pago/Pausado/Pendente — across
// every table in this report. Any other status (e.g. Atrasado) keeps the
// default text color.
function statusColor(label: string): string | undefined {
  if (label === "Pago") return GREEN;
  if (label === "Pausado") return YELLOW;
  if (label === "Pendente") return RED;
  return undefined;
}

// A print-safe parallel to the app's own chart-1..5 ramp (CSS variables
// don't exist in a PDF) — same fixed category->slot order as
// CategoryPieChart on the Financeiro page. "Sem categoria" gets a light
// neutral, distinct from Standard's own neutral.
const CATEGORY_COLOR: Record<ChargeCategory, string> = {
  STANDARD: "#9CA3AF",
  BRONZE: "#B45309",
  SILVER: "#64748B",
  GOLD: "#EAB308",
  PREMIUM: "#7C3AED",
};
const NONE_CATEGORY_COLOR = "#D1D5DB";

const styles = StyleSheet.create({
  page: { fontSize: 9, fontFamily: "Helvetica", color: "#1f2937", padding: 28 },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", color: NAVY },
  subtitle: { fontSize: 10, color: GRAY, marginTop: 2 },
  generatedAt: { fontSize: 8, color: GRAY, marginTop: 4 },
  headerRule: { borderBottomWidth: 2, borderBottomColor: NAVY, marginTop: 10, marginBottom: 14 },

  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingBottom: 4,
    marginBottom: 6,
  },
  section: { marginBottom: 16 },

  table: { borderWidth: 1, borderColor: BORDER },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BORDER },
  trLast: { flexDirection: "row" },
  trAlt: { backgroundColor: "#f7fafd" },
  thRow: { flexDirection: "row", backgroundColor: "#eef1f8" },
  th: { padding: 5, fontSize: 8, fontFamily: "Helvetica-Bold", color: NAVY },
  td: { padding: 5, fontSize: 8.5 },
  tdRight: { padding: 5, fontSize: 8.5, textAlign: "right" },
  tdMuted: { padding: 5, fontSize: 8.5, color: GRAY },
  empty: { padding: 8, fontSize: 8.5, color: GRAY, textAlign: "center" },

  totalsRow: { flexDirection: "row", backgroundColor: "#eef1f8" },
  totalsLabel: { padding: 5, fontSize: 8.5, fontFamily: "Helvetica-Bold" },
  totalsValue: { padding: 5, fontSize: 8.5, fontFamily: "Helvetica-Bold", textAlign: "right" },

  summaryGrid: { flexDirection: "row", gap: 16 },
  summaryCol: { flex: 1 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3.5,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f2f7",
  },
  summaryLabel: { fontSize: 8.5, color: "#374151" },
  summaryValue: { fontSize: 9, fontFamily: "Helvetica-Bold" },

  categorySplit: { flexDirection: "row", gap: 24 },
  categoryPieCol: { flex: 1, flexDirection: "row", alignItems: "center", gap: 16 },
  categoryLegend: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 10 },
  categoryItem: { flexDirection: "row", alignItems: "center", gap: 5, width: "46%" },
  categorySwatch: { width: 8, height: 8, borderRadius: 2 },
  categoryLabel: { fontSize: 8.5, fontFamily: "Helvetica-Bold" },

  categoryBarsCol: { flex: 1 },
  categoryBarsHeading: { fontSize: 9, fontFamily: "Helvetica-Bold", color: NAVY, textAlign: "center", marginBottom: 10 },
  barsContainer: { flexDirection: "row", alignItems: "flex-end", justifyContent: "center", height: 90, gap: 12 },
  barColumn: { flexDirection: "column", alignItems: "center", justifyContent: "flex-end" },
  barValue: { fontSize: 6.5, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  barRect: { width: 16, borderRadius: 2 },
});

function brl(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export type SummaryColumn = {
  heading: string;
  rows: { label: string; value: number; tone?: "green" | "red" | "normal" }[];
};

export type StudentPaymentRow = {
  studentName: string;
  amount: number;
  statusLabel: string;
  dueDate: string;
  paidAt: string;
  bankAccountLabel: string;
};

export type ExpenseRow = {
  description: string;
  categoryLabel: string;
  amount: number;
  bankAccountLabel: string;
  statusLabel: string;
};

export type PayoutRow = {
  name: string;
  amount: number;
  bankAccountLabel: string;
  date: string;
};

export type CategoryBreakdownRow = {
  category: ChargeCategory | null;
  label: string;
  studentCount: number;
  avgProfit: number;
};

export type BankAccountTotalRow = {
  label: string;
  received: number;
  spent: number;
  // Cumulative balance for this account as of the end of the viewed
  // month — "Saldo total atual", distinct from "Saldo do mês" (this
  // month's own received/spent movement).
  totalBalance: number;
};

function toneColor(tone?: "green" | "red" | "normal") {
  if (tone === "green") return GREEN;
  if (tone === "red") return RED;
  return "#1f2937";
}

function Table({
  columns,
  rows,
  emptyLabel,
}: {
  columns: { label: string; width: string; align?: "left" | "right" }[];
  rows: string[][];
  emptyLabel: string;
}) {
  return (
    <View style={styles.table}>
      <View style={styles.thRow}>
        {columns.map((c, i) => (
          <Text key={i} style={[styles.th, { width: c.width, textAlign: c.align ?? "left" }]}>
            {c.label}
          </Text>
        ))}
      </View>
      {rows.length === 0 ? (
        <Text style={styles.empty}>{emptyLabel}</Text>
      ) : (
        rows.map((r, i) => (
          <View key={i} style={[i % 2 === 1 ? styles.trAlt : {}, i === rows.length - 1 ? styles.trLast : styles.tr]}>
            {r.map((cell, j) => {
              const color = columns[j].label === "Status" ? statusColor(cell) : undefined;
              return (
                <Text
                  key={j}
                  style={[
                    columns[j].align === "right" ? styles.tdRight : styles.td,
                    { width: columns[j].width },
                    color ? { color, fontFamily: "Helvetica-Bold" } : {},
                  ]}
                >
                  {cell}
                </Text>
              );
            })}
          </View>
        ))
      )}
    </View>
  );
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return ["M", cx, cy, "L", start.x, start.y, "A", r, r, 0, largeArcFlag, 0, end.x, end.y, "Z"].join(" ");
}

// Hand-drawn pie (react-pdf has no chart primitive) — one slice per
// category with students this month, ordered the same way the cards
// below it are. A single 100%-share category draws as a full circle
// instead of a degenerate zero-length arc.
function CategoryPie({ rows }: { rows: CategoryBreakdownRow[] }) {
  const total = rows.reduce((sum, r) => sum + r.studentCount, 0);
  if (total === 0) return null;

  const cx = 45;
  const cy = 45;
  const r = 42;
  const slices = rows
    .filter((row) => row.studentCount > 0)
    .reduce<{ color: string; startAngle: number; endAngle: number }[]>((acc, row) => {
      const startAngle = acc.length > 0 ? acc[acc.length - 1].endAngle : 0;
      const sweep = (row.studentCount / total) * 360;
      acc.push({
        color: row.category ? CATEGORY_COLOR[row.category] : NONE_CATEGORY_COLOR,
        startAngle,
        endAngle: startAngle + sweep,
      });
      return acc;
    }, []);

  return (
    <Svg width={90} height={90} viewBox="0 0 90 90">
      {slices.map((s, i) =>
        s.endAngle - s.startAngle >= 359.99 ? (
          <Path
            key={i}
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`}
            fill={s.color}
          />
        ) : (
          <Path key={i} d={describeArc(cx, cy, r, s.startAngle, s.endAngle)} fill={s.color} />
        )
      )}
    </Svg>
  );
}

const MAX_BAR_HEIGHT = 90;

// Simple hand-drawn bar chart (react-pdf has no chart primitive, same as
// CategoryPie) comparing average profit across tiers — mirrors the web
// page's own CategoryProfitChart. No tier names under the bars; identity
// is already carried by the matching colors in the pie's legend beside it.
function CategoryProfitBars({ rows }: { rows: CategoryBreakdownRow[] }) {
  const maxProfit = Math.max(...rows.map((r) => r.avgProfit), 0);
  if (maxProfit <= 0) return null;

  return (
    <View style={styles.barsContainer}>
      {rows.map((r, i) => {
        const height = Math.max(2, (r.avgProfit / maxProfit) * MAX_BAR_HEIGHT);
        const color = r.category ? CATEGORY_COLOR[r.category] : NONE_CATEGORY_COLOR;
        return (
          <View key={i} style={styles.barColumn}>
            <Text style={styles.barValue}>{brl(r.avgProfit)}</Text>
            <View style={[styles.barRect, { height, backgroundColor: color }]} />
          </View>
        );
      })}
    </View>
  );
}

export function FinancialReportDocument({
  monthLabel,
  generatedAt,
  summaryColumns,
  students,
  expenses,
  teacherPayouts,
  partnerPayouts,
  bankAccountTotals,
  categoryBreakdown,
}: {
  monthLabel: string;
  generatedAt: string;
  summaryColumns: [SummaryColumn, SummaryColumn];
  students: StudentPaymentRow[];
  expenses: ExpenseRow[];
  teacherPayouts: PayoutRow[];
  partnerPayouts: PayoutRow[];
  bankAccountTotals: BankAccountTotalRow[];
  categoryBreakdown: CategoryBreakdownRow[];
}) {
  return (
    <Document title={`Relatório Financeiro — ${monthLabel}`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Relatório Financeiro Mensal</Text>
        <Text style={[styles.subtitle, { textTransform: "capitalize" }]}>{monthLabel}</Text>
        <Text style={styles.generatedAt}>Gerado em {generatedAt}</Text>
        <View style={styles.headerRule} />

        {categoryBreakdown.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Alunos por categoria</Text>
            <View style={styles.categorySplit}>
              <View style={styles.categoryPieCol}>
                <CategoryPie rows={categoryBreakdown} />
                <View style={styles.categoryLegend}>
                  {categoryBreakdown.map((r, i) => (
                    <View key={i} style={styles.categoryItem}>
                      <View
                        style={[
                          styles.categorySwatch,
                          { backgroundColor: r.category ? CATEGORY_COLOR[r.category] : NONE_CATEGORY_COLOR },
                        ]}
                      />
                      <Text style={styles.categoryLabel}>
                        {r.label} — {r.studentCount} {r.studentCount === 1 ? "aluno" : "alunos"}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
              <View style={styles.categoryBarsCol}>
                <Text style={styles.categoryBarsHeading}>Lucro médio por categoria</Text>
                <CategoryProfitBars rows={categoryBreakdown} />
              </View>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumo do mês</Text>
          <View style={styles.summaryGrid}>
            {summaryColumns.map((col, i) => (
              <View key={i} style={styles.summaryCol}>
                <Text style={[styles.sectionTitle, { fontSize: 9, borderBottomWidth: 0, marginBottom: 4 }]}>
                  {col.heading}
                </Text>
                {col.rows.map((r, j) => (
                  <View key={j} style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>{r.label}</Text>
                    <Text style={[styles.summaryValue, { color: toneColor(r.tone) }]}>{brl(r.value)}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alunos e pagamentos</Text>
          <Table
            columns={[
              { label: "Aluno", width: "28%" },
              { label: "Valor", width: "13%", align: "right" },
              { label: "Status", width: "13%" },
              { label: "Vencimento", width: "14%" },
              { label: "Pago em", width: "14%" },
              { label: "Conta", width: "18%" },
            ]}
            rows={students.map((s) => [
              s.studentName,
              brl(s.amount),
              s.statusLabel,
              s.dueDate,
              s.paidAt,
              s.bankAccountLabel,
            ])}
            emptyLabel="Nenhum pagamento neste mês."
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gastos do mês</Text>
          <Table
            columns={[
              { label: "Descrição", width: "34%" },
              { label: "Categoria", width: "18%" },
              { label: "Valor", width: "14%", align: "right" },
              { label: "Conta", width: "18%" },
              { label: "Status", width: "16%" },
            ]}
            rows={expenses.map((e) => [e.description, e.categoryLabel, brl(e.amount), e.bankAccountLabel, e.statusLabel])}
            emptyLabel="Nenhum gasto neste mês."
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pagamentos a professores</Text>
          <Table
            columns={[
              { label: "Professor", width: "40%" },
              { label: "Valor", width: "20%", align: "right" },
              { label: "Conta", width: "20%" },
              { label: "Data", width: "20%" },
            ]}
            rows={teacherPayouts.map((p) => [p.name, brl(p.amount), p.bankAccountLabel, p.date])}
            emptyLabel="Nenhum pagamento a professores registrado neste mês."
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pagamentos a parceiros</Text>
          <Table
            columns={[
              { label: "Parceiro", width: "40%" },
              { label: "Valor", width: "20%", align: "right" },
              { label: "Conta", width: "20%" },
              { label: "Data", width: "20%" },
            ]}
            rows={partnerPayouts.map((p) => [p.name, brl(p.amount), p.bankAccountLabel, p.date])}
            emptyLabel="Nenhum pagamento a parceiros registrado neste mês."
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Totais por conta bancária (no mês)</Text>
          <View style={styles.table}>
            <View style={styles.thRow}>
              <Text style={[styles.th, { width: "26%" }]}>Conta</Text>
              <Text style={[styles.th, { width: "18%", textAlign: "right" }]}>Recebido</Text>
              <Text style={[styles.th, { width: "18%", textAlign: "right" }]}>Gasto</Text>
              <Text style={[styles.th, { width: "18%", textAlign: "right" }]}>Saldo do mês</Text>
              <Text style={[styles.th, { width: "20%", textAlign: "right" }]}>Saldo total atual</Text>
            </View>
            {bankAccountTotals.map((b, i) => {
              const saldo = b.received - b.spent;
              return (
                <View
                  key={i}
                  style={[
                    i % 2 === 1 ? styles.trAlt : {},
                    i === bankAccountTotals.length - 1 ? styles.trLast : styles.tr,
                  ]}
                >
                  <Text style={[styles.td, { width: "26%" }]}>{b.label}</Text>
                  <Text style={[styles.tdRight, { width: "18%", color: GREEN }]}>{brl(b.received)}</Text>
                  <Text style={[styles.tdRight, { width: "18%", color: RED }]}>{brl(b.spent)}</Text>
                  <Text
                    style={[
                      styles.tdRight,
                      { width: "18%", fontFamily: "Helvetica-Bold", color: saldo >= 0 ? GREEN : RED },
                    ]}
                  >
                    {brl(saldo)}
                  </Text>
                  <Text
                    style={[
                      styles.tdRight,
                      { width: "20%", fontFamily: "Helvetica-Bold", color: b.totalBalance >= 0 ? GREEN : RED },
                    ]}
                  >
                    {brl(b.totalBalance)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </Page>
    </Document>
  );
}
