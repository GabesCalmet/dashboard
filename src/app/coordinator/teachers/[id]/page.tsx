import { notFound } from "next/navigation";
import { TeacherDetailView } from "@/components/teachers/teacher-detail";
import { getTeacherDetail } from "@/server/queries/teachers";

export default async function CoordinatorTeacherDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const teacher = await getTeacherDetail(id);
  if (!teacher) notFound();

  return (
    <TeacherDetailView
      teacher={teacher}
      basePath="/coordinator/teachers"
      studentsBasePath="/coordinator/students"
      canManage={false}
    />
  );
}
