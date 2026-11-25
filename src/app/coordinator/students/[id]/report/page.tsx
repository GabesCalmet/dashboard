import { MonthlyReportViewer } from "@/components/students/monthly-report-viewer";

export default async function CoordinatorStudentReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const { id } = await params;
  const { year, month } = await searchParams;
  const now = new Date();

  return (
    <MonthlyReportViewer
      studentId={id}
      year={year ? Number(year) : now.getFullYear()}
      month={month ? Number(month) : now.getMonth()}
      backHref={`/coordinator/students/${id}`}
    />
  );
}
