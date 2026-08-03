import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import { bankAccountLabel } from "@/lib/labels";
import type { BankAccount } from "@prisma/client";

export async function getFinancialOverview() {
  const now = new Date();
  const monthStart = startOfMonth(now);

  const [received, expected, pendingCount, lateCount, activeStudentsAgg, payments] =
    await Promise.all([
      prisma.payment.aggregate({
        where: { referenceMonth: monthStart, status: "PAID" },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { referenceMonth: monthStart },
        _sum: { amount: true },
      }),
      prisma.payment.count({ where: { referenceMonth: monthStart, status: "PENDING" } }),
      prisma.payment.count({ where: { referenceMonth: monthStart, status: "LATE" } }),
      prisma.studentProfile.aggregate({
        where: { status: "ACTIVE" },
        _sum: { monthlyValue: true },
      }),
      prisma.payment.findMany({
        where: { referenceMonth: monthStart },
        include: { student: { include: { user: true } } },
        orderBy: { dueDate: "asc" },
      }),
    ]);

  const expectedTotal = Number(expected._sum.amount ?? activeStudentsAgg._sum.monthlyValue ?? 0);
  const receivedTotal = Number(received._sum.amount ?? 0);
  const delinquencyRate =
    expectedTotal > 0 ? ((expectedTotal - receivedTotal) / expectedTotal) * 100 : 0;

  const byBankAccount = (Object.keys(bankAccountLabel) as BankAccount[]).map((account) => {
    const accountPayments = payments.filter((p) => p.student.bankAccount === account);
    const expectedAcc = accountPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const receivedAcc = accountPayments
      .filter((p) => p.status === "PAID")
      .reduce((sum, p) => sum + Number(p.amount), 0);
    return { account, label: bankAccountLabel[account], expected: expectedAcc, received: receivedAcc };
  });

  const cashFlowBuckets = Array.from({ length: 6 }).map((_, i) => {
    const d = subMonths(now, 5 - i);
    return { start: startOfMonth(d), end: endOfMonth(d), label: format(d, "MMM") };
  });

  const cashFlow = await Promise.all(
    cashFlowBuckets.map(async (b) => {
      const paid = await prisma.payment.aggregate({
        where: { referenceMonth: b.start, status: "PAID" },
        _sum: { amount: true },
      });
      const total = await prisma.payment.aggregate({
        where: { referenceMonth: b.start },
        _sum: { amount: true },
      });
      return {
        month: b.label,
        recebido: Number(paid._sum.amount ?? 0),
        previsto: Number(total._sum.amount ?? 0),
      };
    })
  );

  return {
    monthlyRevenueExpected: expectedTotal,
    monthlyRevenueReceived: receivedTotal,
    pendingCount,
    lateCount,
    delinquencyRate,
    // Prisma's Decimal is a class instance, not a plain object — it can't
    // cross the server/client boundary as a prop, so plain numbers are
    // handed to the (client-side) PaymentsTable instead of raw rows.
    payments: payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      dueDate: p.dueDate,
      status: p.status,
      studentName: p.student.user.name,
      bankAccount: p.student.bankAccount,
    })),
    cashFlow,
    byBankAccount,
  };
}
