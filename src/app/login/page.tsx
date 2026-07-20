import { redirect } from "next/navigation";
import { getCurrentUser, roleHome } from "@/lib/auth";
import { LoginForm } from "./login-form";
import { GraduationCap } from "lucide-react";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; reason?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect(roleHome(user.role));

  const params = await searchParams;

  return (
    <div className="flex min-h-screen">
      <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-10 lg:w-[440px] lg:flex-none">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-10 flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="size-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight">
              Upfront Portal
            </span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">Bem-vindo de volta</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Entre com suas credenciais para acessar o portal.
          </p>

          {params.reason === "idle" && (
            <div className="mt-4 rounded-md bg-warning/15 px-3 py-2 text-sm text-warning-foreground">
              Sua sessão expirou por inatividade. Faça login novamente.
            </div>
          )}

          <LoginForm redirectTo={params.redirectTo} />

          <p className="mt-8 text-xs text-muted-foreground">
            Acesso restrito. Problemas para entrar? Contate a coordenação da
            Upfront English School.
          </p>
        </div>
      </div>

      <div className="relative hidden flex-1 items-center justify-center overflow-hidden bg-primary lg:flex">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, oklch(0.62 0.15 155 / 0.35), transparent 40%), radial-gradient(circle at 80% 70%, oklch(0.62 0.15 155 / 0.25), transparent 45%)",
          }}
        />
        <div className="relative z-10 max-w-md px-10 text-primary-foreground">
          <h2 className="text-3xl font-semibold tracking-tight">
            Gestão completa da sua escola de inglês online.
          </h2>
          <p className="mt-4 text-primary-foreground/70">
            Alunos, professores, agenda, financeiro e relatórios em um único
            painel moderno e seguro.
          </p>
        </div>
      </div>
    </div>
  );
}
