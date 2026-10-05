import { AlertHistoryView } from "@/components/alerts/alert-history-view";
import { getAlertHistory } from "@/server/queries/alerts";

export default async function CoordinatorAlertHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const { studentId } = await searchParams;
  const history = await getAlertHistory();
  return (
    <AlertHistoryView
      history={history}
      studentsBasePath="/coordinator/students"
      historyBasePath="/coordinator/alerts/history"
      filterStudentId={studentId}
    />
  );
}
