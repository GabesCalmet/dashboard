import { MonthlyReportViewer } from "@/components/students/monthly-report-viewer";
import { requireRole } from "@/lib/auth";

export default async function StudentHistoryReportPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const user = await requireRole("STUDENT");
  const { year, month } = await searchParams;
  const now = new Date();

  return (
    <MonthlyReportViewer
      studentId={user.studentProfile!.id}
      year={year ? Number(year) : now.getFullYear()}
      month={month ? Number(month) : now.getMonth()}
      backHref="/student/history"
    />
  );
}
