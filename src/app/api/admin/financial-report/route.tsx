import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { brazilToday } from "@/lib/timezone";
import {
  bankAccountLabel,
  expenseCategoryLabel,
  paymentStatusLabel,
  formatCalendarDate,
} from "@/lib/labels";
import { getFinancialSummary, getFinancialOverview } from "@/server/queries/financial";
import { listExpensesForMonth } from "@/server/queries/expenses";
import { getTeacherPayoutEntriesByTeacher, getPartnerPayoutEntries } from "@/server/queries/payouts";
import {
  FinancialReportDocument,
  type StudentPaymentRow,
  type ExpenseRow,
  type PayoutRow,
  type BankAccountTotalRow,
} from "@/server/pdf/financial-report-document";

// Full "Relatório Financeiro Mensal" PDF — a dense, spreadsheet-style
// internal document consolidating everything already shown across
// Financeiro/Receita/Gastos/Pagamento de professores/Parceiros for one
// month into a single printable/archivable file. Admin/coordinator only,
// same auth pattern as the student monthly report.
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "COORDINATOR")) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const now = new Date();
  const yearParam = request.nextUrl.searchParams.get("year");
  const monthParam = request.nextUrl.searchParams.get("month");
  const year = yearParam ? Number(yearParam) : now.getFullYear();
  const month = monthParam ? Number(monthParam) : now.getMonth();
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 0 || month > 11) {
    return NextResponse.json({ error: "Mês inválido" }, { status: 400 });
  }

  const [summary, overview, expenses, teacherPayoutsByTeacher, joePayouts, gabrielPayouts] =
    await Promise.all([
      getFinancialSummary(year, month),
      getFinancialOverview(year, month),
      listExpensesForMonth(year, month),
      getTeacherPayoutEntriesByTeacher(year, month),
      getPartnerPayoutEntries("PARTNER_JOE", year, month),
      getPartnerPayoutEntries("PARTNER_GABRIEL", year, month),
    ]);

  const teacherIds = [...teacherPayoutsByTeacher.keys()];
  const teachers = teacherIds.length
    ? await prisma.teacherProfile.findMany({
        where: { id: { in: teacherIds } },
        include: { user: true },
      })
    : [];
  const teacherNameById = new Map(teachers.map((t) => [t.id, t.user.name]));

  const students: StudentPaymentRow[] = overview.payments.map((p) => ({
    studentName: p.studentName,
    amount: p.amount,
    statusLabel: paymentStatusLabel[p.status],
    dueDate: formatCalendarDate(p.dueDate),
    paidAt: p.paidAt ? formatCalendarDate(p.paidAt) : "—",
    bankAccountLabel: bankAccountLabel[p.bankAccount],
  }));

  const expenseRows: ExpenseRow[] = expenses.map((e) => ({
    description: e.description,
    categoryLabel: expenseCategoryLabel[e.category],
    amount: e.effectiveAmount,
    bankAccountLabel: bankAccountLabel[e.effectiveBankAccount],
    statusLabel: paymentStatusLabel[e.occurrenceStatus],
  }));

  const teacherPayoutRows: PayoutRow[] = [...teacherPayoutsByTeacher.entries()]
    .flatMap(([teacherId, entries]) =>
      entries.map((p) => ({
        name: teacherNameById.get(teacherId) ?? "—",
        amount: Number(p.amount),
        bankAccountLabel: bankAccountLabel[p.bankAccount],
        date: formatCalendarDate(p.paidAt),
      }))
    )
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  const partnerPayoutRows: PayoutRow[] = [
    ...joePayouts.map((p) => ({
      name: "Joe",
      amount: Number(p.amount),
      bankAccountLabel: bankAccountLabel[p.bankAccount],
      date: formatCalendarDate(p.paidAt),
    })),
    ...gabrielPayouts.map((p) => ({
      name: "Gabriel",
      amount: Number(p.amount),
      bankAccountLabel: bankAccountLabel[p.bankAccount],
      date: formatCalendarDate(p.paidAt),
    })),
  ];

  // Spent-per-account for the month — expenses only count once their
  // occurrence is actually marked Pago (same "realized" standard every
  // other cash figure in this report uses), teacher/partner payouts are
  // always realized (a Payout row only exists once actually paid).
  const spentByAccount = new Map<string, number>();
  function addSpent(account: string, amount: number) {
    spentByAccount.set(account, (spentByAccount.get(account) ?? 0) + amount);
  }
  for (const e of expenses) {
    if (e.occurrenceStatus === "PAID") addSpent(bankAccountLabel[e.effectiveBankAccount], e.effectiveAmount);
  }
  for (const p of teacherPayoutRows) addSpent(p.bankAccountLabel, p.amount);
  for (const p of partnerPayoutRows) addSpent(p.bankAccountLabel, p.amount);

  const bankAccountTotals: BankAccountTotalRow[] = overview.byBankAccount.map((b) => ({
    label: b.label,
    received: b.received,
    spent: spentByAccount.get(b.label) ?? 0,
  }));

  const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
    new Date(year, month, 1)
  );
  const generatedAt = `${formatCalendarDate(brazilToday())}`;

  const pdfBuffer = await renderToBuffer(
    <FinancialReportDocument
      monthLabel={monthLabel}
      generatedAt={generatedAt}
      summaryColumns={[
        {
          heading: "Realizado",
          rows: [
            { label: "Receita recebida", value: summary.revenueRealized, tone: "green" },
            { label: "Professores", value: summary.teacherPayrollRealizado, tone: "red" },
            { label: "Parceiros — Joe", value: summary.partnerSplit.realizado.joe },
            { label: "Parceiros — Gabriel", value: summary.partnerSplit.realizado.gabriel },
            { label: "Férias (provisão)", value: summary.feriasMonthlyRealizado, tone: "red" },
          ],
        },
        {
          heading: "Previsto (mês)",
          rows: [
            { label: "Receita prevista", value: summary.revenuePrevisto, tone: "green" },
            { label: "Professores", value: summary.teacherPayrollPrevisto, tone: "red" },
            { label: "Parceiros — Joe", value: summary.partnerSplit.previsto.joe },
            { label: "Parceiros — Gabriel", value: summary.partnerSplit.previsto.gabriel },
            { label: "Férias (provisão)", value: summary.feriasMonthlyPrevisto, tone: "red" },
          ],
        },
      ]}
      students={students}
      expenses={expenseRows}
      teacherPayouts={teacherPayoutRows}
      partnerPayouts={partnerPayoutRows}
      bankAccountTotals={bankAccountTotals}
    />
  );

  const filename = `relatorio-financeiro-${year}-${String(month + 1).padStart(2, "0")}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
