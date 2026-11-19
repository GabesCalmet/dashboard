"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { toPng } from "html-to-image";
import { Cake, Download, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BirthdayCard, birthdayMessage } from "@/components/alerts/birthday-card";

// Lets an admin/coordinator preview and export the student's birthday
// card — the name shown on the card is editable here (a nickname,
// different casing, etc.) without touching the student's own cadastro.
export function BirthdayCardDialog({ studentName }: { studentName: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(studentName);
  const [isExporting, setIsExporting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  async function downloadCard() {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2 });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `aniversario-${name.trim().toLowerCase().replace(/\s+/g, "-") || "aluno"}.png`;
      a.click();
    } catch {
      toast.error("Erro ao gerar a imagem do cartão.");
    } finally {
      setIsExporting(false);
    }
  }

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(birthdayMessage(name || "there"));
      toast.success("Mensagem copiada.");
    } catch {
      toast.error("Erro ao copiar a mensagem.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Cake /> Ver cartão
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Cartão de aniversário</DialogTitle>
          <DialogDescription>
            Ajuste o nome se quiser (não altera o cadastro do aluno), depois baixe a
            imagem ou copie só o texto da mensagem.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="birthdayCardName">Nome no cartão</Label>
          <Input id="birthdayCardName" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="flex justify-center overflow-auto rounded-lg border bg-muted/30 p-4">
          <div style={{ transform: "scale(0.75)", transformOrigin: "top center" }}>
            <BirthdayCard ref={cardRef} name={name} />
          </div>
        </div>

        <DialogFooter className="sm:justify-start">
          <Button onClick={downloadCard} disabled={isExporting}>
            <Download /> Baixar cartão
          </Button>
          <Button variant="outline" onClick={copyMessage}>
            <Copy /> Copiar mensagem
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
