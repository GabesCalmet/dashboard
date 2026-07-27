"use client";

import { useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input readOnly value={value} className="font-mono" />
        <Button type="button" variant="outline" size="icon" onClick={copy}>
          {copied ? <Check className="text-success" /> : <Copy />}
        </Button>
      </div>
    </div>
  );
}

export function TempPasswordDialog({
  open,
  onOpenChange,
  email,
  password,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  password: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-4.5 text-accent" />
            Login criado
          </DialogTitle>
          <DialogDescription>
            Copie e envie essas credenciais com segurança — esta senha não
            ficará visível novamente depois de fechar esta janela.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <CopyField label="Email de acesso" value={email} />
          <CopyField label="Senha temporária" value={password} />
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Entendi, já copiei</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
