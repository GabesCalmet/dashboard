"use client";

import { useActionState } from "react";
import { loginAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [state, formAction, isPending] = useActionState(loginAction, undefined);

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <input type="hidden" name="redirectTo" value={redirectTo ?? ""} />

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="voce@upfront.com"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
        />
      </div>

      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending && <Loader2 className="size-4 animate-spin" />}
        Entrar
      </Button>
    </form>
  );
}
