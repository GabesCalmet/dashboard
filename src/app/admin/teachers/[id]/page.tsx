import { notFound } from "next/navigation";
import { TeacherDetailView } from "@/components/teachers/teacher-detail";
import { getTeacherDetail } from "@/server/queries/teachers";

export default async function AdminTeacherDetailPage({
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
      basePath="/admin/teachers"
      studentsBasePath="/admin/students"
      canManage
    />
  );
}
