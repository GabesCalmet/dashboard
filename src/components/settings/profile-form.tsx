"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "@/server/actions/profile";

export function ProfileForm({ name, phone }: { name: string; phone?: string | null }) {
  const [state, formAction, isPending] = useActionState(updateProfile, undefined);

  useEffect(() => {
    if (state?.success) toast.success(state.success);
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" name="name" defaultValue={name} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="phone">Telefone</Label>
        <Input id="phone" name="phone" defaultValue={phone ?? ""} />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending && <Loader2 className="animate-spin" />}
        Salvar
      </Button>
    </form>
  );
}
