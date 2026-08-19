import { AttendanceAlertsView } from "@/components/alerts/attendance-alerts-view";
import { getAttendanceAlerts } from "@/server/queries/alerts";

export default async function CoordinatorAlertsPage() {
  const alerts = await getAttendanceAlerts();
  return <AttendanceAlertsView alerts={alerts} studentsBasePath="/coordinator/students" />;
}
