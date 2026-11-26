import { prisma } from "@/lib/prisma";

export async function listAffiliates() {
  // Includes inactive affiliates too (not just active), same as
  // listTeachers — found and reactivated from this same list rather than
  // only via Usuários.
  const affiliates = await prisma.affiliateProfile.findMany({
    include: { user: true, referredStudents: true },
    orderBy: { createdAt: "desc" },
  });
  return affiliates.map((a) => ({
    id: a.id,
    name: a.user.name,
    username: a.user.username,
    email: a.user.email,
    phone: a.user.phone,
    active: a.user.active,
    commissionPercent: a.commissionPercent ? Number(a.commissionPercent) : null,
    notes: a.notes,
    referredStudentsCount: a.referredStudents.length,
  }));
}

export async function listActiveAffiliatesForSelect() {
  const affiliates = await prisma.affiliateProfile.findMany({
    where: { user: { active: true } },
    include: { user: true },
    orderBy: { user: { name: "asc" } },
  });
  return affiliates.map((a) => ({ id: a.id, label: a.user.name }));
}

export async function getAffiliateDetail(affiliateId: string) {
  const affiliate = await prisma.affiliateProfile.findUnique({
    where: { id: affiliateId },
    include: {
      user: true,
      referredStudents: { include: { user: true } },
    },
  });
  if (!affiliate) return null;
  return affiliate;
}
