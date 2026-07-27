import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type ActionState = { error?: string; success?: string; tempPassword?: string } | undefined;

// Reacts to a useActionState result: toasts success/error, closes the
// dialog and refreshes server data. Centralized here so the
// react-hooks/set-state-in-effect exception below is justified once,
// covering every create/edit dialog that follows this exact pattern.
//
// A generated temp password is deliberately NOT put in the toast (toasts
// auto-dismiss and are easy to lose) — if `onPassword` is given, it's
// called instead so the caller can show it in a dialog that stays open
// until manually closed.
export function useActionToast(
  state: ActionState,
  onSuccess: () => void,
  onPassword?: (password: string) => void
) {
  const router = useRouter();

  useEffect(() => {
    if (state?.success) {
      toast.success(state.success);
      if (state.tempPassword && onPassword) {
        onPassword(state.tempPassword);
      }
      onSuccess();
      router.refresh();
    }
    if (state?.error) toast.error(state.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
}
