import { AttendanceAlertsView } from "@/components/alerts/attendance-alerts-view";
import { getAttendanceAlerts } from "@/server/queries/alerts";

export default async function AdminAlertsPage() {
  const alerts = await getAttendanceAlerts();
  return <AttendanceAlertsView alerts={alerts} studentsBasePath="/admin/students" />;
}
