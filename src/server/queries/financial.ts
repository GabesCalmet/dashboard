import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";

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
    payments,
    cashFlow,
  };
}
