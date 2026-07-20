"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePassword } from "@/server/actions/profile";

export function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(changePassword, undefined);

  useEffect(() => {
    if (state?.success) toast.success(state.success);
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="password">Nova senha</Label>
        <Input id="password" name="password" type="password" minLength={8} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
        <Input id="confirmPassword" name="confirmPassword" type="password" minLength={8} required />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending && <Loader2 className="animate-spin" />}
        Alterar senha
      </Button>
    </form>
  );
}
