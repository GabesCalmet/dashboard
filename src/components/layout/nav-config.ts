import type { Role } from "@prisma/client";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CalendarDays,
  Wallet,
  FileBarChart,
  ShieldCheck,
  Settings,
  BookOpenCheck,
  LineChart,
  History,
  Library,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const navByRole: Record<Role, NavItem[]> = {
  ADMIN: [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Alunos", href: "/admin/students", icon: GraduationCap },
    { label: "Professores", href: "/admin/teachers", icon: Users },
    { label: "Agenda", href: "/admin/agenda", icon: CalendarDays },
    { label: "Financeiro", href: "/admin/financial", icon: Wallet },
    { label: "Cursos & Planos", href: "/admin/catalog", icon: Library },
    { label: "Relatórios", href: "/admin/reports", icon: FileBarChart },
    { label: "Usuários & Permissões", href: "/admin/users", icon: ShieldCheck },
    { label: "Configurações", href: "/admin/settings", icon: Settings },
  ],
  COORDINATOR: [
    { label: "Dashboard", href: "/coordinator", icon: LayoutDashboard },
    { label: "Alunos", href: "/coordinator/students", icon: GraduationCap },
    { label: "Professores", href: "/coordinator/teachers", icon: Users },
    { label: "Agenda", href: "/coordinator/agenda", icon: CalendarDays },
    { label: "Relatórios", href: "/coordinator/reports", icon: FileBarChart },
    { label: "Configurações", href: "/coordinator/settings", icon: Settings },
  ],
  TEACHER: [
    { label: "Dashboard", href: "/teacher", icon: LayoutDashboard },
    { label: "Meus Alunos", href: "/teacher/students", icon: GraduationCap },
    { label: "Agenda", href: "/teacher/agenda", icon: CalendarDays },
    { label: "Relatórios", href: "/teacher/reports", icon: FileBarChart },
    { label: "Configurações", href: "/teacher/settings", icon: Settings },
  ],
  STUDENT: [
    { label: "Dashboard", href: "/student", icon: LayoutDashboard },
    { label: "Meu Progresso", href: "/student/progress", icon: LineChart },
    { label: "Histórico de Aulas", href: "/student/history", icon: History },
    { label: "Materiais", href: "/student/materials", icon: BookOpenCheck },
    { label: "Configurações", href: "/student/settings", icon: Settings },
  ],
};

export const roleLabel: Record<Role, string> = {
  ADMIN: "Administrador",
  COORDINATOR: "Coordenador",
  TEACHER: "Professor",
  STUDENT: "Aluno",
};
