"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { migrateStudentBillingToCharges } from "@/server/actions/student-charges";

// One-time utility: seeds a StudentCharge from every existing student's
// current cadastro billing, so the switch to StudentCharge-driven
// generation doesn't leave anyone without a charge on record. Safe to run
// more than once — see migrateStudentBillingToCharges, which skips any
// student/payer slot that already has a charge.
export function MigrateChargesButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Wand2 /> Migrar cobranças existentes
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Migrar cobranças existentes</AlertDialogTitle>
          <AlertDialogDescription>
            Cria uma cobrança recorrente para cada aluno/participante/terceiro que já tem um
            valor configurado no cadastro, a partir dos valores atuais. Necessário uma vez antes
            da geração automática passar a depender das cobranças em vez do cadastro. Pode ser
            executado mais de uma vez com segurança — nunca duplica uma cobrança já existente, e
            não altera nenhum pagamento já gerado.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={(e) => {
              e.preventDefault();
              startTransition(async () => {
                try {
                  const { chargesCreated, paymentsBackfilled } = await migrateStudentBillingToCharges();
                  toast.success(
                    chargesCreated > 0
                      ? `${chargesCreated} cobrança(s) criada(s), ${paymentsBackfilled} mês(es) gerado(s).`
                      : "Nada para migrar — todas as cobranças já existem."
                  );
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Erro ao migrar cobranças.");
                }
              });
            }}
          >
            {isPending && <Loader2 className="animate-spin" />}
            Confirmar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
