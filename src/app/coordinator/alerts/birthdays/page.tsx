import { BirthdayAlertsView } from "@/components/alerts/birthday-alerts-view";
import { getBirthdayAlerts } from "@/server/queries/alerts";

export default async function CoordinatorBirthdayAlertsPage() {
  const alerts = await getBirthdayAlerts();
  return <BirthdayAlertsView alerts={alerts} studentsBasePath="/coordinator/students" />;
}
