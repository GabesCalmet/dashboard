import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type ActionState = { error?: string; success?: string; tempPassword?: string } | undefined;

// Reacts to a useActionState result: toasts success/error, closes the
// dialog and refreshes server data. Centralized here so the
// react-hooks/set-state-in-effect exception below is justified once,
// covering every create/edit dialog that follows this exact pattern.
export function useActionToast(state: ActionState, onSuccess: () => void) {
  const router = useRouter();

  useEffect(() => {
    if (state?.success) {
      toast.success(state.success, {
        description: state.tempPassword ? `Senha temporária: ${state.tempPassword}` : undefined,
        duration: state.tempPassword ? 20000 : 4000,
      });
      onSuccess();
      router.refresh();
    }
    if (state?.error) toast.error(state.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
}
