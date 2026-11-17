import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

// "Relatório Financeiro Mensal" — a dense, spreadsheet-style internal
// document (as opposed to the parent-facing MonthlyReportDocument, which
// is built on the school's branded template images). Every section here
// is just a plain bordered table, since this is meant to be printed/
// archived as a full accounting record of one month, not handed to a
// parent.

const NAVY = "#0B2254";
const GREEN = "#1F9D55";
const RED = "#D64545";
const GRAY = "#6b7280";
const BORDER = "#d9dee8";

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

export type BankAccountTotalRow = {
  label: string;
  received: number;
  spent: number;
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
            {r.map((cell, j) => (
              <Text
                key={j}
                style={[
                  columns[j].align === "right" ? styles.tdRight : styles.td,
                  { width: columns[j].width },
                ]}
              >
                {cell}
              </Text>
            ))}
          </View>
        ))
      )}
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
}: {
  monthLabel: string;
  generatedAt: string;
  summaryColumns: [SummaryColumn, SummaryColumn];
  students: StudentPaymentRow[];
  expenses: ExpenseRow[];
  teacherPayouts: PayoutRow[];
  partnerPayouts: PayoutRow[];
  bankAccountTotals: BankAccountTotalRow[];
}) {
  return (
    <Document title={`Relatório Financeiro — ${monthLabel}`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Relatório Financeiro Mensal</Text>
        <Text style={[styles.subtitle, { textTransform: "capitalize" }]}>{monthLabel}</Text>
        <Text style={styles.generatedAt}>Gerado em {generatedAt}</Text>
        <View style={styles.headerRule} />

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
              <Text style={[styles.th, { width: "34%" }]}>Conta</Text>
              <Text style={[styles.th, { width: "22%", textAlign: "right" }]}>Recebido</Text>
              <Text style={[styles.th, { width: "22%", textAlign: "right" }]}>Gasto</Text>
              <Text style={[styles.th, { width: "22%", textAlign: "right" }]}>Saldo do mês</Text>
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
                  <Text style={[styles.td, { width: "34%" }]}>{b.label}</Text>
                  <Text style={[styles.tdRight, { width: "22%", color: GREEN }]}>{brl(b.received)}</Text>
                  <Text style={[styles.tdRight, { width: "22%", color: RED }]}>{brl(b.spent)}</Text>
                  <Text
                    style={[
                      styles.tdRight,
                      { width: "22%", fontFamily: "Helvetica-Bold", color: saldo >= 0 ? GREEN : RED },
                    ]}
                  >
                    {brl(saldo)}
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
