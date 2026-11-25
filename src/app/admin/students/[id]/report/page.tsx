import { MonthlyReportViewer } from "@/components/students/monthly-report-viewer";

export default async function AdminStudentReportPage({
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
      backHref={`/admin/students/${id}`}
    />
  );
}
