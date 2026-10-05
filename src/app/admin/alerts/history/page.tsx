import { AlertHistoryView } from "@/components/alerts/alert-history-view";
import { getAlertHistory } from "@/server/queries/alerts";

export default async function AdminAlertHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const { studentId } = await searchParams;
  const history = await getAlertHistory();
  return (
    <AlertHistoryView
      history={history}
      studentsBasePath="/admin/students"
      historyBasePath="/admin/alerts/history"
      filterStudentId={studentId}
    />
  );
}
