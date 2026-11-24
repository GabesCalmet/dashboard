import { AttendanceAlertsView } from "@/components/alerts/attendance-alerts-view";
import { getAttendanceAlerts } from "@/server/queries/alerts";
import { getTeacherCancellationBreakdown } from "@/server/queries/teachers";
import { brazilToday } from "@/lib/timezone";

export default async function AdminAlertsPage() {
  const now = brazilToday();
  const [alerts, cancellationBreakdown] = await Promise.all([
    getAttendanceAlerts(),
    getTeacherCancellationBreakdown(now.getFullYear(), now.getMonth()),
  ]);
  return (
    <AttendanceAlertsView
      alerts={alerts}
      cancellationBreakdown={cancellationBreakdown}
      studentsBasePath="/admin/students"
      historyBasePath="/admin/alerts/history"
    />
  );
}
